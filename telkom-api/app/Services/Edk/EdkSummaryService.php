<?php

namespace App\Services\Edk;

use App\Models\EdkRecord;
use App\Models\EdkUpload;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

class EdkSummaryService
{
    /** kolom tabel => [STATUS_UTAMA, STATUS_DETAIL] — hanya witel SOLO JT */
    public const CATEGORIES = [
        'lanjut_complete'            => ['LANJUT', 'COMPLETE'],
        'lanjut_in_progress'         => ['LANJUT', 'IN_PROGRESS'],
        'tidak_lanjut_complete'      => ['TIDAK_LANJUT', 'COMPLETE'],
        'tidak_lanjut_in_progress'   => ['TIDAK_LANJUT', 'IN_PROGRESS'],
        'konfirmasi_am_auto_renewal' => ['KONFIRMASI_AM', 'AUTO_RENEWAL'],
        'konfirmasi_am_in_progress'  => ['KONFIRMASI_AM', 'IN_PROGRESS'],
    ];

    // ───────────────────────── Summary 4 tab ─────────────────────────

    public function summary(EdkUpload $upload, array $f, string $by): array
    {
        $year = $upload->report_date->year;
        $q    = $this->metrics(EdkRecord::query()->filter($upload, $f));

        // whitelist group-by (input user tidak pernah masuk ke SQL)
        match ($by) {
            'segmen'  => $q->addSelect('segmen as grp')->groupBy('segmen')->orderBy('segmen'),
            'periode' => $q->selectRaw("CASE WHEN periode_edk < '{$year}01' THEN 'old' ELSE periode_edk END AS grp")
                           ->groupBy('grp'),
            'am'      => $q->addSelect('segmen', 'nama_am as grp')
                           ->groupBy('segmen', 'nama_am')->orderBy('segmen')->orderBy('nama_am'),
            'cc'      => $q->addSelect('nama_cc as grp')->groupBy('nama_cc')->orderBy('nama_cc'),
            default   => throw new InvalidArgumentException("Group-by tidak valid: {$by}"),
        };

        $rows = $q->toBase()->get()
            ->map(function ($r) use ($by, $year) {
                $row = $this->cast($r);
                $row['key']   = $r->grp;
                $row['label'] = match (true) {
                    $by === 'periode' && $r->grp === 'old' => "< {$year}",
                    $r->grp === null                        => '(Kosong)',
                    default                                 => $r->grp,
                };
                unset($row['grp']);
                return $row;
            });

        if ($by === 'periode') {
            // "< tahun" paling atas, lalu YYYYMM naik
            $rows = $rows->sortBy(fn ($r) => $r['key'] === 'old' ? '000000' : $r['key']);
        }

        return [
            'upload_id'   => $upload->id,
            'last_update' => $upload->report_date->toDateString(),
            'by'          => $by,
            'rows'        => $rows->values(),
            'total'       => $this->cast($this->metrics(EdkRecord::query()->filter($upload, $f))->toBase()->first()),
        ];
    }

    // ───────────────────────── Cards ─────────────────────────

    public function cards(EdkUpload $upload, array $f): array
    {
        $cur  = $this->totals($upload, $f);
        $prev = EdkUpload::previousOf($upload);
        $old  = $prev ? $this->totals($prev, $f) : null;

        return [
            'upload_id'      => $upload->id,
            'last_update'    => $upload->report_date->toDateString(),
            'compared_to'    => $prev?->report_date->toDateString(),
            'total_order'    => ['value' => $cur['total_order'],    'delta_pct' => $this->delta($cur['total_order'], $old['total_order'] ?? null)],
            'total_abonemen' => ['value' => $cur['total_abonemen'], 'delta_pct' => $this->delta($cur['total_abonemen'], $old['total_abonemen'] ?? null)],
            'in_progress'    => ['value' => $cur['in_progress_order'], 'pct_of_total' => $this->share($cur['in_progress_order'], $cur['total_order'])],
            'complete'       => ['value' => $cur['complete_order'],    'pct_of_total' => $this->share($cur['complete_order'], $cur['total_order'])],
        ];
    }

    // ───────────────────────── Options dropdown ─────────────────────────

