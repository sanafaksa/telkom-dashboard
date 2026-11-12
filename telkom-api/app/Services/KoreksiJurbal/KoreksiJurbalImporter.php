<?php

namespace App\Services\KoreksiJurbal;

use App\Exceptions\KoreksiJurbalImportException;
use App\Jobs\ImportKoreksiJurbalUpload;
use App\Models\KoreksiJurbalEntry;
use App\Models\KoreksiJurbalUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Import Excel Koreksi & Jurbal PSAK.
 *
 * 1. queue():   saat request upload: cek duplikat + file .xlsx valid, simpan file, kirim job.
 * 2. process(): di job queue: kenali jenis file (DGS/DPS/RBS) dari header, baca sheet
 *               secara streaming, ambil hanya baris koreksi/jurbal Witel yang dipantau,
 *               simpan dalam SATU transaction (satu baris rusak → seluruh upload batal).
 */
class KoreksiJurbalImporter
{
    private const MAX_ERRORS = 200;

    private array $cfg;
    private array $witel;

    public function __construct()
    {
        $this->cfg   = config('koreksi_jurbal');
        $this->witel = array_flip(array_map([$this, 'norm'], $this->cfg['witel']));
    }

    /** Terima file, validasi cepat, lalu jadwalkan import di queue. */
    public function queue(UploadedFile $file, ?int $userId): KoreksiJurbalUpload
    {
        $fileHash = hash_file('sha256', $file->getRealPath());

        // 'processing' terlalu lama tanpa progres = worker mati di tengah jalan → anggap gagal
        KoreksiJurbalUpload::where('status', 'processing')
            ->where('updated_at', '<', now()->subMinutes($this->cfg['stale_minutes']))
            ->update(['status' => 'failed', 'errors' => json_encode([['row' => 0, 'messages' => ['Proses import terhenti.']]])]);

        if (KoreksiJurbalUpload::where('file_hash', $fileHash)->whereIn('status', ['processing', 'done'])->exists()) {
            throw $this->fail(0, 'File yang sama sudah pernah diunggah dan tidak diproses ulang.');
        }

        try {
            new XlsxStreamReader($file->getRealPath());     // hanya baca daftar sheet
        } catch (RuntimeException $e) {
            throw $this->fail(0, $e->getMessage());
        }

        // Upload gagal sebelumnya dengan file sama: lepaskan hash-nya (riwayat tetap ada)
        KoreksiJurbalUpload::where('file_hash', $fileHash)->where('status', 'failed')->update(['file_hash' => null]);

        $upload = KoreksiJurbalUpload::create([
            'original_name' => $file->getClientOriginalName(),
            'file_hash'     => $fileHash,
            'file_path'     => $file->store('koreksi-jurbal-uploads'),
            'status'        => 'processing',
            'uploaded_by'   => $userId,
        ]);

        ImportKoreksiJurbalUpload::dispatch($upload->id);

        return $upload;
    }

    /** Dijalankan oleh job. Status akhir: done / failed (+ errors). */
    public function process(KoreksiJurbalUpload $upload): void
    {
        try {
            $reader = new XlsxStreamReader(Storage::path($upload->file_path));
            [$segmen, $sheets] = $this->detect($reader);

            $upload->update([
                'segmen'      => $segmen,
                'sheet_names' => implode(', ', array_column($sheets, 'sheet')),
            ]);

            $stats = DB::transaction(fn () => $this->importRows($upload, $reader, $segmen, $sheets));

            $upload->update([
                'status'       => 'done',
                'periode'      => $stats['periode'],
                'scanned_rows' => $stats['scanned'],
                'total_rows'   => $stats['total'],
                'errors'       => null,
            ]);
        } catch (KoreksiJurbalImportException $e) {
            $upload->update(['status' => 'failed', 'errors' => $e->errors]);
        } catch (Throwable $e) {
            $upload->update(['status' => 'failed', 'errors' => [['row' => 0, 'messages' => [$e->getMessage()]]]]);
            report($e);
        }
    }

