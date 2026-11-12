<?php

namespace App\Services\KoreksiJurbal;

use App\Models\KoreksiJurbalEntry;
use App\Models\KoreksiJurbalUpload;

/**
 * Rekap tabel Koreksi & Jurbal PSAK per segmen.
 *
 * Per segmen dipakai upload 'done' terbaru. Pada periode terbaru file tsb:
 *   Reverse    = jumlah baris jurbal (reverse)
 *   Correction = jumlah baris koreksi
 *   Net        = Reverse + Correction
 *   Tipe PSAK  = Correction per jenis koreksi
 */
class KoreksiJurbalSummary
{
    public const SEGMEN = ['DGS', 'DPS', 'DSS', 'RBS'];
    public const TIPE   = ['agent', 'amortisasi', 'edk', 'populasi', 'splitbill', 'timing', 'lowCr'];

    public function build(): array
    {
        $uploads = KoreksiJurbalUpload::where('status', 'done')
            ->whereIn('segmen', self::SEGMEN)
            ->latest('id')
            ->get()
            ->unique('segmen')
            ->keyBy('segmen');

        $rows = [];
        foreach (self::SEGMEN as $segmen) {
            $u = $uploads->get($segmen);
            if (!$u || !$u->periode) continue;

            $sums = KoreksiJurbalEntry::where('koreksi_jurbal_upload_id', $u->id)
                ->where('periode', $u->periode)
                ->groupBy('kategori', 'tipe_psak')
                ->selectRaw('kategori, tipe_psak, SUM(amount) AS total')
                ->get();

            $reverse    = (float) $sums->where('kategori', 'reverse')->sum('total');
            $correction = (float) $sums->where('kategori', 'correction')->sum('total');
            $psak       = array_fill_keys(self::TIPE, 0);
            foreach ($sums->where('kategori', 'correction') as $s) {
                if ($s->tipe_psak && isset($psak[$s->tipe_psak])) $psak[$s->tipe_psak] += (float) $s->total;
            }

            $rows[] = [
                'segmen'     => $segmen,
                'periode'    => $u->periode,
                'reverse'    => (int) round($reverse),
                'correction' => (int) round($correction),
                'net'        => (int) round($reverse + $correction),
                'psak'       => array_map(fn ($v) => (int) round($v), $psak),
                'source'     => [
                    'upload_id'  => $u->id,
                    'filename'   => $u->original_name,
                    'uploadedAt' => $u->created_at?->toIso8601String(),
                ],
            ];
        }

        $latest = $rows ? max(array_column($rows, 'periode')) : null;

        return [
            'period' => $latest ? [
                'periode'    => $latest,
                'reverse'    => $this->quarter($latest, -1),
                'correction' => $this->quarter($latest, 0),
            ] : null,
            'rows'    => $rows,
            'missing' => array_values(array_diff(self::SEGMEN, array_column($rows, 'segmen'))),
        ];
    }

    /** 202609 → "Q3-26"; $shift = -1 → kuartal sebelumnya ("Q2-26"). */
    private function quarter(int $periode, int $shift): string
    {
        $q = intdiv($periode % 100 - 1, 3) + 1 + $shift;
        $y = intdiv($periode, 100);
        if ($q < 1) { $q += 4; $y--; }

        return sprintf('Q%d-%02d', $q, $y % 100);
    }
}
