<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\PersonalAccessToken;

class DevToolsController extends Controller
{
    /** Aksi pemeliharaan yang diizinkan. Tidak ada eksekusi perintah bebas. */
    private const ACTIONS = [
        'cache_clear'    => ['Bersihkan cache aplikasi', 'cache:clear', []],
        'optimize_clear' => ['Bersihkan cache config, route & view', 'optimize:clear', []],
    ];

    public function index()
    {
        $routes = collect(Route::getRoutes())->map(fn ($r) => [
            'methods'    => implode('|', array_diff($r->methods(), ['HEAD'])),
            'uri'        => $r->uri(),
            'middleware' => implode(', ', array_filter($r->gatherMiddleware(), 'is_string')),
        ])->filter(fn ($r) => str_starts_with($r['uri'], 'api/'))->values();

        $actions = [];
        foreach (self::ACTIONS as $key => [$label]) {
            $actions[] = ['key' => $key, 'label' => $label];
        }
        $actions[] = ['key' => 'prune_tokens', 'label' => 'Hapus token kedaluwarsa'];
        $actions[] = ['key' => 'clear_log', 'label' => 'Kosongkan laravel.log'];

        return response()->json([
            'actions' => $actions,
            'routes'  => $routes,
            'log'     => $this->tailLog(),
        ]);
    }

    public function run(string $action)
    {
        if ($action === 'clear_log') {
            $file = storage_path('logs/laravel.log');
            if (is_file($file)) {
                file_put_contents($file, '');
            }
            $output = 'laravel.log dikosongkan.';
        } elseif ($action === 'prune_tokens') {
            // Perintah sanctum:prune-expired hanya terdaftar di konsol, jadi hapus langsung.
            $count  = PersonalAccessToken::where('expires_at', '<', now())->delete();
            $output = "{$count} token kedaluwarsa dihapus.";
        } else {
            abort_unless(isset(self::ACTIONS[$action]), 404, 'Aksi tidak dikenal.');
            [, $command, $args] = self::ACTIONS[$action];
            Artisan::call($command, $args);
            $output = trim(Artisan::output()) ?: 'Selesai.';
        }

        Audit::log('dev.action', null, ['action' => $action]);

        return response()->json(['message' => $output]);
    }

    /** Ambil ±64 KB terakhir dari laravel.log. */
    private function tailLog(): array
    {
        $file = storage_path('logs/laravel.log');
        if (! is_file($file)) {
            return ['size' => 0, 'lines' => []];
        }

        $size = filesize($file);
        $fh   = fopen($file, 'rb');
        fseek($fh, max(0, $size - 65536));
        $chunk = (string) stream_get_contents($fh);
        fclose($fh);

        $lines = preg_split('/\R/', mb_convert_encoding($chunk, 'UTF-8', 'UTF-8'));
        if ($size > 65536) {
            array_shift($lines);   // baris pertama kemungkinan terpotong
        }

        return ['size' => $size, 'lines' => array_slice(array_values(array_filter($lines, 'strlen')), -200)];
    }
}
