<?php

namespace App\Services;

class EdkOrderImporter
{
    public const REQUIRED_HEADERS = [
        'SID', 'ACCOUNT_NAME', 'SEGMENT', 'Nama AM', 'FEEDBACK WITEL',
        'F_Periode EDK', 'LI_STATUS_NEW_MANUAL', 'F_AUTORENEWAL2',
        'BILL_WITEL', 'MRC',
    ];

    public const SEGMENTS = ['DGS', 'DPS', 'DSS', 'RBS'];

    // Hanya status ini yang dihitung Complete; selain itu In Progress.
    public const COMPLETE_STATUS = 'COMPLETE';

    // Status yang sudah dikenal; nilai lain hanya memunculkan peringatan.
    public const KNOWN_STATUSES = [
        'COMPLETE', 'PENDING BASO', 'IN PROGRESS', 'FAILED',
        'PENDING', 'PENDING BILLING APPROVAL',
    ];

    // BILL_WITEL yang termasuk Witel Solo JT (kosong dianggap Solo JT).
    public const SOLO_JT_WITELS = ['SOLO', 'JATENG TIMUR'];

    public static function isOrderFile(array $headers): bool
    {
        return in_array('SID', $headers, true);
    }

    public static function normalizePeriod($value): string
    {
        return strtoupper(str_replace(' ', '', trim((string) $value)));
    }

    public static function isValidPeriod(string $period): bool
    {
        if (preg_match('/^<\d{4}$/', $period)) {
            return true;
        }

        if (!preg_match('/^\d{6}$/', $period)) {
            return false;
        }

        $month = (int) substr($period, 4, 2);

        return $month >= 1 && $month <= 12;
    }

    public static function parse(array $rows, array $headers): array
    {
        $result = [
            'orders' => [],
            'errors' => [],
            'warnings' => [],
            'skipped' => 0,
            'status_counts' => [],
            'missing_headers' => array_values(
                array_diff(self::REQUIRED_HEADERS, $headers)
            ),
        ];

        if (!empty($result['missing_headers'])) {
            return $result;
        }

        $seenSid = [];
        $duplicates = 0;
        $blankMrc = 0;
        $unknownStatuses = [];

        foreach (array_slice($rows, 1) as $index => $row) {
            $n = $index + 2;

            $r = array_combine(
                $headers,
                array_pad(array_slice($row, 0, count($headers)), count($headers), null)
            );

            foreach (['SID', 'SEGMENT', 'FEEDBACK WITEL', 'F_Periode EDK', 'LI_STATUS_NEW_MANUAL', 'MRC'] as $col) {
                if (is_string($r[$col] ?? null) && str_starts_with($r[$col], '=')) {
                    $result['errors'][] = 'File berisi rumus, bukan nilai. Salin sheet dengan Paste Special > Values.';
                    return $result;
                }
            }

            $sid = trim((string) ($r['SID'] ?? ''));

            // Baris kosong / blok tanda tangan.
            if ($sid === '') {
                $result['skipped']++;
                continue;
            }

            $segment = strtoupper(trim((string) ($r['SEGMENT'] ?? '')));

            if (!in_array($segment, self::SEGMENTS, true)) {
                $result['errors'][] = "Baris {$n}: SEGMENT tidak valid.";
                continue;
            }

            $feedback = match (strtolower(trim((string) ($r['FEEDBACK WITEL'] ?? '')))) {
                'lanjut' => 'lanjut',
                'tidak lanjut' => 'tidak_lanjut',
                'konfimasi am', 'konfirmasi am' => 'konfirmasi_am',
                default => null,
            };

            if ($feedback === null) {
                $result['errors'][] = "Baris {$n}: FEEDBACK WITEL tidak dikenal.";
                continue;
            }

            $period = self::normalizePeriod($r['F_Periode EDK'] ?? '');

            if (!self::isValidPeriod($period)) {
                $result['errors'][] = "Baris {$n}: F_Periode EDK tidak valid.";
                continue;
            }

            $mrcRaw = $r['MRC'] ?? null;

            if ($mrcRaw === null || trim((string) $mrcRaw) === '') {
                $mrc = 0;
                $blankMrc++;
            } elseif (is_numeric($mrcRaw)) {
                $mrc = (int) round((float) $mrcRaw);
            } else {
                $result['errors'][] = "Baris {$n}: MRC harus berupa angka.";
                continue;
            }

            $status = strtoupper(trim((string) ($r['LI_STATUS_NEW_MANUAL'] ?? '')));
            $statusKey = $status === '' ? '(KOSONG)' : $status;
            $result['status_counts'][$statusKey] =
                ($result['status_counts'][$statusKey] ?? 0) + 1;

            if ($status !== '' && !in_array($status, self::KNOWN_STATUSES, true)) {
                $unknownStatuses[$status] = true;
            }

            if (isset($seenSid[$sid])) {
                $duplicates++;
            }
            $seenSid[$sid] = true;

            $auto = strtoupper(trim((string) ($r['F_AUTORENEWAL2'] ?? '')));
            $bill = strtoupper(trim((string) ($r['BILL_WITEL'] ?? '')));

            $result['orders'][] = [
                'sid' => $sid,
                'account_name' => trim((string) ($r['ACCOUNT_NAME'] ?? '')) ?: null,
                'segment' => $segment,
                'nama_am' => trim((string) ($r['Nama AM'] ?? '')) ?: null,
                'feedback_witel' => $feedback,
                'periode_edk' => $period,
                'li_status' => $status ?: null,
                'f_autorenewal2' => $auto ?: null,
                'bill_witel' => $bill ?: null,
                'mrc' => $mrc,
            ];
        }

        if ($result['skipped'] > 0) {
            $result['warnings'][] = "{$result['skipped']} baris dilewati karena SID kosong.";
        }
        if ($duplicates > 0) {
            $result['warnings'][] = "{$duplicates} SID duplikat (tetap dihitung).";
        }
        if ($blankMrc > 0) {
            $result['warnings'][] = "{$blankMrc} baris MRC kosong (dihitung 0).";
        }
        foreach (array_keys($unknownStatuses) as $s) {
            $result['warnings'][] = "Status belum dikenal, dihitung In Progress: {$s}.";
        }

        return $result;
    }

