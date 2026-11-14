<?php

namespace App\Services;

use App\Models\User;
use App\Support\Rbac;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Backup & restore data aplikasi dalam format JSON-lines ter-gzip.
 * Tidak bergantung pada mysqldump sehingga berjalan di MySQL maupun SQLite.
 *
 * Baris 1  : header {format, created_at, driver, migrations[], tables{nama: jumlah}}
 * Baris 2+ : {"t": "<tabel>", "r": {kolom: nilai}}
 */
class BackupService
{
    private const FORMAT = 'solaris-backup-v1';

    /** Tabel runtime yang tidak ikut di-backup (cache, sesi, antrean, token login). */
    private const EXCLUDED = [
        'migrations', 'cache', 'cache_locks', 'sessions', 'jobs', 'job_batches',
        'failed_jobs', 'personal_access_tokens', 'password_reset_tokens',
    ];

    public const NAME_PATTERN = '/^backup-\d{8}-\d{6}-[a-z0-9]{6}(-[a-z]+)?\.json\.gz$/';

    public function directory(): string
    {
        $dir = storage_path('app/private/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0750, true);
        }

        return $dir;
    }

    public function path(string $name): string
    {
        if (! preg_match(self::NAME_PATTERN, $name)) {
            abort(404, 'Backup tidak ditemukan.');
        }
        $path = $this->directory() . DIRECTORY_SEPARATOR . $name;
        abort_unless(is_file($path), 404, 'Backup tidak ditemukan.');

        return $path;
    }

    public function list(): array
    {
        $items = [];
        foreach (glob($this->directory() . DIRECTORY_SEPARATOR . 'backup-*.json.gz') ?: [] as $file) {
            if (! preg_match(self::NAME_PATTERN, basename($file))) {
                continue;
            }
            $header  = $this->readHeader($file);
            $items[] = [
                'name'       => basename($file),
                'size'       => filesize($file),
                'created_at' => $header['created_at'] ?? date('c', filemtime($file)),
                'tables'     => count($header['tables'] ?? []),
                'rows'       => array_sum($header['tables'] ?? []),
                'note'       => $header['note'] ?? null,
            ];
        }
        usort($items, fn ($a, $b) => strcmp($b['name'], $a['name']));

        return $items;
    }

    public function tables(): array
    {
        return array_values(array_diff(array_column(Schema::getTables(), 'name'), self::EXCLUDED));
    }

    public function create(?string $note = null, string $suffix = ''): string
    {
        $name = sprintf('backup-%s-%s%s.json.gz', now()->format('Ymd-His'), strtolower(bin2hex(random_bytes(3))), $suffix);
        $path = $this->directory() . DIRECTORY_SEPARATOR . $name;

        $tables = [];
        foreach ($this->tables() as $table) {
            $tables[$table] = DB::table($table)->count();
        }

        $gz = gzopen($path, 'wb6');
        if ($gz === false) {
            throw new RuntimeException('Tidak dapat menulis file backup.');
        }

        try {
            gzwrite($gz, $this->encode([
                'format'     => self::FORMAT,
                'created_at' => now()->toIso8601String(),
                'driver'     => DB::connection()->getDriverName(),
                'migrations' => $this->migrations(),
                'tables'     => $tables,
                'note'       => $note,
            ]) . "\n");

            foreach (array_keys($tables) as $table) {
                foreach (DB::table($table)->cursor() as $row) {
                    gzwrite($gz, $this->encode(['t' => $table, 'r' => (array) $row]) . "\n");
                }
            }
        } catch (\Throwable $e) {
            gzclose($gz);
            @unlink($path);
            throw $e;
        }

        gzclose($gz);

        return $name;
    }

    /**
     * Ganti seluruh data aplikasi dengan isi backup. Atomik: bila gagal, data lama tetap utuh.
     *
     * @return array<string, int> jumlah baris yang dipulihkan per tabel
     */
    public function restore(string $name): array
    {
        $path   = $this->path($name);
        $header = $this->readHeader($path);

        if (($header['format'] ?? null) !== self::FORMAT) {
            throw new RuntimeException('Format file backup tidak dikenali.');
        }
        if (($header['migrations'] ?? []) !== $this->migrations()) {
            throw new RuntimeException('Skema database saat ini berbeda dengan saat backup dibuat (migration tidak sama). Restore dibatalkan.');
        }

        $tables = array_values(array_intersect(array_keys($header['tables']), $this->tables()));
        $counts = array_fill_keys($tables, 0);

        Schema::disableForeignKeyConstraints();

        try {
            DB::transaction(function () use ($path, $tables, &$counts) {
                if (DB::connection()->getDriverName() === 'sqlite') {
                    DB::statement('PRAGMA defer_foreign_keys = ON');   // urutan insert antar tabel bebas
                }

                foreach ($tables as $table) {
                    DB::table($table)->delete();
                }

                $gz = gzopen($path, 'rb');
                gzgets($gz);   // lewati header

                $buffer = [];
                $flush  = function (string $table) use (&$buffer, &$counts) {
                    if (! empty($buffer[$table])) {
                        DB::table($table)->insert($buffer[$table]);
                        $counts[$table] += count($buffer[$table]);
                        $buffer[$table] = [];
                    }
                };

                try {
                    while (($line = gzgets($gz)) !== false) {
                        $line = trim($line);
                        if ($line === '') {
                            continue;
                        }
                        $item = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                        if (! isset($counts[$item['t']])) {
                            continue;
                        }
                        $buffer[$item['t']][] = $item['r'];
                        if (count($buffer[$item['t']]) >= 200) {
                            $flush($item['t']);
                        }
                    }
                } finally {
                    gzclose($gz);
                }

                foreach ($tables as $table) {
                    $flush($table);
                }

                $superAdmins = User::where('role', Rbac::SUPER_ADMIN)->where('is_active', true)->count();
                if ($superAdmins === 0) {
                    throw new RuntimeException('Backup tidak memiliki Super Admin aktif. Restore dibatalkan.');
                }

                // ID user bisa menunjuk orang yang berbeda setelah restore:
                // semua sesi & API key dicabut, semua orang login ulang.
                DB::table('personal_access_tokens')->delete();
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        Cache::flush();   // matriks permission, settings, dan cache dashboard

        return $counts;
    }

    public function delete(string $name): void
    {
        unlink($this->path($name));
    }

    private function migrations(): array
    {
        return DB::table('migrations')->orderBy('migration')->pluck('migration')->all();
    }

    private function readHeader(string $path): array
    {
        $gz = @gzopen($path, 'rb');
        if ($gz === false) {
            return [];
        }
        $line = gzgets($gz);
        gzclose($gz);

        return is_string($line) ? (json_decode($line, true) ?: []) : [];
    }

    private function encode(array $data): string
    {
        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
