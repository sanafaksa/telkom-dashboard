<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KuadranSummary;
use App\Models\KuadranUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KuadranController extends Controller
{
    private const MONTH_ORDER = [
        'Jan' => 1, 'Feb' => 2, 'Mar' => 3, 'Apr' => 4, 'May' => 5, 'Jun' => 6,
        'Jul' => 7, 'Aug' => 8, 'Sep' => 9, 'Oct' => 10, 'Nov' => 11, 'Dec' => 12,
    ];

    /**
     * GET /api/kuadran
     * Mengambil seluruh ringkasan kuadran dari MySQL dan mengembalikannya
     * dalam struktur { months: [...] } yang langsung dipakai oleh frontend React.
     */
    public function index(): JsonResponse
    {
        $rows = KuadranSummary::query()->get();
        return response()->json([
            'source' => 'mysql',
            'months' => self::rowsToAggMonths($rows),
        ]);
    }

    /**
     * POST /api/kuadran/sync
     * Menerima hasil ringkasan otomatis dari upload file Excel di frontend:
     * {
     *   "filename": "Master Data Kuadran 2026 SJT (2).xlsx",
     *   "rows": [ ["Jul", "202607", "BLORA", "Business", "", 1, 275], ... ]
     * }
     * dan menyimpannya ke tabel MySQL kuadran_summaries.
     */
    public function sync(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'filename' => 'nullable|string|max:255',
            'rows'     => 'required|array|min:1',
        ]);

        $rawRows = $payload['rows'];
        $monthsTouched = [];
        $records = [];
        $now = now();

        foreach ($rawRows as $r) {
            $bulan   = trim((string) ($r['bulan'] ?? $r[0] ?? ''));
            $period  = trim((string) ($r['period'] ?? $r[1] ?? ''));
            $telda   = trim((string) ($r['telda'] ?? $r[2] ?? ''));
            $unit    = trim((string) ($r['unit'] ?? $r[3] ?? ''));
            $kwAwal  = strtoupper(trim((string) ($r['kw_awal'] ?? $r[4] ?? '')));
            $kwAkhir = (int) ($r['kw_akhir'] ?? $r[5] ?? 0);
            $jumlah  = (int) ($r['jumlah'] ?? $r[6] ?? 0);

            if ($bulan === '' || $kwAkhir < 1 || $kwAkhir > 4 || $jumlah <= 0) {
                continue;
            }

            $monthsTouched[$bulan] = true;
            $records[] = [
                'bulan'      => $bulan,
                'period'     => $period,
                'telda'      => $telda,
                'unit'       => $unit,
                'kw_awal'    => $kwAwal,
                'kw_akhir'   => $kwAkhir,
                'jumlah'     => $jumlah,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (empty($records)) {
            return response()->json(['message' => 'Tidak ada baris valid untuk disimpan.'], 422);
        }

        $monthNames = array_keys($monthsTouched);

        DB::transaction(function () use ($monthNames, $records, $payload) {
            KuadranSummary::whereIn('bulan', $monthNames)->delete();

            foreach (array_chunk($records, 250) as $chunk) {
                KuadranSummary::upsert(
                    $chunk,
                    ['bulan', 'telda', 'unit', 'kw_awal', 'kw_akhir'],
                    ['period', 'jumlah', 'updated_at']
                );
            }

            KuadranUpload::create([
                'filename'  => $payload['filename'] ?? 'Upload_Kuadran.xlsx',
                'months'    => implode(', ', $monthNames),
                'row_count' => count($records),
            ]);
        });

        $allRows = KuadranSummary::query()->get();

        return response()->json([
            'message'   => 'Data berhasil disimpan ke MySQL.',
            'row_count' => count($records),
            'months'    => self::rowsToAggMonths($allRows),
        ]);
    }

    /**
     * DELETE /api/kuadran/{bulan}
     */
    public function destroyMonth(string $bulan): JsonResponse
    {
        $deleted = KuadranSummary::where('bulan', $bulan)->delete();
        return response()->json([
            'message' => "Data bulan {$bulan} dihapus ({$deleted} baris).",
        ]);
    }

    public static function rowsToAggMonths(iterable $rows): array
    {
        $groups = [];
        foreach ($rows as $r) {
            $bulan   = is_array($r) ? $r['bulan'] : $r->bulan;
            $period  = is_array($r) ? ($r['period'] ?? '') : ($r->period ?? '');
            $telda   = is_array($r) ? $r['telda'] : $r->telda;
            $unit    = is_array($r) ? $r['unit'] : $r->unit;
            $kwAwal  = strtoupper(trim((string) (is_array($r) ? ($r['kw_awal'] ?? '') : ($r->kw_awal ?? ''))));
            $kwAkhir = (string) (is_array($r) ? $r['kw_akhir'] : $r->kw_akhir);
            $jumlah  = (int) (is_array($r) ? $r['jumlah'] : $r->jumlah);

            if (!isset($groups[$bulan])) {
                $groups[$bulan] = [
                    'key'    => $bulan,
                    'bulan'  => $bulan,
                    'period' => $period,
                    'cells'  => [],
                ];
            } elseif ($period !== '' && $groups[$bulan]['period'] === '') {
                $groups[$bulan]['period'] = $period;
            }

            $ck = $telda . "\x01" . $unit;
            if (!isset($groups[$bulan]['cells'][$ck])) {
                $groups[$bulan]['cells'][$ck] = [
                    'telda' => $telda,
                    'unit'  => $unit,
                    'total' => [],
                    'kat'   => [],
                ];
            }

            $cell = &$groups[$bulan]['cells'][$ck];
            $cell['total'][$kwAkhir] = ($cell['total'][$kwAkhir] ?? 0) + $jumlah;

            if ($kwAwal !== '') {
                $katKey = $kwAwal === 'NEW'
                    ? "NEW-{$kwAkhir}"
                    : ($kwAwal === $kwAkhir ? $kwAkhir : "{$kwAwal}-{$kwAkhir}");
                $cell['kat'][$katKey] = ($cell['kat'][$katKey] ?? 0) + $jumlah;
            }
        }

        $list = array_values($groups);
        usort($list, function ($a, $b) {
            $ia = self::MONTH_ORDER[$a['bulan']] ?? 99;
            $ib = self::MONTH_ORDER[$b['bulan']] ?? 99;
            return $ia <=> $ib ?: strcmp($a['period'], $b['period']);
        });

        return $list;
    }
}