    public function options(EdkUpload $upload): array
    {
        $yearStart = $upload->report_date->year . '01';
        $base      = fn () => EdkRecord::where('edk_upload_id', $upload->id)->toBase();

        $periode = $base()->whereNotNull('periode_edk')->distinct()->orderBy('periode_edk')->pluck('periode_edk');

        $hasOld  = $periode->contains(fn ($p) => $p < $yearStart);

        return [
            'upload_id'   => $upload->id,
            'last_update' => $upload->report_date->toDateString(),
            'periode'     => collect($hasOld ? [['value' => 'old', 'label' => '< ' . $upload->report_date->year]] : [])
                ->concat($periode->filter(fn ($p) => $p >= $yearStart)->map(fn ($p) => ['value' => $p, 'label' => $p]))
                ->values(),
            'segmen'      => $base()->whereNotNull('segmen')->distinct()->orderBy('segmen')->pluck('segmen'),
            'am'          => $base()->whereNotNull('nama_am')->select('nama_am', 'segmen')->distinct()->orderBy('nama_am')->get(),
            'flag'        => $base()->selectRaw('flag, COUNT(*) AS total')->groupBy('flag')->pluck('total', 'flag'),
        ];
    }

    // ───────────────────────── Top pelanggan ─────────────────────────

    public function topCustomers(EdkUpload $upload, array $f, int $limit = 10, string $sort = 'abonemen_desc'): array
    {
        $q = $this->metrics(EdkRecord::query()->filter($upload, $f))
            ->addSelect('nama_pelanggan', 'segmen')
            ->groupBy('nama_pelanggan', 'segmen');

        match ($sort) {
            'abonemen_asc' => $q->orderBy('total_abonemen'),
            'nama_asc'     => $q->orderBy('nama_pelanggan'),
            'order_desc'   => $q->orderByDesc('total_order'),
            default        => $q->orderByDesc('total_abonemen'),
        };

        $rows = $q->orderBy('nama_pelanggan')->limit($limit)->toBase()->get()
            ->map(fn ($r) => $this->cast($r))->values();

        return [
            'upload_id'      => $upload->id,
            'last_update'    => $upload->report_date->toDateString(),
            'segmen'         => $f['segmen'] ?? null,
            'total_abonemen' => round($rows->sum('total_abonemen'), 2),
            'rows'           => $rows,
        ];
    }

    // ───────────────────────── Helper ─────────────────────────

    /** Kolom SUM(CASE ...) bersama untuk semua tab. Nilai status = konstanta kode, bukan input user. */
    private function metrics(Builder $q): Builder
    {
        foreach (self::CATEGORIES as $key => [$utama, $detail]) {
            $cond = "witel = 'SOLO JT' AND status_utama = '{$utama}' AND status_detail = '{$detail}'";
            $q->selectRaw("COALESCE(SUM(CASE WHEN {$cond} THEN order_qty ELSE 0 END), 0) AS {$key}_order")
              ->selectRaw("COALESCE(SUM(CASE WHEN {$cond} THEN abonemen ELSE 0 END), 0) AS {$key}_abonemen");
        }

        return $q
            ->selectRaw("COALESCE(SUM(CASE WHEN witel <> 'SOLO JT' THEN order_qty ELSE 0 END), 0) AS bukan_witel_order")
            ->selectRaw("COALESCE(SUM(CASE WHEN witel <> 'SOLO JT' THEN abonemen ELSE 0 END), 0) AS bukan_witel_abonemen")
            ->selectRaw('COALESCE(SUM(order_qty), 0) AS total_order')
            ->selectRaw('COALESCE(SUM(abonemen), 0) AS total_abonemen');
    }

    private function totals(EdkUpload $upload, array $f): array
    {
        return $this->cast(EdkRecord::query()->filter($upload, $f)->toBase()
            ->selectRaw('COALESCE(SUM(order_qty), 0) AS total_order')
            ->selectRaw('COALESCE(SUM(abonemen), 0) AS total_abonemen')
            ->selectRaw("COALESCE(SUM(CASE WHEN status_detail = 'IN_PROGRESS' THEN order_qty ELSE 0 END), 0) AS in_progress_order")
            ->selectRaw("COALESCE(SUM(CASE WHEN status_detail = 'COMPLETE' THEN order_qty ELSE 0 END), 0) AS complete_order")
            ->first());
    }

    /** MySQL mengembalikan SUM sebagai string → cast ke int/float. */
    private function cast(object|array|null $row): array
    {
        $row = (array) $row;
        foreach ($row as $k => $v) {
            if (str_ends_with($k, '_order')) {
                $row[$k] = (int) $v;
            } elseif (str_ends_with($k, '_abonemen')) {
                $row[$k] = round((float) $v, 2);
            }
        }
        return $row;
    }

    private function delta(float|int $now, float|int|null $before): ?float
    {
        return $before ? round(($now - $before) / abs($before) * 100, 2) : null;
    }

    private function share(int $part, int $total): ?float
    {
        return $total ? round($part / $total * 100, 2) : null;
    }
}
