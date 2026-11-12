<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Pemeriksa struktur file Excel sumber Koreksi & Jurbal PSAK.
 *
 * Tidak mengasumsikan nama kolom apa pun: command ini hanya MELAPORKAN
 * sheet, baris header yang terdeteksi, nama kolom, contoh isi, dan
 * nilai unik kolom teks pendek (kandidat segmen / jenis transaksi /
 * kategori koreksi). Output dipakai untuk mengunci mapping kolom di
 * config/koreksi_jurbal.php sebelum importer diimplementasikan.
 *
 * Contoh:
 *   php artisan koreksi-jurbal:inspect "C:\path\raw_data.xlsx"
 *   php artisan koreksi-jurbal:inspect raw.xlsx --sheet="Flagging Tipe Koreksi" --rows=20
 *   php artisan koreksi-jurbal:inspect raw.xlsx --json > struktur.json
 */
class KoreksiJurbalInspectCommand extends Command
{
    protected $signature = 'koreksi-jurbal:inspect
        {path : Path file .xlsx yang akan diperiksa}
        {--sheet= : Hanya periksa sheet dengan nama ini (default: semua sheet)}
        {--rows=5 : Jumlah contoh baris data yang ditampilkan per sheet}
        {--distinct=25 : Batas nilai unik per kolom yang dilaporkan}
        {--json : Keluarkan hasil sebagai JSON (untuk dilampirkan ke laporan)}';

    protected $description = 'Laporkan sheet, header, contoh baris, dan nilai unik file Excel raw data Koreksi & Jurbal PSAK';

    /** Kolom dianggap "kategorikal" jika nilai uniknya tidak lebih dari ini. */
    private const CATEGORICAL_MAX = 60;

    public function handle(): int
    {
        $path = (string) $this->argument('path');
        if (!is_file($path)) {
            $this->error("File tidak ditemukan: {$path}");
            return self::FAILURE;
        }

        $reader = IOFactory::createReaderForFile($path);
        $reader->setReadDataOnly(true);
        $workbook = $reader->load($path);

        $only   = $this->option('sheet');
        $report = [
            'file'   => basename($path),
            'size'   => filesize($path),
            'sheets' => [],
        ];

        foreach ($workbook->getAllSheets() as $ws) {
            if ($only !== null && strcasecmp($ws->getTitle(), $only) !== 0) {
                continue;
            }
            $report['sheets'][] = $this->inspectSheet($ws);
        }

        if ($only !== null && !$report['sheets']) {
            $this->error("Sheet \"{$only}\" tidak ada. Sheet tersedia: " . implode(', ', $workbook->getSheetNames()));
            return self::FAILURE;
        }

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return self::SUCCESS;
        }

