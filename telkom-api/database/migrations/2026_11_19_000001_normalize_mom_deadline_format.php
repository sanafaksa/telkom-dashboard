<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Deadline action plan diseragamkan ke format "18 Sep 2026".
 * - "W3 Sep 2026" (minggu ke-3) → tanggal tengah minggu: W1→4, W2→11, W3→18, W4→25, W5→30.
 * - "11/09/2026" (DD/MM/YYYY) → "11 Sep 2026".
 * Pemetaan ini sama dengan normalizeDeadline() di frontend (src/data/supportParser.js).
 */
return new class extends Migration
{
    private const WEEK_DAY = [1 => 4, 2 => 11, 3 => 18, 4 => 25, 5 => 30];

    private const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    public function up(): void
    {
        DB::table('mom_action_plans')->select(['id', 'deadline'])->chunkById(200, function ($rows) {
            foreach ($rows as $row) {
                $new = self::normalize((string) $row->deadline);
                if ($new !== $row->deadline) {
                    DB::table('mom_action_plans')->where('id', $row->id)->update(['deadline' => $new]);
                }
            }
        });
    }

    /** Tidak bisa dikembalikan: nomor minggu asli tidak disimpan. */
    public function down(): void
    {
        //
    }

    public static function normalize(string $raw): string
    {
        $str = trim($raw);

        if (preg_match('/^W([1-5])\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/i', $str, $m)) {
            $month = self::monthName($m[2]);

            return $month ? self::WEEK_DAY[(int) $m[1]] . " {$month} {$m[3]}" : $str;
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $str, $m)) {
            $month = self::MONTHS[(int) $m[2] - 1] ?? null;

            return $month ? (int) $m[1] . " {$month} {$m[3]}" : $str;
        }

        return $str;
    }

    private static function monthName(string $short): ?string
    {
        foreach (self::MONTHS as $month) {
            if (strcasecmp($month, $short) === 0) {
                return $month;
            }
        }

        return null;
    }
};
