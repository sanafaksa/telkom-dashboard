<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MomActionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = __DIR__ . '/mom_seed_data.json';
        if (!file_exists($jsonPath)) {
            return;
        }

        $rows = json_decode(file_get_contents($jsonPath), true);
        if (!is_array($rows) || empty($rows)) {
            return;
        }

        DB::table('mom_action_plans')->truncate();

        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('mom_action_plans')->insert($chunk);
        }
    }
}