        $this->render($report);
        return self::SUCCESS;
    }

    private function inspectSheet(Worksheet $ws): array
    {
        $grid = $ws->toArray(null, true, false, false);
        $grid = array_values(array_filter($grid, fn ($row) => $this->rowHasValue($row)));

        $maxRow = $ws->getHighestDataRow();
        $maxCol = $ws->getHighestDataColumn();

        if (!$grid) {
            return [
                'name' => $ws->getTitle(), 'dimension' => "A1:{$maxCol}{$maxRow}",
                'empty' => true, 'header_row' => null, 'columns' => [], 'sample' => [], 'data_rows' => 0,
            ];
        }

        // Header = baris pertama dengan sel terisi terbanyak di 10 baris awal
        // (raw data Show Details selalu header di baris 1; judul/rekap bisa punya baris kosong di atas).
        $headerIdx = 0;
        $best      = -1;
        foreach (array_slice($grid, 0, 10, true) as $i => $row) {
            $filled = count(array_filter($row, fn ($v) => $v !== null && trim((string) $v) !== ''));
            if ($filled > $best) {
                $best = $filled;
                $headerIdx = $i;
            }
        }

        $headerRow = $grid[$headerIdx];
        $dataRows  = array_slice($grid, $headerIdx + 1);
        $limit     = max(1, (int) $this->option('rows'));
        $distinct  = max(1, (int) $this->option('distinct'));

        $columns = [];
        foreach ($headerRow as $c => $label) {
            $label = trim((string) $label);
            $values = array_map(fn ($r) => $r[$c] ?? null, $dataRows);
            $nonEmpty = array_values(array_filter($values, fn ($v) => $v !== null && trim((string) $v) !== ''));

            if ($label === '' && !$nonEmpty) {
                continue; // kolom benar-benar kosong
            }

            $numeric = count(array_filter($nonEmpty, fn ($v) => is_numeric($v)));
            $unique  = array_values(array_unique(array_map(fn ($v) => trim((string) $v), $nonEmpty)));
            sort($unique, SORT_NATURAL | SORT_FLAG_CASE);

            $type = match (true) {
                !$nonEmpty                       => 'empty',
                $numeric === count($nonEmpty)    => 'number',
                $numeric > 0                     => 'mixed',
                default                          => 'text',
            };

            $columns[] = [
                'index'      => $c,
                'letter'     => \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($c + 1),
                'header'     => $label === '' ? '(tanpa header)' : $label,
                'normalized' => $this->normalize($label),
                'type'       => $type,
                'filled'     => count($nonEmpty),
                'empty'      => count($values) - count($nonEmpty),
                'unique'     => count($unique),
                // Hanya kolom kategorikal yang dilaporkan nilainya: calon SEGMEN / jenis transaksi / tipe koreksi
                'values'     => $type !== 'number' && count($unique) <= self::CATEGORICAL_MAX
                    ? array_slice($unique, 0, $distinct)
                    : null,
                'sum'        => $type === 'number' ? array_sum(array_map('floatval', $nonEmpty)) : null,
                'min'        => $type === 'number' && $nonEmpty ? min(array_map('floatval', $nonEmpty)) : null,
                'max'        => $type === 'number' && $nonEmpty ? max(array_map('floatval', $nonEmpty)) : null,
            ];
        }

        $sample = array_map(function ($row) use ($headerRow) {
            $out = [];
            foreach ($headerRow as $c => $label) {
                $label = trim((string) $label);
                if ($label === '') continue;
                $v = $row[$c] ?? null;
                $out[$label] = $this->displayValue($v);
            }
            return $out;
        }, array_slice($dataRows, 0, $limit));

        return [
            'name'       => $ws->getTitle(),
            'dimension'  => "A1:{$maxCol}{$maxRow}",
            'empty'      => false,
            'header_row' => $headerIdx + 1,
            'data_rows'  => count($dataRows),
            'columns'    => $columns,
            'sample'     => $sample,
        ];
    }

    private function render(array $report): void
    {
        $this->info("File   : {$report['file']} (" . number_format($report['size'] / 1024, 1) . ' KB)');
        $this->info('Sheets : ' . count($report['sheets']));

        foreach ($report['sheets'] as $s) {
            $this->newLine();
            $this->line("<fg=cyan;options=bold>■ Sheet \"{$s['name']}\"</> [{$s['dimension']}]");
            if ($s['empty']) {
                $this->warn('  (kosong)');
                continue;
            }
            $this->line("  Header di baris {$s['header_row']}, {$s['data_rows']} baris data, " . count($s['columns']) . ' kolom');

            $this->table(
                ['Kol', 'Header', 'Kunci (snake)', 'Tipe', 'Terisi', 'Kosong', 'Unik', 'Nilai unik / ringkasan'],
                array_map(fn ($c) => [
                    $c['letter'],
                    mb_strimwidth($c['header'], 0, 32, '…'),
                    mb_strimwidth($c['normalized'], 0, 28, '…'),
                    $c['type'],
                    $c['filled'],
                    $c['empty'],
                    $c['unique'],
                    $c['values'] !== null
                        ? mb_strimwidth(implode(' | ', $c['values']), 0, 70, '…')
                        : ($c['type'] === 'number'
                            ? 'sum=' . number_format($c['sum'], 2, '.', ',') . " min={$c['min']} max={$c['max']}"
                            : '-'),
                ], $s['columns'])
            );

            if ($s['sample']) {
                $this->line('  Contoh baris:');
                foreach ($s['sample'] as $i => $row) {
                    $this->line('   #' . ($i + 1) . ' ' . json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
                }
            }
        }
    }

    private function rowHasValue(?array $row): bool
    {
        return (bool) array_filter($row ?? [], fn ($v) => $v !== null && trim((string) $v) !== '');
    }

    /** "Nama  Pelanggan" → nama_pelanggan (sama dengan konvensi EdkImporter). */
    private function normalize(string $label): string
    {
        $s = strtolower(trim($label));
        $s = preg_replace('/[^a-z0-9]+/', '_', $s);
        return trim($s, '_');
    }

    private function displayValue(mixed $v): mixed
    {
        if ($v === null) return null;
        if (is_float($v) && $v > 20000 && $v < 80000 && floor($v) == $v) {
            // kemungkinan serial tanggal Excel; tampilkan keduanya supaya bisa diverifikasi
            try {
                return $v . ' (' . ExcelDate::excelToDateTimeObject($v)->format('Y-m-d') . '?)';
            } catch (\Throwable) {
                return $v;
            }
        }
        return is_string($v) ? trim($v) : $v;
    }
}
