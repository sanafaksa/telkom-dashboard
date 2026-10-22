<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\PreviewEdkImport;
use App\Models\EdkMonthlyUpload;
use App\Models\EdkMonthlySummary;
use Illuminate\Support\Facades\DB;

class EdkImportController extends Controller
{
    public function preview(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => [
                'required',
                'file',
                'mimes:xlsx,xls',
                'max:20480',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'File tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $import = new PreviewEdkImport();

            Excel::import(
                $import,
                $request->file('file')
            );

            $rows = $import->rows;

            if (count($rows) < 2) {
                return response()->json([
                    'message' => 'Excel kosong atau tidak memiliki data.',
                ], 422);
            }

            $headers = array_map(
                fn ($header) => trim((string) $header),
                $rows[0]
            );


$requiredHeaders = [
    'SEGMENT',
    'LANJUT_COMPLETE_ORDER',
    'LANJUT_COMPLETE_ABONEMEN_RP',
    'LANJUT_IN_PROGRESS_ORDER',
    'LANJUT_IN_PROGRESS_ABONEMEN_RP',
    'TIDAK_LANJUT_COMPLETE_ORDER',
    'TIDAK_LANJUT_COMPLETE_ABONEMEN_RP',
    'TIDAK_LANJUT_IN_PROGRESS_ORDER',
    'TIDAK_LANJUT_IN_PROGRESS_ABONEMEN_RP',
    'KONFIRMASI_AM_ORDER',
    'KONFIRMASI_AM_ABONEMEN_RP',
    'KONFIRMASI_AM_AUTO_RENEWAL',
    'KONFIRMASI_AM_IN_PROGRESS',
    'BUKAN_WITEL_SOLO_JT_ORDER',
    'BUKAN_WITEL_SOLO_JT_ABONEMEN_RP',
    'TOTAL_ORDER',
];

$missingHeaders = array_diff($requiredHeaders, $headers);

if (!empty($missingHeaders)) {
    return response()->json([
        'message' => 'Format Excel tidak sesuai template.',
        'missing_headers' => array_values($missingHeaders),
    ], 422);
}


$allowedSegments = ['DGS', 'DPS', 'DSS', 'RBS'];

$numericHeaders = array_diff($requiredHeaders, ['SEGMENT']);

$seenSegments = [];
$validationErrors = [];

$calculatedTotals = [];

foreach (array_slice($rows, 1) as $index => $row) {
    $rowNumber = $index + 2;

    // Lewati baris yang benar-benar kosong.
    if (count(array_filter(
        $row,
        fn ($value) => $value !== null && trim((string) $value) !== ''
    )) === 0) {
        continue;
    }

    $record = array_combine(
        $headers,
        array_pad(
            array_slice($row, 0, count($headers)),
            count($headers),
            null
        )
    );

    $segment = strtoupper(trim((string) ($record['SEGMENT'] ?? '')));

    if (!in_array($segment, $allowedSegments, true)) {
        $validationErrors[] = "Baris {$rowNumber}: SEGMENT tidak valid.";
        continue;
    }

    if (isset($seenSegments[$segment])) {
        $validationErrors[] = "Baris {$rowNumber}: SEGMENT {$segment} duplikat.";
    }

    $seenSegments[$segment] = true;

    foreach ($numericHeaders as $header) {
        $value = $record[$header] ?? null;

        if (
            $value === null ||
            trim((string) $value) === '' ||
            !is_numeric($value) ||
            (float) $value < 0
        ) {
            $validationErrors[] =
                "Baris {$rowNumber}: {$header} harus berupa angka nonnegatif.";
        }
    }

    $calculatedTotalOrder =
        (int)($record['LANJUT_COMPLETE_ORDER'] ?? 0) +
        (int)($record['LANJUT_IN_PROGRESS_ORDER'] ?? 0) +
        (int)($record['TIDAK_LANJUT_COMPLETE_ORDER'] ?? 0) +
        (int)($record['TIDAK_LANJUT_IN_PROGRESS_ORDER'] ?? 0) +
        (int)($record['KONFIRMASI_AM_ORDER'] ?? 0) +
        (int)($record['KONFIRMASI_AM_AUTO_RENEWAL'] ?? 0) +
        (int)($record['KONFIRMASI_AM_IN_PROGRESS'] ?? 0) +
        (int)($record['BUKAN_WITEL_SOLO_JT_ORDER'] ?? 0);

        $calculatedTotals[$segment] = $calculatedTotalOrder;
}

if (!empty($validationErrors)) {
    return response()->json([
        'message' => 'Data Excel tidak valid.',
        'errors' => $validationErrors,
    ], 422);
}


            $data = [];

            foreach (array_slice($rows, 1, 10) as $row) {
    $item = array_combine(
        $headers,
        array_pad(
            array_slice($row, 0, count($headers)),
            count($headers),
            null
        )
    );

    $seg = strtoupper(trim((string) ($item['SEGMENT'] ?? '')));
    if (isset($calculatedTotals[$seg])) {
        $item['TOTAL_ORDER'] = $calculatedTotals[$seg];
    }

    $data[] = $item;
}

            return response()->json([
                'message' => 'Preview Excel berhasil.',
                'sheet_count' => 1,
                'total_rows' => count($rows) - 1,
                'headers' => $headers,
                'preview' => $data,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Gagal membaca file Excel.',
            ], 422);
        }
    }


public function store(Request $request)
{
    $validator = Validator::make($request->all(), [
        'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:20480'],
        'period' => [
            'nullable',
            'regex:/^\d{6}$/',
            function ($attribute, $value, $fail) {
                $month = (int) substr($value, 4, 2);

                if ($month < 1 || $month > 12) {
                    $fail('Bulan periode harus antara 01 dan 12.');
                }
            },
        ],
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Data upload tidak valid.',
            'errors' => $validator->errors(),
        ], 422);
    }

    try {
        // Gunakan importer dan aturan validasi yang sama dengan preview.
        $import = new PreviewEdkImport();

        Excel::import($import, $request->file('file'));

        $rows = $import->rows;

        if (count($rows) < 2) {
            return response()->json([
                'message' => 'Excel kosong atau tidak memiliki data.',
            ], 422);
        }

        $headers = array_map(
            fn ($header) => trim((string) $header),
            $rows[0]
        );

        $requiredHeaders = [
            'SEGMENT',
            'LANJUT_COMPLETE_ORDER',
            'LANJUT_COMPLETE_ABONEMEN_RP',
            'LANJUT_IN_PROGRESS_ORDER',
            'LANJUT_IN_PROGRESS_ABONEMEN_RP',
            'TIDAK_LANJUT_COMPLETE_ORDER',
            'TIDAK_LANJUT_COMPLETE_ABONEMEN_RP',
            'TIDAK_LANJUT_IN_PROGRESS_ORDER',
            'TIDAK_LANJUT_IN_PROGRESS_ABONEMEN_RP',
            'KONFIRMASI_AM_ORDER',
            'KONFIRMASI_AM_ABONEMEN_RP',
            'KONFIRMASI_AM_AUTO_RENEWAL',
            'KONFIRMASI_AM_IN_PROGRESS',
            'BUKAN_WITEL_SOLO_JT_ORDER',
            'BUKAN_WITEL_SOLO_JT_ABONEMEN_RP',
            'TOTAL_ORDER',
        ];

        $missingHeaders = array_diff($requiredHeaders, $headers);

        if (!empty($missingHeaders)) {
            return response()->json([
                'message' => 'Format Excel tidak sesuai template.',
                'missing_headers' => array_values($missingHeaders),
            ], 422);
        }

        $numericHeaders = array_diff($requiredHeaders, ['SEGMENT']);
        $allowedSegments = ['DGS', 'DPS', 'DSS', 'RBS'];
        $records = [];
        $errors = [];

        foreach (array_slice($rows, 1) as $index => $row) {
            if (count(array_filter(
                $row,
                fn ($value) => $value !== null
                    && trim((string) $value) !== ''
            )) === 0) {
                continue;
            }

            $record = array_combine(
                $headers,
                array_pad(
                    array_slice($row, 0, count($headers)),
                    count($headers),
                    null
                )
            );

            $segment = strtoupper(trim(
                (string) ($record['SEGMENT'] ?? '')
            ));

            if (!in_array($segment, $allowedSegments, true)) {
                $errors[] = 'Baris ' . ($index + 2)
                    . ': SEGMENT tidak valid.';
                continue;
            }

            if (isset($records[$segment])) {
                $errors[] = "Segmen {$segment} muncul lebih dari sekali.";
                continue;
            }

            foreach ($numericHeaders as $header) {
                $value = $record[$header] ?? null;

                if (
                    $value === null ||
                    trim((string) $value) === '' ||
                    !is_numeric($value) ||
                    (float) $value < 0
                ) {
                    $errors[] = 'Baris ' . ($index + 2)
                        . ": {$header} harus berupa angka nonnegatif.";
                }
            }

                        $record['TOTAL_ORDER'] =
                (int) $record['LANJUT_COMPLETE_ORDER'] +
                (int) $record['LANJUT_IN_PROGRESS_ORDER'] +
                (int) $record['TIDAK_LANJUT_COMPLETE_ORDER'] +
                (int) $record['TIDAK_LANJUT_IN_PROGRESS_ORDER'] +
                (int) $record['KONFIRMASI_AM_ORDER'] +
                (int) $record['KONFIRMASI_AM_AUTO_RENEWAL'] +
                (int) $record['KONFIRMASI_AM_IN_PROGRESS'] +
                (int) $record['BUKAN_WITEL_SOLO_JT_ORDER'];

            $records[$segment] = $record;
        }

        if (!empty($errors)) {
            return response()->json([
                'message' => 'Data Excel tidak valid.',
                'errors' => $errors,
            ], 422);
        }

        $missingSegments = array_diff(
            $allowedSegments,
            array_keys($records)
        );

        if (!empty($missingSegments)) {
            return response()->json([
                'message' => 'Excel harus berisi keempat segmen.',
                'missing_segments' => array_values($missingSegments),
            ], 422);
        }

        $file = $request->file('file');
        $period = $request->input('period') ?? now()->format('Ym');

        $upload = DB::transaction(function () use (
            $records,
            $file,
            $period
        ) {
            // Nomor versi berikutnya untuk periode yang sama.
            $lastVersion = EdkMonthlyUpload::where('period', $period)
                ->lockForUpdate()
                ->max('version');

            $nextVersion = ($lastVersion ?? 0) + 1;

            // Versi lama tetap tersimpan sebagai riwayat.
            // Nonaktifkan hanya di dalam transaksi.
            EdkMonthlyUpload::where('period', $period)
                ->update(['is_active' => false]);

            $upload = EdkMonthlyUpload::create([
                'period' => $period,
                'version' => $nextVersion,
                'original_filename' => $file->getClientOriginalName(),
                'total_rows' => count($records),
                'imported_rows' => count($records),
                'status' => 'success',
                'is_active' => true,
            ]);

            $columnMap = [
                'SEGMENT' => 'segment',
                'LANJUT_COMPLETE_ORDER' => 'lanjut_complete_order',
                'LANJUT_COMPLETE_ABONEMEN_RP' => 'lanjut_complete_abonemen_rp',
                'LANJUT_IN_PROGRESS_ORDER' => 'lanjut_in_progress_order',
                'LANJUT_IN_PROGRESS_ABONEMEN_RP' => 'lanjut_in_progress_abonemen_rp',
                'TIDAK_LANJUT_COMPLETE_ORDER' => 'tidak_lanjut_complete_order',
                'TIDAK_LANJUT_COMPLETE_ABONEMEN_RP' => 'tidak_lanjut_complete_abonemen_rp',
                'TIDAK_LANJUT_IN_PROGRESS_ORDER' => 'tidak_lanjut_in_progress_order',
                'TIDAK_LANJUT_IN_PROGRESS_ABONEMEN_RP' => 'tidak_lanjut_in_progress_abonemen_rp',
                'KONFIRMASI_AM_ORDER' => 'konfirmasi_am_order',
                'KONFIRMASI_AM_ABONEMEN_RP' => 'konfirmasi_am_abonemen_rp',
                'KONFIRMASI_AM_AUTO_RENEWAL' => 'konfirmasi_am_auto_renewal',
                'KONFIRMASI_AM_IN_PROGRESS' => 'konfirmasi_am_in_progress',
                'BUKAN_WITEL_SOLO_JT_ORDER' => 'bukan_witel_solo_jt_order',
                'BUKAN_WITEL_SOLO_JT_ABONEMEN_RP' => 'bukan_witel_solo_jt_abonemen_rp',
                'TOTAL_ORDER' => 'total_order',
            ];

            foreach ($records as $record) {
                $summary = [
                    'edk_monthly_upload_id' => $upload->id,
                ];

                foreach ($columnMap as $excelColumn => $dbColumn) {
                    $summary[$dbColumn] = $excelColumn === 'SEGMENT'
                        ? strtoupper(trim((string) $record[$excelColumn]))
                        : $record[$excelColumn];
                }

                EdkMonthlySummary::create($summary);
            }

            return $upload;
        });

        return response()->json([
            'message' => 'Upload EDK berhasil disimpan.',
            'period' => $upload->period,
            'version' => $upload->version,
            'imported_rows' => $upload->imported_rows,
            'status' => $upload->status,
        ], 201);

    } catch (\Throwable $e) {
        report($e);

        return response()->json([
            'message' => 'Gagal menyimpan data EDK.',
        ], 500);
    }
}


public function monthlyData(Request $request)
{
    $period = $request->query('period');

    if ($period !== null) {
        if (
            !preg_match('/^\d{6}$/', $period) ||
            (int) substr($period, 4, 2) < 1 ||
            (int) substr($period, 4, 2) > 12
        ) {
            return response()->json([
                'message' => 'Format periode harus YYYYMM.',
            ], 422);
        }
    }

    $query = EdkMonthlyUpload::with('summaries')
        ->where('status', 'success')
        ->where('is_active', true);

    if ($period !== null) {
        $query->where('period', $period);
    } else {
        $query->orderByDesc('period');
    }

    $upload = $query->first();

    if (!$upload) {
        return response()->json([
            'message' => 'Data EDK untuk periode tersebut belum tersedia.',
            'data' => null,
        ], 404);
    }

    return response()->json([
        'message' => 'Data EDK berhasil diambil.',
        'period' => $upload->period,
        'version' => $upload->version,
        'updated_at' => $upload->updated_at,
        'data' => $upload->summaries,
    ]);
}

}
