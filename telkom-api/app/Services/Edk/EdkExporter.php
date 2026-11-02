<?php

namespace App\Services\Edk;

use App\Models\EdkRecord;
use App\Models\EdkUpload;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EdkExporter
{
    public const BY_LABEL = [
        'segmen'  => 'Segmen',
        'periode' => 'Periode EDK',
        'am'      => 'Nama AM',
        'cc'      => 'Nama CC',
    ];

    /** [judul grup, [[sub judul, prefix kolom], ...]] — urutan sama dengan tabel UI */
    private const GROUPS = [
        ['Lanjut',              [['Complete', 'lanjut_complete'], ['In Progress', 'lanjut_in_progress']]],
        ['Tidak Lanjut',        [['Complete', 'tidak_lanjut_complete'], ['In Progress', 'tidak_lanjut_in_progress']]],
        ['Konfirmasi AM',       [['Auto Renewal', 'konfirmasi_am_auto_renewal'], ['In Progress', 'konfirmasi_am_in_progress']]],
        ['Bukan Witel Solo JT', [['Total', 'bukan_witel']]],
        ['Total',               [['Total', 'total']]],
    ];

    private const DETAIL_COLUMNS = [
        'sid', 'no_order', 'nama_pelanggan', 'nama_am', 'nama_cc', 'segmen', 'witel',
        'periode_edk', 'status_utama', 'status_detail', 'order_qty', 'abonemen', 'flag',
    ];

    private const DETAIL_HEADERS = [
        'SID', 'NO_ORDER', 'NAMA_PELANGGAN', 'NAMA_AM', 'NAMA_CC', 'SEGMEN', 'WITEL',
        'PERIODE_EDK', 'STATUS_UTAMA', 'STATUS_DETAIL', 'ORDER', 'ABONEMEN', 'FLAG',
    ];

    /** Disimpan sebagai teks supaya tidak berubah jadi angka / notasi ilmiah */
    private const TEXT_COLUMNS = ['sid', 'no_order', 'periode_edk'];

    public function __construct(private EdkSummaryService $summary) {}

    // ───────────────────────── XLSX ─────────────────────────

    /** Return path file sementara (dihapus controller setelah dikirim). */
    public function xlsx(EdkUpload $upload, array $f, string $by): string
    {
        $ss = new Spreadsheet();
        $this->fillSummary($ss->getActiveSheet(), $upload, $f, $by);
        $this->fillDetail($ss->createSheet(), $upload, $f);
        $ss->setActiveSheetIndex(0);

        $path = tempnam(sys_get_temp_dir(), 'edkx') . '.xlsx';
        (new Xlsx($ss))->save($path);
        $ss->disconnectWorksheets();

        return $path;
    }

    private function fillSummary(Worksheet $ws, EdkUpload $upload, array $f, string $by): void
    {
        $ws->setTitle('Ringkasan');
        $data      = $this->summary->summary($upload, $f, $by);
        $labelCols = $by === 'am' ? ['Segmen', 'Nama AM'] : [self::BY_LABEL[$by]];
        $lc        = count($labelCols);

        $ws->setCellValue('A1', 'EDK Monitoring – Ringkasan per ' . self::BY_LABEL[$by]);
        $ws->setCellValue('A2', 'Last Update: ' . $data['last_update'] . $this->filterText($f));
        $ws->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        // Header 3 tingkat: baris 4 grup, baris 5 sub, baris 6 Order/Abonemen
        foreach ($labelCols as $i => $text) {
            $ws->setCellValue($this->cell($i + 1, 4), $text);
            $ws->mergeCells($this->cell($i + 1, 4) . ':' . $this->cell($i + 1, 6));
        }

        $col = $lc + 1;
        foreach (self::GROUPS as [$group, $subs]) {
            $start = $col;
            foreach ($subs as [$subLabel]) {
                $ws->setCellValue($this->cell($col, 5), $subLabel);
                $ws->mergeCells($this->cell($col, 5) . ':' . $this->cell($col + 1, 5));
                $ws->setCellValue($this->cell($col, 6), 'Order');
                $ws->setCellValue($this->cell($col + 1, 6), 'Abonemen (Rp)');
                $col += 2;
            }
            $ws->setCellValue($this->cell($start, 4), $group);
            $ws->mergeCells($this->cell($start, 4) . ':' . $this->cell($col - 1, 4));
        }
        $lastCol = $col - 1;

        // Isi
        $r = 7;
        foreach ($this->bodyRows($data, $by) as [$labels, $m, $type]) {
            $values = array_merge($labels, array_map(fn ($k) => $m[$k] ?? 0, $this->metricKeys()));
            $ws->fromArray($values, null, $this->cell(1, $r), true);

            if ($type !== 'row') {
                $range = $this->cell(1, $r) . ':' . $this->cell($lastCol, $r);
                $ws->getStyle($range)->getFont()->setBold(true);
                $ws->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB($type === 'total' ? 'DCE6F7' : 'F1F5F9');
            }
            $r++;
        }

        // Style
        $head = $this->cell(1, 4) . ':' . $this->cell($lastCol, 6);
        $ws->getStyle($head)->getFont()->setBold(true);
        $ws->getStyle($head)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);
        $ws->getStyle($head)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('C7D7F5');

        $ws->getStyle($this->cell(1, 4) . ':' . $this->cell($lastCol, $r - 1))
            ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $ws->getStyle($this->cell($lc + 1, 7) . ':' . $this->cell($lastCol, $r - 1))
            ->getNumberFormat()->setFormatCode('#,##0');

        for ($c = 1; $c <= $lastCol; $c++) {
            $ws->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $ws->freezePane($this->cell($lc + 1, 7));
    }

    private function fillDetail(Worksheet $ws, EdkUpload $upload, array $f): void
    {
        $ws->setTitle('Detail');
        $ws->fromArray(self::DETAIL_HEADERS, null, 'A1');
        $ws->getStyle('A1:M1')->getFont()->setBold(true);

        $r = 2;
        EdkRecord::query()->filter($upload, $f)
            ->orderBy('segmen')->orderBy('nama_am')->orderBy('nama_pelanggan')->orderBy('id')
            ->toBase()
            ->select(self::DETAIL_COLUMNS)
            ->chunk(1000, function ($chunk) use ($ws, &$r) {
                foreach ($chunk as $rec) {
                    foreach (self::DETAIL_COLUMNS as $i => $col) {
                        $addr = $this->cell($i + 1, $r);
                        $v    = $rec->$col;

                        if (in_array($col, self::TEXT_COLUMNS, true)) {
                            $ws->setCellValueExplicit($addr, (string) $v, DataType::TYPE_STRING);
                        } elseif ($col === 'order_qty') {
                            $ws->setCellValue($addr, (int) $v);
                        } elseif ($col === 'abonemen') {
                            $ws->setCellValue($addr, (float) $v);
                        } else {
                            $ws->setCellValue($addr, $v);
                        }
                    }
                    $r++;
                }
            });

        $last = max(1, $r - 1);
        $ws->getStyle("L2:L{$last}")->getNumberFormat()->setFormatCode('#,##0');
        $ws->setAutoFilter("A1:M{$last}");
        $ws->freezePane('A2');
        foreach (range('A', 'M') as $c) {
            $ws->getColumnDimension($c)->setAutoSize(true);
        }
    }

    // ───────────────────────── CSV ─────────────────────────

    public function csv(EdkUpload $upload, array $f, string $by, string $filename): StreamedResponse
    {
        $data = $this->summary->summary($upload, $f, $by);

        $header = $by === 'am' ? ['Segmen', 'Nama AM'] : [self::BY_LABEL[$by]];
        foreach (self::GROUPS as [$group, $subs]) {
            foreach ($subs as [$subLabel]) {
                $prefix   = $subLabel === 'Total' ? $group : "{$group} {$subLabel}";
                $header[] = "{$prefix} Order";
                $header[] = "{$prefix} Abonemen";
            }
        }

        return response()->streamDownload(function () use ($data, $by, $header) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");                       // BOM → Excel baca UTF-8
            fputcsv($out, $header, ';');
            foreach ($this->bodyRows($data, $by) as [$labels, $m]) {
                fputcsv($out, array_merge($labels, array_map(fn ($k) => $m[$k] ?? 0, $this->metricKeys())), ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // ───────────────────────── Helper ─────────────────────────

    /** @return array<int, array{0: array, 1: array, 2: string}> [label kolom, metrik, tipe row|subtotal|total] */
    private function bodyRows(array $data, string $by): array
    {
        $rows = collect($data['rows']);
        $out  = [];

        if ($by === 'am') {
            foreach ($rows->groupBy('segmen') as $segmen => $items) {
                $out[] = [["Subtotal Segmen {$segmen}", "({$items->count()} Account Manager)"], $this->sum($items), 'subtotal'];
                foreach ($items as $row) {
                    $out[] = [[$segmen, $row['label']], $row, 'row'];
                }
            }
        } else {
            foreach ($rows as $row) {
                $out[] = [[$row['label']], $row, 'row'];
            }
        }

        $out[] = [$by === 'am' ? ['WITEL SOLO JT TOTAL', ''] : ['WITEL SOLO JT TOTAL'], $data['total'], 'total'];

        return $out;
    }

    private function metricKeys(): array
    {
        $keys = [];
        foreach (self::GROUPS as [, $subs]) {
            foreach ($subs as [, $prefix]) {
                $keys[] = "{$prefix}_order";
                $keys[] = "{$prefix}_abonemen";
            }
        }
        return $keys;
    }

    private function sum(Collection $items): array
    {
        return collect($this->metricKeys())->mapWithKeys(fn ($k) => [$k => $items->sum($k)])->all();
    }

        private function filterText(array $f): string
    {
        if (!$f) return '';
        $parts = collect($f)->map(function ($v, $k) {
            $values = array_map(fn ($x) => $x === 'old' ? '< tahun ini' : $x, (array) $v);
            return "{$k}=" . implode('/', $values);
        });
        return ' | Filter: ' . $parts->implode(', ');
    }

    private function cell(int $col, int $row): string
    {
        return Coordinate::stringFromColumnIndex($col) . $row;
    }
}
