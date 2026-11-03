<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
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
// Built-in Fast PDO MySQL Runner untuk endpoint Laravel:
// 1. /api/kuadran       (Kuadran SJT)
// 2. /api/mom-support   (MoM & Support Needed)
// Otomatis membuat DB `telkom_dashboard`, tabel, dan seed awal pada akses pertama.
// ============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

    // 1. Tabel Kuadran SJT
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

    // 2. Tabel MoM & Support Needed
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `mom_action_plans` (
          `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          `no` VARCHAR(20) NOT NULL DEFAULT '',
          `tgl` VARCHAR(30) NOT NULL DEFAULT '',
          `agenda` VARCHAR(120) NOT NULL DEFAULT 'FORUM WITEL',
          `main_topic` VARCHAR(255) NOT NULL DEFAULT '',
          `unit_telda` VARCHAR(100) NOT NULL DEFAULT 'PRQ',
          `peserta` TEXT NULL,
          `pembahasan` LONGTEXT NULL,
          `pembahasan_notulen` LONGTEXT NULL,
          `action_plan` TEXT NOT NULL,
          `uic` VARCHAR(150) NOT NULL DEFAULT 'PRQ',
          `destinasi_fu` VARCHAR(255) NOT NULL DEFAULT '-',
          `support_needed` TEXT NULL,
          `deadline` VARCHAR(80) NOT NULL DEFAULT '-',
          `status` VARCHAR(30) NOT NULL DEFAULT 'BELUM FU',
          `notes` TEXT NULL,
          `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_mom_agenda` (`agenda`),
          KEY `idx_mom_status` (`status`),
          KEY `idx_mom_uic` (`uic`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `mom_uploads` (
          `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          `filename` VARCHAR(255) NOT NULL,
          `sheet_name` VARCHAR(100) NOT NULL DEFAULT 'Notulensi Tracker',
          `row_count` INT UNSIGNED NOT NULL DEFAULT 0,
          `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Auto-seed Kuadran SJT jika kosong
    $countKuadran = (int) $pdo->query("SELECT COUNT(*) FROM `kuadran_summaries`")->fetchColumn();
    $seedKuadranFile = __DIR__ . '/../database/seeders/kuadran_seed_data.json';
    if ($countKuadran === 0 && file_exists($seedKuadranFile)) {
        $seedRows = json_decode((string) file_get_contents($seedKuadranFile), true);
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

    // Auto-seed MoM & Support Needed jika kosong
    $countMom = (int) $pdo->query("SELECT COUNT(*) FROM `mom_action_plans`")->fetchColumn();
    $seedMomFile = __DIR__ . '/../database/seeders/mom_seed_data.json';
    if ($countMom === 0 && file_exists($seedMomFile)) {
        seedMomDefaultData($pdo, $seedMomFile);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'Koneksi MySQL gagal. Pastikan MySQL di XAMPP/Laragon sudah dijalankan (port 3306).',
        'details' => $e->getMessage(),
    ]);
    exit;
}

function seedMomDefaultData(PDO $pdo, string $seedMomFile): void
{
    $seedRows = json_decode((string) file_get_contents($seedMomFile), true);
    if (!is_array($seedRows) || count($seedRows) === 0) {
        return;
    }
    $stmt = $pdo->prepare("
        INSERT INTO `mom_action_plans`
          (`no`, `tgl`, `agenda`, `main_topic`, `unit_telda`, `peserta`, `pembahasan`, `pembahasan_notulen`, `action_plan`, `uic`, `destinasi_fu`, `support_needed`, `deadline`, `status`, `notes`)
        VALUES
          (:no, :tgl, :agenda, :main_topic, :unit_telda, :peserta, :pembahasan, :pembahasan_notulen, :action_plan, :uic, :destinasi_fu, :support_needed, :deadline, :status, :notes)
    ");
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM `mom_action_plans`");
    foreach ($seedRows as $sr) {
        $stmt->execute([
            ':no'                 => (string) ($sr['no'] ?? ''),
            ':tgl'                => (string) ($sr['tgl'] ?? ''),
            ':agenda'             => (string) ($sr['agenda'] ?? 'FORUM WITEL'),
            ':main_topic'         => (string) ($sr['main_topic'] ?? ''),
            ':unit_telda'         => (string) ($sr['unit_telda'] ?? 'PRQ'),
            ':peserta'            => (string) ($sr['peserta'] ?? ''),
            ':pembahasan'         => (string) ($sr['pembahasan'] ?? ''),
            ':pembahasan_notulen' => (string) ($sr['pembahasan_notulen'] ?? ''),
            ':action_plan'        => (string) ($sr['action_plan'] ?? ''),
            ':uic'                => (string) ($sr['uic'] ?? 'PRQ'),
            ':destinasi_fu'       => (string) ($sr['destinasi_fu'] ?? '-'),
            ':support_needed'     => (string) ($sr['support_needed'] ?? '-'),
            ':deadline'           => (string) ($sr['deadline'] ?? '-'),
            ':status'             => (string) ($sr['status'] ?? 'BELUM FU'),
            ':notes'              => (string) ($sr['notes'] ?? ''),
        ]);
    }
    $pdo->commit();
}

function momRowToCamel(array $r): array
{
    return [
        'id'                => (int) $r['id'],
        'no'                => (string) ($r['no'] ?? ''),
        'tgl'               => (string) ($r['tgl'] ?? ''),
        'agenda'            => (string) ($r['agenda'] ?? ''),
        'mainTopic'         => (string) ($r['main_topic'] ?? ''),
        'unitTelda'         => (string) ($r['unit_telda'] ?? ''),
        'peserta'           => (string) ($r['peserta'] ?? ''),
        'pembahasan'        => (string) ($r['pembahasan'] ?? ''),
        'pembahasanNotulen' => (string) ($r['pembahasan_notulen'] ?? ''),
        'actionPlan'        => (string) ($r['action_plan'] ?? ''),
        'uic'               => (string) ($r['uic'] ?? ''),
        'destinasiFu'       => (string) ($r['destinasi_fu'] ?? '-'),
        'supportNeeded'     => (string) ($r['support_needed'] ?? '-'),
        'deadline'          => (string) ($r['deadline'] ?? '-'),
        'status'            => (string) ($r['status'] ?? 'BELUM FU'),
        'notes'             => (string) ($r['notes'] ?? ''),
    ];
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

// ============================================================================
// ROUTES: /api/kuadran
// ============================================================================
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

// ============================================================================
// ROUTES: /api/mom-support
// ============================================================================
if ($method === 'GET' && preg_match('#^/api/mom-support/?$#', $uri)) {
    $rows = $pdo->query("SELECT * FROM `mom_action_plans` ORDER BY `id` ASC")->fetchAll();
    echo json_encode([
        'source' => 'mysql',
        'items'  => array_map('momRowToCamel', $rows),
    ]);
    exit;
}

if ($method === 'POST' && preg_match('#^/api/mom-support/sync/?$#', $uri)) {
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $items = $body['items'] ?? [];
    $filename = (string) ($body['filename'] ?? 'Notulensi_Rapat_GM.xlsx');
    $sheetName = (string) ($body['sheet_name'] ?? 'Notulensi Tracker');
    $mode = (string) ($body['mode'] ?? 'replace');

    if (!is_array($items) || empty($items)) {
        http_response_code(422);
        echo json_encode(['message' => 'Data Action Plan kosong.']);
        exit;
    }

    $pdo->beginTransaction();
    if ($mode === 'replace') {
        $pdo->exec("DELETE FROM `mom_action_plans`");
    }

    $ins = $pdo->prepare("
        INSERT INTO `mom_action_plans`
          (`no`, `tgl`, `agenda`, `main_topic`, `unit_telda`, `peserta`, `pembahasan`, `pembahasan_notulen`, `action_plan`, `uic`, `destinasi_fu`, `support_needed`, `deadline`, `status`, `notes`)
        VALUES
          (:no, :tgl, :agenda, :main_topic, :unit_telda, :peserta, :pembahasan, :pembahasan_notulen, :action_plan, :uic, :destinasi_fu, :support_needed, :deadline, :status, :notes)
    ");

    $count = 0;
    foreach ($items as $idx => $it) {
        $ins->execute([
            ':no'                 => (string) ($it['no'] ?? ($idx + 1)),
            ':tgl'                => (string) ($it['tgl'] ?? 'N/A'),
            ':agenda'             => (string) ($it['agenda'] ?? 'FORUM WITEL'),
            ':main_topic'         => (string) ($it['mainTopic'] ?? $it['main_topic'] ?? 'Umum'),
            ':unit_telda'         => (string) ($it['unitTelda'] ?? $it['unit_telda'] ?? 'PRQ'),
            ':peserta'            => (string) ($it['peserta'] ?? ''),
            ':pembahasan'         => (string) ($it['pembahasan'] ?? ''),
            ':pembahasan_notulen' => (string) ($it['pembahasanNotulen'] ?? $it['pembahasan_notulen'] ?? ''),
            ':action_plan'        => (string) ($it['actionPlan'] ?? $it['action_plan'] ?? '(Tidak ada rincian aksi)'),
            ':uic'                => (string) ($it['uic'] ?? 'PRQ'),
            ':destinasi_fu'       => (string) ($it['destinasiFu'] ?? $it['destinasi_fu'] ?? '-'),
            ':support_needed'     => (string) ($it['supportNeeded'] ?? $it['support_needed'] ?? '-'),
            ':deadline'           => (string) ($it['deadline'] ?? '-'),
            ':status'             => (string) ($it['status'] ?? 'BELUM FU'),
            ':notes'              => (string) ($it['notes'] ?? ''),
        ]);
        $count++;
    }

    $log = $pdo->prepare("INSERT INTO `mom_uploads` (`filename`, `sheet_name`, `row_count`) VALUES (?, ?, ?)");
    $log->execute([$filename, $sheetName, $count]);
    $pdo->commit();

    $rows = $pdo->query("SELECT * FROM `mom_action_plans` ORDER BY `id` ASC")->fetchAll();
    echo json_encode([
        'message'   => 'Data MoM & Support Needed berhasil disimpan ke MySQL.',
        'row_count' => $count,
        'items'     => array_map('momRowToCamel', $rows),
    ]);
    exit;
}

if ($method === 'PUT' && preg_match('#^/api/mom-support/(\d+)/?$#', $uri, $m)) {
    $id = (int) $m[1];
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];

    $upd = $pdo->prepare("
        UPDATE `mom_action_plans`
        SET
          `no`                 = :no,
          `tgl`                = :tgl,
          `agenda`             = :agenda,
          `main_topic`         = :main_topic,
          `unit_telda`         = :unit_telda,
          `peserta`            = :peserta,
          `pembahasan`         = :pembahasan,
          `pembahasan_notulen` = :pembahasan_notulen,
          `action_plan`        = :action_plan,
          `uic`                = :uic,
          `destinasi_fu`       = :destinasi_fu,
          `support_needed`     = :support_needed,
          `deadline`           = :deadline,
          `status`             = :status,
          `notes`              = :notes
        WHERE `id` = :id
    ");
    $upd->execute([
        ':no'                 => (string) ($body['no'] ?? ''),
        ':tgl'                => (string) ($body['tgl'] ?? ''),
        ':agenda'             => (string) ($body['agenda'] ?? 'FORUM WITEL'),
        ':main_topic'         => (string) ($body['mainTopic'] ?? $body['main_topic'] ?? ''),
        ':unit_telda'         => (string) ($body['unitTelda'] ?? $body['unit_telda'] ?? 'PRQ'),
        ':peserta'            => (string) ($body['peserta'] ?? ''),
        ':pembahasan'         => (string) ($body['pembahasan'] ?? ''),
        ':pembahasan_notulen' => (string) ($body['pembahasanNotulen'] ?? $body['pembahasan_notulen'] ?? ''),
        ':action_plan'        => (string) ($body['actionPlan'] ?? $body['action_plan'] ?? ''),
        ':uic'                => (string) ($body['uic'] ?? 'PRQ'),
        ':destinasi_fu'       => (string) ($body['destinasiFu'] ?? $body['destinasi_fu'] ?? '-'),
        ':support_needed'     => (string) ($body['supportNeeded'] ?? $body['support_needed'] ?? '-'),
        ':deadline'           => (string) ($body['deadline'] ?? '-'),
        ':status'             => (string) ($body['status'] ?? 'BELUM FU'),
        ':notes'              => (string) ($body['notes'] ?? ''),
        ':id'                 => $id,
    ]);

    $st = $pdo->prepare("SELECT * FROM `mom_action_plans` WHERE `id` = ?");
    $st->execute([$id]);
    $row = $st->fetch();

    echo json_encode([
        'message' => 'Perubahan Action Plan berhasil disimpan ke MySQL.',
        'item'    => $row ? momRowToCamel($row) : null,
    ]);
    exit;
}

if ($method === 'POST' && preg_match('#^/api/mom-support/reset/?$#', $uri)) {
    $seedMomFile = __DIR__ . '/../database/seeders/mom_seed_data.json';
    if (file_exists($seedMomFile)) {
        seedMomDefaultData($pdo, $seedMomFile);
    }
    $rows = $pdo->query("SELECT * FROM `mom_action_plans` ORDER BY `id` ASC")->fetchAll();
    echo json_encode([
        'message' => 'Data MoM & Support Needed berhasil di-reset ke data awal di MySQL.',
        'items'   => array_map('momRowToCamel', $rows),
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['message' => 'Endpoint tidak ditemukan.']);
