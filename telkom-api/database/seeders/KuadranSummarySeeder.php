<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KuadranSummarySeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = __DIR__ . '/kuadran_seed_data.json';
        if (!file_exists($jsonPath)) {
            return;
        }

        $rows = json_decode(file_get_contents($jsonPath), true);
        if (!is_array($rows) || empty($rows)) {
            return;
        }

        DB::table('kuadran_summaries')->truncate();

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('kuadran_summaries')->insert($chunk);
        }
    }
}