    public static function bucketOf(array $order): string
    {
        $bill = strtoupper(trim((string) ($order['bill_witel'] ?? '')));

        if ($bill !== '' && !in_array($bill, self::SOLO_JT_WITELS, true)) {
            return 'bukan_witel';
        }

        if ($order['feedback_witel'] === 'konfirmasi_am') {
            return strtoupper((string) ($order['f_autorenewal2'] ?? '')) === 'Y'
                ? 'konfirmasi_auto'
                : 'konfirmasi_progress';
        }

        $complete = strtoupper(trim((string) ($order['li_status'] ?? ''))) === self::COMPLETE_STATUS;

        return $order['feedback_witel'] . ($complete ? '_complete' : '_in_progress');
    }

    // Hasilnya berbentuk sama dengan baris template agregat (dipakai ulang oleh store).
    public static function aggregate(array $orders): array
    {
        $map = [
            'lanjut_complete' => 'LANJUT_COMPLETE',
            'lanjut_in_progress' => 'LANJUT_IN_PROGRESS',
            'tidak_lanjut_complete' => 'TIDAK_LANJUT_COMPLETE',
            'tidak_lanjut_in_progress' => 'TIDAK_LANJUT_IN_PROGRESS',
            'konfirmasi_auto' => 'KONFIRMASI_AM_AUTO_RENEWAL',
            'konfirmasi_progress' => 'KONFIRMASI_AM_IN_PROGRESS',
            'bukan_witel' => 'BUKAN_WITEL_SOLO_JT',
        ];

        $records = [];

        foreach (self::SEGMENTS as $segment) {
            $record = ['SEGMENT' => $segment];

            foreach ($map as $prefix) {
                $record[$prefix . '_ORDER'] = 0;
                $record[$prefix . '_ABONEMEN_RP'] = 0;
            }

            $record['TOTAL_ORDER'] = 0;
            $records[$segment] = $record;
        }

        foreach ($orders as $order) {
            $prefix = $map[self::bucketOf($order)];
            $segment = $order['segment'];

            $records[$segment][$prefix . '_ORDER']++;
            $records[$segment][$prefix . '_ABONEMEN_RP'] += $order['mrc'];
            $records[$segment]['TOTAL_ORDER']++;
        }

        return $records;
    }
}