    /**
     * Cari sheet yang header-nya cocok dengan salah satu format.
     * Return [segmen, [['sheet', 'header_row', 'cols' => [key => huruf kolom]], ...]].
     */
    private function detect(XlsxStreamReader $reader): array
    {
        $scan    = (int) $this->cfg['header_scan_rows'];
        $closest = null;                                      // untuk pesan error yang membantu

        // Sheet biasa dulu. Cache pivot ("Pivot cache N") hanya dipakai jika tidak ada sheet
        // yang cocok, karena cache pivot file lain berisi salinan data yang sama (bisa dobel).
        $names  = $reader->sheetNames();
        $passes = [
            array_values(array_filter($names, fn ($s) => !str_starts_with($s, 'Pivot cache '))),
            array_values(array_filter($names, fn ($s) => str_starts_with($s, 'Pivot cache '))),
        ];

        foreach ($passes as $sheets) {
            $found = [];
            foreach ($sheets as $sheet) {
                $rows = [];
                foreach ($reader->rows($sheet) as $n => $cells) {
                    if ($n > $scan) break;
                    $rows[$n] = array_map(fn ($v) => $this->norm((string) $v), $cells);
                }

                $best = null;                                 // format paling spesifik untuk sheet ini
                foreach ($this->cfg['formats'] as $segmen => $fmt) {
                    $want = array_map([$this, 'norm'], $fmt['headers'] + ($fmt['optional'] ?? []));
                    foreach ($rows as $n => $cells) {
                        $cols = [];
                        foreach ($cells as $col => $text) {
                            $key = array_search($text, $want, true);
                            if ($key !== false && !isset($cols[$key])) $cols[$key] = $col;
                        }
                        $missing = array_diff_key($fmt['headers'], $cols);
                        if (!$missing) {
                            if (!$best || count($fmt['headers']) > $best['size']) {
                                $best = ['segmen' => $segmen, 'size' => count($fmt['headers']),
                                    'match' => ['sheet' => $sheet, 'header_row' => $n, 'cols' => $cols]];
                            }
                            break;
                        }
                        $hit = count($fmt['headers']) - count($missing);
                        if ($hit >= 2 && (!$closest || $hit > $closest['hit'])) {
                            $closest = ['hit' => $hit, 'segmen' => $segmen, 'sheet' => $sheet, 'missing' => $missing];
                        }
                    }
                }
                if ($best) $found[$best['segmen']][] = $best['match'];
            }
            if ($found) break;
        }

        if (count($found) > 1) {
            throw $this->fail(0, 'File cocok dengan lebih dari satu format (' . implode(', ', array_keys($found)) . '). Upload satu file per segmen.');
        }
        if (!$found) {
            $hint = $closest
                ? " Paling mirip format {$closest['segmen']} (sheet \"{$closest['sheet']}\"), tapi kolom tidak ada: " . implode(', ', $closest['missing']) . '.'
                : '';
            $names = implode(', ', array_column($this->cfg['formats'], 'label'));
            throw $this->fail(0, "Format file tidak dikenali. Format yang didukung: {$names}.{$hint}");
        }

        return [array_key_first($found), reset($found)];
    }

    /** Satu kali baca setiap sheet, simpan baris koreksi/jurbal. */
    private function importRows(KoreksiJurbalUpload $upload, XlsxStreamReader $reader, string $segmen, array $sheets): array
    {
        $chunk   = max(100, (int) $this->cfg['chunk_rows']);
        $errors  = [];
        $buffer  = [];
        $total   = $scanned = 0;
        $periode = null;

        foreach ($sheets as $s) {
            foreach ($reader->rows($s['sheet'], array_values($s['cols'])) as $rowNum => $cells) {
                if ($rowNum <= $s['header_row']) continue;

                $raw = [];
                foreach ($s['cols'] as $key => $col) {
                    $v = $cells[$col] ?? null;
                    $raw[$key] = is_string($v) ? trim($v) : $v;
                }
                if (!array_filter($raw, fn ($v) => $v !== null && $v !== '')) continue;   // baris kosong
                $scanned++;

                [$entry, $msgs] = $this->mapRow($segmen, $raw);
                if ($msgs) {
                    if (count($errors) < self::MAX_ERRORS) {
                        $errors[] = ['row' => $rowNum, 'sheet' => $s['sheet'], 'messages' => $msgs];
                    }
                    continue;
                }
                if (!$entry || $errors) continue;              // bukan baris koreksi/jurbal, atau sudah pasti gagal

                $periode  = max($periode ?? 0, $entry['periode']);
                $buffer[] = $entry + [
                    'koreksi_jurbal_upload_id' => $upload->id,
                    'sheet'                    => mb_substr($s['sheet'], 0, 100),
                    'row_number'               => $rowNum,
                    'segmen'                   => $segmen,
                    'witel'                    => $this->cfg['witel_label'],
                ];

                if (count($buffer) >= $chunk) {
                    KoreksiJurbalEntry::insert($buffer);
                    $total += count($buffer);
                    $buffer = [];
                }
            }
            $upload->touch();                                 // tanda proses masih hidup
        }

        if ($errors) throw new KoreksiJurbalImportException($errors);   // rollback transaction

        if ($buffer) {
            KoreksiJurbalEntry::insert($buffer);
            $total += count($buffer);
        }
        if (!$total) {
            throw $this->fail(0, "Tidak ada baris koreksi/jurbal Witel {$this->cfg['witel_label']} di file ini.");
        }

        return ['total' => $total, 'scanned' => $scanned, 'periode' => $periode];
    }

