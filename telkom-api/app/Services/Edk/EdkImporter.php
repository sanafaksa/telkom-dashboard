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

    /** Baca + normalisasi + validasi semua baris (all-or-nothing). */
    private function parse(string $path): array
    {
        /** @var Collection $sheet */
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
            $line = $i + 2;                       // data mulai baris 2
            $r    = $this->normalize($raw->toArray());
            $msgs = $this->validateRow($r);

            if (!$msgs && isset($seen[$r['row_key']])) {
                $msgs[] = "Duplikat dengan baris {$seen[$r['row_key']]} (kunci {$r['row_key']}).";
            }
            $seen[$r['row_key']] ??= $line;

            if ($msgs) {
                $errors[] = ['row' => $line, 'messages' => $msgs];
                continue;
            }

            $r['order_qty'] = (int) $r['order_qty'];
            $r['abonemen']  = round((float) $r['abonemen'], 2);
            $rows[] = $r;
        }

        if ($errors) throw new EdkImportException($errors);
        if (!$rows)  throw new EdkImportException([['row' => 2, 'messages' => ['File tidak berisi data.']]]);

        return $rows;
    }

     private function readSheet(string $path): Collection
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $ws = $reader->load(Storage::path($path))->getSheet(0);

        // nullValue, calculateFormulas, formatData=false (nilai mentah), returnCellRef=false
        $data = $ws->toArray(null, true, false, false);

        $headers = array_map(
            fn ($h) => strtolower(preg_replace('/\s+/', '_', trim((string) $h))),   // "NAMA PELANGGAN" → nama_pelanggan
            array_shift($data) ?? []
        );
        $n = count($headers);

        return collect($data)
            ->reject(fn ($row) => !array_filter($row, fn ($v) => $v !== null && trim((string) $v) !== ''))  // skip baris kosong
            ->map(fn ($row) => collect(array_combine(
                $headers,
                array_pad(array_slice($row, 0, $n), $n, null)
            )));
        // index 0 = baris Excel 2 → di parse() dipakai $i + 2
    }

    private function normalize(array $raw): array
    {
        $s  = fn (string $k) => trim((string) ($raw[$k] ?? ''));
        $up = fn (string $k) => strtoupper(preg_replace('/\s+/', '_', $s($k)));   // "tidak lanjut" → TIDAK_LANJUT

        // Excel sering baca 202611 sebagai angka/float
        $periode = $raw['periode_edk'] ?? '';
        $periode = is_numeric($periode) ? (string) (int) $periode : trim((string) $periode);

        $sid     = $s('sid');
        $noOrder = $s('no_order') ?: null;

        return [
            'row_key'        => $noOrder ?: "{$sid}|{$periode}",
            'sid'            => $sid,
            'no_order'       => $noOrder,
            'nama_pelanggan' => $s('nama_pelanggan'),
            'nama_am'        => $s('nama_am'),
            'nama_cc'        => $s('nama_cc') ?: null,
            'segmen'         => $up('segmen'),
            'witel'          => strtoupper($s('witel')) ?: 'SOLO JT',
            'periode_edk'    => $periode,
            'status_utama'   => $up('status_utama'),
            'status_detail'  => $up('status_detail'),
            'order_qty'      => $raw['order'] ?? null,
            'abonemen'       => $raw['abonemen'] ?? null,
        ];
    }

    private function validateRow(array $r): array
    {
        $v = Validator::make($r, [
            'row_key'        => 'max:80',
            'sid'            => 'required|max:50',
            'no_order'       => 'nullable|max:50',
            'nama_pelanggan' => 'required|max:255',
            'nama_am'        => 'required|max:255',
            'nama_cc'        => 'nullable|max:255',
            'segmen'         => ['required', Rule::in(self::SEGMEN)],
            'witel'          => 'max:30',
            'periode_edk'    => ['required', 'regex:/^\d{4}(0[1-9]|1[0-2])$/'],
            'status_utama'   => ['required', Rule::in(array_keys(self::STATUS))],
            'status_detail'  => 'required',
            'order_qty'      => 'required|integer|min:0',
            'abonemen'       => 'required|numeric',            // boleh negatif
        ], [
            'required'          => ':attribute wajib diisi.',
            'in'                => ':attribute tidak valid (":input").',
            'periode_edk.regex' => 'PERIODE_EDK harus 6 digit YYYYMM.',
            'integer'           => ':attribute harus bilangan bulat.',
            'numeric'           => ':attribute harus angka.',
        ], [
            'order_qty' => 'ORDER', 'abonemen' => 'ABONEMEN', 'segmen' => 'SEGMEN',
            'status_utama' => 'STATUS_UTAMA', 'status_detail' => 'STATUS_DETAIL',
            'sid' => 'SID', 'nama_pelanggan' => 'NAMA_PELANGGAN', 'nama_am' => 'NAMA_AM',
        ]);

        $msgs = $v->errors()->all();

        $allowed = self::STATUS[$r['status_utama']] ?? null;
        if ($allowed && $r['status_detail'] !== '' && !in_array($r['status_detail'], $allowed, true)) {
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
