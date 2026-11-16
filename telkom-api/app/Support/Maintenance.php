<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Mode pemeliharaan terjadwal: saat waktu jadwal tiba, mode pemeliharaan aktif otomatis
 * (sekali), lalu jadwalnya dikosongkan. Menonaktifkan mode hanya dilakukan manual oleh
 * Super Admin / Support, dan jadwal yang sudah terpakai tidak akan mengaktifkannya lagi.
 */
class Maintenance
{
    public static function activateIfDue(): bool
    {
        if (Settings::get('maintenance_mode')) {
            return false;
        }

        $scheduledAt = Settings::get('maintenance_schedule_at');
        if (! $scheduledAt || Carbon::parse($scheduledAt)->isFuture()) {
            return false;
        }

        Settings::put(['maintenance_mode' => true, 'maintenance_schedule_at' => ''], null);
        Audit::log('settings.maintenance', null, ['otomatis' => true, 'jadwal' => $scheduledAt]);

        return true;
    }
}
