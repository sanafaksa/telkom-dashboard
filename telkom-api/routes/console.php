<?php

use App\Support\Maintenance;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cadangan: mengaktifkan mode pemeliharaan terjadwal walau tidak ada yang membuka aplikasi.
// Butuh `php artisan schedule:run` tiap menit (cron/Task Scheduler).
Schedule::call(fn () => Maintenance::activateIfDue())->everyMinute()->name('maintenance-activate-scheduled');
