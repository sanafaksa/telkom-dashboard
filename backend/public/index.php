<?php

declare(strict_types=1);

// Jika vendor/autoload.php sudah terpasang (full Laravel), jalankan kernel Laravel standar:
if (file_exists(__DIR__ . '/../vendor/autoload.php') && file_exists(__DIR__ . '/../bootstrap/app.php')) {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $app->handleRequest(Illuminate\Http\Request::capture());
    exit;
}

// ============================================================================
// Built-in Fast PDO MySQL Runner untuk endpoint Laravel /api/kuadran
// Otomatis membuat DB `telkom_dashboard`, tabel, dan seed 673 baris pada akses pertama.
// ============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$db   = getenv('DB_DATABASE') ?: 'telkom_dashboard';
$user = getenv('DB_USERNAME') ?: 'root';
$pass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '';

try {
    $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$db}`");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `kuadran_summaries` (
          `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          `bulan` VARCHAR(10) NOT NULL,
          `period` VARCHAR(10) NOT NULL DEFAULT '',
          `telda` VARCHAR(100) NOT NULL,
          `unit` VARCHAR(50) NOT NULL,
          `kw_awal` VARCHAR(10) NOT NULL DEFAULT '',
          `kw_akhir` TINYINT UNSIGNED NOT NULL,
          `jumlah` INT UNSIGNED NOT NULL DEFAULT 0,
          `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uq_kuadran_summary` (`bulan`, `telda`, `unit`, `kw_awal`, `kw_akhir`),
          KEY `idx_bulan` (`bulan`),
          KEY `idx_telda` (`telda`),
          KEY `idx_unit` (`unit`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `kuadran_uploads` (
          `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          `filename` VARCHAR(255) NOT NULL,
          `months` VARCHAR(100) NOT NULL,
          `row_count` INT UNSIGNED NOT NULL DEFAULT 0,
          `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Auto-seed jika tabel masih kosong
    $count = (int) $pdo->query("SELECT COUNT(*) FROM `kuadran_summaries`")->fetchColumn();
    $seedFile = __DIR__ . '/../database/seeders/kuadran_seed_data.json';
    if ($count === 0 && file_exists($seedFile)) {
        $seedRows = json_decode((string) file_get_contents($seedFile), true);
        if (is_array($seedRows) && count($seedRows) > 0) {
            $stmt = $pdo->prepare("
                INSERT INTO `kuadran_summaries` (`bulan`, `period`, `telda`, `unit`, `kw_awal`, `kw_akhir`, `jumlah`)
                VALUES (:bulan, :period, :telda, :unit, :kw_awal, :kw_akhir, :jumlah)
            ");
            $pdo->beginTransaction();
            foreach ($seedRows as $sr) {
                $stmt->execute([
                    ':bulan'    => $sr['bulan'],
                    ':period'   => $sr['period'] ?? '',
                    ':telda'    => $sr['telda'],
                    ':unit'     => $sr['unit'],
                    ':kw_awal'  => $sr['kw_awal'] ?? '',
                    ':kw_akhir' => (int) $sr['kw_akhir'],
                    ':jumlah'   => (int) $sr['jumlah'],
                ]);
            }
            $pdo->commit();
        }
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'Koneksi MySQL gagal. Pastikan MySQL di XAMPP/Laragon sudah dijalankan (port 3306).',
        'details' => $e->getMessage(),
    ]);
    exit;
}

function rowsToAggMonths(array $rows): array
{
    $order = [
        'Jan' => 1, 'Feb' => 2, 'Mar' => 3, 'Apr' => 4, 'May' => 5, 'Jun' => 6,
        'Jul' => 7, 'Aug' => 8, 'Sep' => 9, 'Oct' => 10, 'Nov' => 11, 'Dec' => 12,
    ];
    $groups = [];
    foreach ($rows as $r) {
        $bulan   = $r['bulan'];
        $period  = $r['period'] ?? '';
        $telda   = $r['telda'];
        $unit    = $r['unit'];
        $kwAwal  = strtoupper(trim((string) ($r['kw_awal'] ?? '')));
        $kwAkhir = (string) $r['kw_akhir'];
        $jumlah  = (int) $r['jumlah'];

        if (!isset($groups[$bulan])) {
            $groups[$bulan] = [
                'key'    => $bulan,
                'bulan'  => $bulan,
                'period' => $period,
                'cells'  => [],
            ];
        } elseif ($period !== '' && $groups[$bulan]['period'] === '') {
            $groups[$bulan]['period'] = $period;
        }

        $ck = $telda . "\x01" . $unit;
        if (!isset($groups[$bulan]['cells'][$ck])) {
            $groups[$bulan]['cells'][$ck] = [
                'telda' => $telda,
                'unit'  => $unit,
                'total' => [],
                'kat'   => [],
            ];
        }

        $cell = &$groups[$bulan]['cells'][$ck];
        $cell['total'][$kwAkhir] = ($cell['total'][$kwAkhir] ?? 0) + $jumlah;

        if ($kwAwal !== '') {
            $katKey = $kwAwal === 'NEW'
                ? "NEW-{$kwAkhir}"
                : ($kwAwal === $kwAkhir ? $kwAkhir : "{$kwAwal}-{$kwAkhir}");
            $cell['kat'][$katKey] = ($cell['kat'][$katKey] ?? 0) + $jumlah;
        }
    }

    $list = array_values($groups);
    usort($list, function ($a, $b) use ($order) {
        $ia = $order[$a['bulan']] ?? 99;
        $ib = $order[$b['bulan']] ?? 99;
        return $ia <=> $ib ?: strcmp($a['period'], $b['period']);
    });

    return $list;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET' && preg_match('#^/api/kuadran/?$#', $uri)) {
    $rows = $pdo->query("SELECT * FROM `kuadran_summaries`")->fetchAll();
    echo json_encode([
        'source' => 'mysql',
        'months' => rowsToAggMonths($rows),
    ]);
    exit;
}

if ($method === 'POST' && preg_match('#^/api/kuadran/sync/?$#', $uri)) {
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $rawRows = $body['rows'] ?? [];
    $filename = (string) ($body['filename'] ?? 'Upload_Kuadran.xlsx');

    if (!is_array($rawRows) || empty($rawRows)) {
        http_response_code(422);
        echo json_encode(['message' => 'Data rows kosong.']);
        exit;
    }

    $monthsTouched = [];
    $records = [];
    foreach ($rawRows as $r) {
        $bulan   = trim((string) ($r['bulan'] ?? $r[0] ?? ''));
        $period  = trim((string) ($r['period'] ?? $r[1] ?? ''));
        $telda   = trim((string) ($r['telda'] ?? $r[2] ?? ''));
        $unit    = trim((string) ($r['unit'] ?? $r[3] ?? ''));
        $kwAwal  = strtoupper(trim((string) ($r['kw_awal'] ?? $r[4] ?? '')));
        $kwAkhir = (int) ($r['kw_akhir'] ?? $r[5] ?? 0);
        $jumlah  = (int) ($r['jumlah'] ?? $r[6] ?? 0);

        if ($bulan === '' || $kwAkhir < 1 || $kwAkhir > 4 || $jumlah <= 0) {
            continue;
        }
        $monthsTouched[$bulan] = true;
        $records[] = [$bulan, $period, $telda, $unit, $kwAwal, $kwAkhir, $jumlah];
    }

    if (empty($records)) {
        http_response_code(422);
        echo json_encode(['message' => 'Tidak ada baris valid untuk disimpan ke MySQL.']);
        exit;
    }

    $monthNames = array_keys($monthsTouched);
    $placeholders = implode(',', array_fill(0, count($monthNames), '?'));

    $pdo->beginTransaction();
    $del = $pdo->prepare("DELETE FROM `kuadran_summaries` WHERE `bulan` IN ({$placeholders})");
    $del->execute($monthNames);

    $ins = $pdo->prepare("
        INSERT INTO `kuadran_summaries` (`bulan`, `period`, `telda`, `unit`, `kw_awal`, `kw_akhir`, `jumlah`)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `period` = VALUES(`period`), `jumlah` = VALUES(`jumlah`)
    ");
    foreach ($records as $rec) {
        $ins->execute($rec);
    }

    $log = $pdo->prepare("INSERT INTO `kuadran_uploads` (`filename`, `months`, `row_count`) VALUES (?, ?, ?)");
    $log->execute([$filename, implode(', ', $monthNames), count($records)]);
    $pdo->commit();

    $allRows = $pdo->query("SELECT * FROM `kuadran_summaries`")->fetchAll();
    echo json_encode([
        'message'   => 'Data berhasil disimpan ke MySQL.',
        'row_count' => count($records),
        'months'    => rowsToAggMonths($allRows),
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Endpoint tidak ditemukan.']);