    /**
     * Baris Excel → entry, atau null jika bukan koreksi/jurbal Witel yang dipantau.
     * Return [entry|null, pesan error[]].
     */
    private function mapRow(string $segmen, array $r): array
    {
        // File SME menulis "Telkom SOLO JATENG TIMUR": awalan "Telkom" diabaikan
        $witel = preg_replace('/^TELKOM\s+/', '', $this->norm((string) ($r['witel'] ?? '')));
        if (!isset($this->witel[$witel])) {
            return [null, []];
        }

        $desc   = (string) ($r['desc'] ?? '');
        $source = (string) ($r['source'] ?? '');
        if ($segmen === 'DPS' && $desc === '') $desc = (string) ($r['desc_alt'] ?? '');

        $kategori = match ($segmen) {
            // DESC2 "JURBAL KOREKSI ..." = jurbal (reverse), "KOREKSI ..." = koreksi
            'DGS' => str_starts_with($this->norm($desc), 'JURBAL') ? 'reverse'
                : (str_starts_with($this->norm($desc), 'KOREKSI') ? 'correction' : null),
            // SOURCE_DATA "JURBAL KOREKSI IFRS FA" / "ADJ KOREKSI IFRS FA"
            'DPS' => str_starts_with($this->norm($source), 'JURBAL KOREKSI') ? 'reverse'
                : (str_starts_with($this->norm($source), 'ADJ KOREKSI') ? 'correction' : null),
            // DESC2 berisi jenis koreksi; yang mengandung "Reverse" = jurbal
            'RBS' => $this->tipe($desc) === null ? null
                : (preg_match('/reverse/i', $desc) ? 'reverse' : 'correction'),
            // REV_SUBTYPE "ADJUSTMENT - PSAK"; DESC2 "... as of Qn YYYY":
            // kuartal sama dengan kuartal baris = koreksi, kuartal sebelumnya = jurbal
            'DSS' => $this->dssKategori($r, $desc),
        };
        if ($kategori === null) return [null, []];

        $msgs = [];

        $periode = in_array($segmen, ['DGS', 'DSS'], true)
            ? (is_numeric($r['year'] ?? null) && is_numeric($r['month'] ?? null) ? (int) $r['year'] * 100 + (int) $r['month'] : null)
            : (is_numeric($r['periode'] ?? null) ? (int) $r['periode'] : null);
        if ($periode === null || $periode < 200001 || $periode > 210012 || $periode % 100 < 1 || $periode % 100 > 12) {
            $msgs[] = 'Periode tidak valid: ' . (isset($r['year']) ? "{$r['year']}/{$r['month']}" : ($r['periode'] ?? '(kosong)'));
        }

        $amount = $r['amount'] ?? null;
        if ($amount === null || $amount === '') {
            $amount = 0;
        } elseif (!is_numeric($amount)) {
            $msgs[] = "Nilai bukan angka: {$amount}";
        }

        if ($msgs) return [null, $msgs];

        $flag = $this->norm((string) ($r['tipe'] ?? ''));
        $tipe = $this->cfg['tipe_flag'][$flag] ?? $this->tipe($desc);

        return [[
            'periode'     => $periode,
            'kategori'    => $kategori,
            'tipe_psak'   => $tipe,
            'source_data' => $source === '' ? null : mb_substr($source, 0, 100),
            'deskripsi'   => $desc === '' ? null : mb_substr($desc, 0, 255),
            'amount'      => round((float) $amount, 6),
        ], []];
    }

    private function dssKategori(array $r, string $desc): ?string
    {
        if ($this->norm((string) ($r['subtype'] ?? '')) !== $this->norm($this->cfg['dss_subtype'])) return null;
        if (!preg_match('/as of Q([1-4])\s*(\d{4})/i', $desc, $m)) return null;
        if (!is_numeric($r['year'] ?? null) || !is_numeric($r['month'] ?? null)) return 'correction';   // divalidasi di periode

        $rowQ  = (int) $r['year'] * 4 + intdiv((int) $r['month'] - 1, 3);
        $descQ = (int) $m[2] * 4 + ((int) $m[1] - 1);

        return $descQ === $rowQ ? 'correction' : ($descQ < $rowQ ? 'reverse' : null);
    }

    private function tipe(string $desc): ?string
    {
        foreach ($this->cfg['tipe_patterns'] as $tipe => $re) {
            if (preg_match($re, $desc)) return $tipe;
        }
        return null;
    }

    private function norm(string $s): string
    {
        return strtoupper(preg_replace('/\s+/', ' ', trim($s)));
    }

    private function fail(int $row, string $message): KoreksiJurbalImportException
    {
        return new KoreksiJurbalImportException([['row' => $row, 'messages' => [$message]]]);
    }
}
