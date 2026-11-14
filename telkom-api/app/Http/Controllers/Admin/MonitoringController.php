<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\PersonalAccessToken;
use Throwable;

class MonitoringController extends Controller
{
    public function index()
    {
        $start = microtime(true);
        $dbOk  = true;
        try {
            DB::select('select 1');
        } catch (Throwable) {
            $dbOk = false;
        }
        $dbMs = round((microtime(true) - $start) * 1000, 1);

        $cacheOk = false;
        try {
            Cache::put('monitor.ping', 1, 10);
            $cacheOk = Cache::get('monitor.ping') === 1;
        } catch (Throwable) {
            // dilaporkan sebagai tidak sehat
        }

        $storage = storage_path();
        $logFile = storage_path('logs/laravel.log');
        $count   = fn (string $table) => Schema::hasTable($table) ? DB::table($table)->count() : null;

        return response()->json([
            'checks' => [
                ['name' => 'Database', 'ok' => $dbOk, 'detail' => "{$dbMs} ms"],
                ['name' => 'Cache', 'ok' => $cacheOk, 'detail' => config('cache.default')],
                ['name' => 'Storage dapat ditulis', 'ok' => is_writable($storage), 'detail' => 'storage/'],
                ['name' => 'Mode debug nonaktif', 'ok' => ! config('app.debug'), 'detail' => config('app.debug') ? 'APP_DEBUG=true' : 'APP_DEBUG=false'],
            ],
            'app' => [
                'Environment' => config('app.env'),
                'PHP'         => PHP_VERSION,
                'Laravel'     => app()->version(),
                'Database'    => DB::connection()->getDriverName() . ' ' . self::databaseVersion(),
                'Cache'       => config('cache.default'),
                'Queue'       => config('queue.default'),
                'Zona waktu'  => config('app.timezone'),
                'Waktu server' => now()->toDateTimeString(),
            ],
            'resources' => [
                'disk_total'   => @disk_total_space($storage) ?: null,
                'disk_free'    => @disk_free_space($storage) ?: null,
                'memory_usage' => memory_get_usage(true),
                'memory_peak'  => memory_get_peak_usage(true),
                'memory_limit' => ini_get('memory_limit'),
                'log_size'     => is_file($logFile) ? filesize($logFile) : 0,
            ],
            'counts' => [
                'Pengguna'           => User::count(),
                'Sesi aktif'         => PersonalAccessToken::where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->count(),
                'Audit log'          => AuditLog::count(),
                'Aktivitas 24 jam'   => AuditLog::where('created_at', '>=', now()->subDay())->count(),
                'Job antre'          => $count('jobs'),
                'Job gagal'          => $count('failed_jobs'),
            ],
        ]);
    }

    public static function databaseVersion(): string
    {
        try {
            $sql = DB::connection()->getDriverName() === 'sqlite' ? 'select sqlite_version() as v' : 'select version() as v';

            return (string) DB::selectOne($sql)->v;
        } catch (Throwable) {
            return '-';
        }
    }
}
