<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Database Management: inspeksi read-only (tanpa konsol SQL). */
class DatabaseController extends Controller
{
    /** Kolom yang isinya tidak pernah ditampilkan. */
    private const MASKED = ['password', 'remember_token', 'token', 'payload'];

    public function index()
    {
        $tables = collect(Schema::getTables())->map(fn ($t) => [
            'name' => $t['name'],
            'rows' => DB::table($t['name'])->count(),
            'size' => $t['size'] ?? null,
        ])->sortBy('name')->values();

        $migrations = Schema::hasTable('migrations')
            ? DB::table('migrations')->orderByDesc('id')->get(['migration', 'batch'])
            : collect();

        $files = collect(glob(database_path('migrations/*.php')))->map(fn ($f) => basename($f, '.php'));

        return response()->json([
            'driver'     => DB::connection()->getDriverName(),
            'database'   => basename((string) DB::connection()->getDatabaseName()),
            'version'    => MonitoringController::databaseVersion(),
            'tables'     => $tables,
            'total_rows' => $tables->sum('rows'),
            'total_size' => $tables->sum('size'),
            'migrations' => $migrations,
            'pending'    => $files->diff($migrations->pluck('migration'))->values(),
        ]);
    }

    public function table(string $table)
    {
        abort_unless(in_array($table, array_column(Schema::getTables(), 'name'), true), 404, 'Tabel tidak ditemukan.');

        $columns = collect(Schema::getColumns($table))->map(fn ($c) => [
            'name'     => $c['name'],
            'type'     => $c['type'],
            'nullable' => $c['nullable'],
        ]);

        $rows = DB::table($table)->limit(25)->get()->map(function ($row) use ($table) {
            $row = (array) $row;
            foreach ($row as $key => $value) {
                $secret = in_array($key, self::MASKED, true) || ($table === 'system_settings' && $key === 'value');
                if ($secret && $value !== null) {
                    $row[$key] = '••••••';
                } elseif (is_string($value) && mb_strlen($value) > 120) {
                    $row[$key] = mb_substr($value, 0, 120) . '…';
                }
            }

            return $row;
        });

        return response()->json(['table' => $table, 'columns' => $columns, 'rows' => $rows]);
    }
}
