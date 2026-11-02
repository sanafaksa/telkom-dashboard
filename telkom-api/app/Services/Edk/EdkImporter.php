<?php

namespace App\Services\Edk;

use App\Exceptions\EdkImportException;
use App\Models\EdkRecord;
use App\Models\EdkUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;

class EdkImporter
{
    public const SEGMEN = ['DGS', 'DPS', 'DSS', 'RBS'];

    public const STATUS = [
        'LANJUT'        => ['COMPLETE', 'IN_PROGRESS'],
        'TIDAK_LANJUT'  => ['COMPLETE', 'IN_PROGRESS'],
        'KONFIRMASI_AM' => ['AUTO_RENEWAL', 'IN_PROGRESS'],
    ];

    private const STATUS_DETAIL = ['COMPLETE', 'IN_PROGRESS', 'AUTO_RENEWAL'];

    /** Header wajib ADA di baris 1 (isi selnya boleh kosong). */
    private const REQUIRED_HEADERS = [
        'sid', 'nama_pelanggan', 'nama_am', 'segmen', 'periode_edk',
        'status_utama', 'status_detail', 'order', 'abonemen',
    ];

    public function import(UploadedFile $file, string $reportDate, ?int $userId): EdkUpload
    {
        $upload = EdkUpload::create([
            'report_date'   => $reportDate,
            'original_name' => $file->getClientOriginalName(),
            'file_path'     => $file->store('edk-uploads'),
            'status'        => 'processing',
            'uploaded_by'   => $userId,
        ]);

        try {
            $rows = $this->parse($upload->file_path);

            DB::transaction(function () use ($upload, $rows) {
                $prevMap = $this->previousMap($upload);

                foreach (array_chunk($rows, 500) as $chunk) {
                    EdkRecord::insert(array_map(fn ($r) => $r + [
                        'edk_upload_id' => $upload->id,
                        'flag'          => $this->flag($r, $prevMap->get($r['row_key'])),
                    ], $chunk));
                }

                EdkUpload::where('is_active', true)->update(['is_active' => false]);
                $upload->update(['status' => 'done', 'is_active' => true, 'total_rows' => count($rows)]);
            });
        } catch (EdkImportException $e) {
            $upload->update(['status' => 'failed', 'errors' => $e->errors]);
            throw $e;
        } catch (Throwable $e) {
            $upload->update(['status' => 'failed', 'errors' => [['row' => 0, 'messages' => [$e->getMessage()]]]]);
            throw $e;
        }

        return $upload->fresh();
    }

    /** Baca + normalisasi + validasi format semua baris (all-or-nothing). */
    private function parse(string $path): array
    {
        $sheet = $this->readSheet($path);

        $headers = array_keys($sheet->first()?->toArray() ?? []);
        if ($missing = array_diff(self::REQUIRED_HEADERS, $headers)) {
            throw new EdkImportException([[
                'row' => 1,
                'messages' => ['Kolom wajib tidak ada: ' . strtoupper(implode(', ', $missing))],
            ]]);
        }

        $rows = $errors = $seen = [];

        foreach ($sheet as $i => $raw) {
            $line = $i + 2;                                   // data mulai baris 2
            $r    = $this->normalize($raw->toArray(), $line);

            if ($msgs = $this->validateRow($r)) {
                $errors[] = ['row' => $line, 'messages' => $msgs];
                continue;
            }

            // Kunci dobel tidak ditolak: beri akhiran #2, #3, ... supaya tetap unik
            $base = $r['row_key'];
            $key  = $base;
            for ($n = 2; isset($seen[$key]); $n++) {
                $key = "{$base}#{$n}";
            }
            $seen[$key]   = true;
            $r['row_key'] = $key;

            $r['order_qty'] = $r['order_qty'] === null ? 1 : (int) $r['order_qty'];   // kosong → 1 order
            $r['abonemen']  = $r['abonemen'] === null ? 0 : round((float) $r['abonemen'], 2);
            $rows[] = $r;
        }

        if ($errors) throw new EdkImportException($errors);
        if (!$rows)  throw new EdkImportException([['row' => 2, 'messages' => ['File tidak berisi data.']]]);

        return $rows;
    }

    /** Baca sheet pertama → Collection<int, Collection> dengan key header snake_case. */
    private function readSheet(string $path): Collection
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $ws = $reader->load(Storage::path($path))->getSheet(0);

        $data = $ws->toArray(null, true, false, false);

        $headers = array_map(
            fn ($h) => strtolower(preg_replace('/\s+/', '_', trim((string) $h))),
            array_shift($data) ?? []
        );
        $n = count($headers);

