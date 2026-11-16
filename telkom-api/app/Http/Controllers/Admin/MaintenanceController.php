<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Settings;
use Carbon\Carbon;
use Illuminate\Http\Request;

/** Mode pemeliharaan & pengingat terjadwal (permission maintenance.manage: Super Admin & Support). */
class MaintenanceController extends Controller
{
    public function show()
    {
        return response()->json($this->payload());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'maintenance_mode'             => 'sometimes|required|boolean',
            'maintenance_message'          => 'sometimes|nullable|string|max:300',
            'maintenance_schedule_at'      => 'sometimes|nullable|date',
            'maintenance_lead_minutes'     => 'sometimes|required|integer|min:1|max:1440',
            'maintenance_reminder_message' => 'sometimes|nullable|string|max:300',
        ]);

        $values = $data;
        if (array_key_exists('maintenance_schedule_at', $data)) {
            // Simpan dalam UTC (ISO 8601). Null = hapus jadwal.
            $values['maintenance_schedule_at'] = $data['maintenance_schedule_at']
                ? Carbon::parse($data['maintenance_schedule_at'])->utc()->toIso8601String()
                : '';
        }

        $changed = Settings::put($values, $request->user()->id);

        if ($changed) {
            Audit::log('settings.maintenance', null, ['perubahan' => $changed]);
        }

        return response()->json($this->payload());
    }

    private function payload(): array
    {
        return [
            'maintenance_mode'             => (bool) Settings::get('maintenance_mode'),
            'maintenance_message'          => Settings::get('maintenance_message'),
            'maintenance_schedule_at'      => Settings::get('maintenance_schedule_at') ?: null,
            'maintenance_lead_minutes'     => (int) Settings::get('maintenance_lead_minutes'),
            'maintenance_reminder_message' => Settings::get('maintenance_reminder_message'),
        ];
    }
}
