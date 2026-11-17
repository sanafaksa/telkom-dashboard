<?php

namespace Database\Seeders;

use App\Models\MomActionPlan;
use App\Models\MomMeeting;
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

        DB::transaction(function () use ($rows) {
            MomActionPlan::query()->delete();
            MomMeeting::query()->delete();

            // Baris seed flat: baris dengan NO, tanggal, agenda, dan topik yang sama masuk ke satu notulensi.
            foreach ($rows as $row) {
                $meeting = MomMeeting::firstOrCreate(
                    [
                        'no'         => (string) ($row['no'] ?? ''),
                        'tgl'        => (string) ($row['tgl'] ?? ''),
                        'agenda'     => (string) ($row['agenda'] ?? 'FORUM WITEL'),
                        'main_topic' => (string) ($row['main_topic'] ?? ''),
                    ],
                    [
                        'unit_telda'         => (string) ($row['unit_telda'] ?? 'PRQ'),
                        'peserta'            => $row['peserta'] ?? null,
                        'pembahasan'         => $row['pembahasan'] ?? null,
                        'pembahasan_notulen' => $row['pembahasan_notulen'] ?? null,
                    ]
                );

                MomActionPlan::create([
                    'mom_meeting_id' => $meeting->id,
                    'action_plan'    => (string) ($row['action_plan'] ?? ''),
                    'uic'            => (string) ($row['uic'] ?? '-'),
                    'destinasi_fu'   => (string) ($row['destinasi_fu'] ?? '-'),
                    'support_needed' => (string) ($row['support_needed'] ?? '-'),
                    'deadline'       => (string) ($row['deadline'] ?? '-'),
                    'status'         => (string) ($row['status'] ?? 'BELUM FU'),
                    'notes'          => (string) ($row['notes'] ?? ''),
                ]);
            }
        });
    }
}
