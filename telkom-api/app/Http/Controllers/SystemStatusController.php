<?php

namespace App\Http\Controllers;

use App\Support\Maintenance;
use App\Support\Settings;
use Carbon\Carbon;

/**
 * Status sistem publik (tanpa login): dipakai frontend untuk notifikasi pemeliharaan & pengingat
 * secara real-time (polling). Hanya berisi informasi yang memang ditampilkan ke semua pengguna.
 */
class SystemStatusController extends Controller
{
    public function show()
    {
        Maintenance::activateIfDue();

        $now     = Carbon::now();
        $active  = (bool) Settings::get('maintenance_mode');
        $startAt = Settings::get('maintenance_schedule_at');
        $start   = $startAt ? Carbon::parse($startAt) : null;
        $lead    = (int) Settings::get('maintenance_lead_minutes');

        $reminder = null;
        if (! $active && $start && $start->getTimestamp() > $now->getTimestamp()) {
            $secondsLeft = $start->getTimestamp() - $now->getTimestamp();
            if ($secondsLeft <= $lead * 60) {
                $reminder = [
                    'starts_at' => $start->toIso8601String(),
                    'message'   => Settings::get('maintenance_reminder_message'),
                ];
            }
        }

        return response()->json([
            'server_time' => $now->toIso8601String(),
            'maintenance' => [
                'active'  => $active,
                'message' => Settings::get('maintenance_message'),
            ],
            'reminder' => $reminder,
        ]);
    }
}