        return collect($data)
            ->reject(fn ($row) => !array_filter($row, fn ($v) => $v !== null && trim((string) $v) !== ''))
            ->map(fn ($row) => collect(array_combine(
                $headers,
                array_pad(array_slice($row, 0, $n), $n, null)
            )));
    }

    private function normalize(array $raw, int $line): array
    {
        $text = function (string $k) use ($raw): ?string {
            $v = trim((string) ($raw[$k] ?? ''));
            return $v === '' ? null : $v;
        };
        $code = function (string $k) use ($text): ?string {
            $v = $text($k);
            return $v === null ? null : strtoupper(preg_replace('/\s+/', '_', $v));   // "tidak lanjut" → TIDAK_LANJUT
        };
        $number = function (string $k) use ($raw) {
            $v = $raw[$k] ?? null;
            return ($v === null || trim((string) $v) === '') ? null : $v;
        };

        // Excel sering baca 202611 sebagai angka/float
        $periode = $raw['periode_edk'] ?? null;
        $periode = is_numeric($periode) ? (string) (int) $periode : $text('periode_edk');

        $sid     = $text('sid');
        $noOrder = $text('no_order');
        $witel   = $text('witel');

        return [
            'row_key'        => $noOrder ?? ($sid !== null ? "{$sid}|{$periode}" : "ROW{$line}"),
            'sid'            => $sid,
            'no_order'       => $noOrder,
            'nama_pelanggan' => $text('nama_pelanggan'),
            'nama_am'        => $text('nama_am'),
            'nama_cc'        => $text('nama_cc'),
            'segmen'         => $code('segmen'),
            'witel'          => $witel === null ? 'SOLO JT' : strtoupper($witel),
            'periode_edk'    => $periode,
            'status_utama'   => $code('status_utama'),
            'status_detail'  => $code('status_detail'),
            'order_qty'      => $number('order'),
            'abonemen'       => $number('abonemen'),
        ];
    }

    /** Semua kolom opsional; yang dicek hanya FORMAT nilai yang terisi. */
    private function validateRow(array $r): array
    {
        $v = Validator::make($r, [
            'row_key'        => 'max:80',
            'sid'            => 'nullable|max:50',
            'no_order'       => 'nullable|max:50',
            'nama_pelanggan' => 'nullable|max:255',
            'nama_am'        => 'nullable|max:255',
            'nama_cc'        => 'nullable|max:255',
            'segmen'         => ['nullable', Rule::in(self::SEGMEN)],
            'witel'          => 'max:30',
            'periode_edk'    => ['nullable', 'regex:/^\d{4}(0[1-9]|1[0-2])$/'],
            'status_utama'   => ['nullable', Rule::in(array_keys(self::STATUS))],
            'status_detail'  => ['nullable', Rule::in(self::STATUS_DETAIL)],
            'order_qty'      => 'nullable|integer|min:0',
            'abonemen'       => 'nullable|numeric',            // boleh negatif
        ], [
            'in'                => ':attribute tidak valid (":input").',
            'periode_edk.regex' => 'PERIODE_EDK harus 6 digit YYYYMM.',
            'integer'           => ':attribute harus bilangan bulat.',
            'numeric'           => ':attribute harus angka.',
            'min'               => ':attribute tidak boleh negatif.',
            'max'               => ':attribute terlalu panjang (maks :max karakter).',
        ], [
            'order_qty' => 'ORDER', 'abonemen' => 'ABONEMEN', 'segmen' => 'SEGMEN',
            'status_utama' => 'STATUS_UTAMA', 'status_detail' => 'STATUS_DETAIL',
            'sid' => 'SID', 'no_order' => 'NO_ORDER', 'nama_pelanggan' => 'NAMA_PELANGGAN',
            'nama_am' => 'NAMA_AM', 'nama_cc' => 'NAMA_CC', 'periode_edk' => 'PERIODE_EDK',
            'witel' => 'WITEL', 'row_key' => 'Kunci baris',
        ]);

        $msgs = $v->errors()->all();

        // Kombinasi hanya dicek kalau dua-duanya terisi dan valid
        $allowed = self::STATUS[$r['status_utama']] ?? null;
        if ($allowed && $r['status_detail'] !== null
            && in_array($r['status_detail'], self::STATUS_DETAIL, true)
            && !in_array($r['status_detail'], $allowed, true)) {
            $msgs[] = "STATUS_DETAIL {$r['status_detail']} tidak valid untuk {$r['status_utama']} (pilihan: "
                . implode('/', $allowed) . ').';
        }

        return $msgs;
    }

    private function previousMap(EdkUpload $upload): Collection
    {
        $prev = EdkUpload::previousOf($upload);

        return $prev
            ? $prev->records()->toBase()
                ->get(['row_key', 'status_utama', 'status_detail', 'order_qty', 'abonemen'])
                ->keyBy('row_key')
            : collect();
    }

    private function flag(array $r, ?object $p): string
    {
        if (!$p) return 'NEW';

        $changed = $p->status_utama  !== $r['status_utama']
            || $p->status_detail     !== $r['status_detail']
            || (int) $p->order_qty   !== $r['order_qty']
            || number_format((float) $p->abonemen, 2, '.', '') !== number_format($r['abonemen'], 2, '.', '');

        return $changed ? 'UPDATED' : 'UNCHANGED';
    }
}
