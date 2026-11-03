<?php

namespace Tests\Feature\Edk;

use App\Models\EdkRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class EdkExportTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = ['SID','NAMA_PELANGGAN','NAMA_AM','NAMA_CC','SEGMEN','WITEL','PERIODE_EDK','STATUS_UTAMA','STATUS_DETAIL','ORDER','ABONEMEN'];

    private const ROWS = [
        ['S1','Pemkot A','AM1','CC1','DGS','SOLO JT', '202512','LANJUT',       'COMPLETE',    2, 1000],
        ['S2','Pemkot A','AM1','CC1','DGS','SOLO JT', '202611','LANJUT',       'IN_PROGRESS', 1,  500],
        ['S3','RS B',    'AM2','CC2','DPS','SOLO JT', '202611','TIDAK_LANJUT', 'COMPLETE',    1, -200],
        ['S4','Toko C',  'AM3',null, 'RBS','SEMARANG','202610','KONFIRMASI_AM','AUTO_RENEWAL',3,  300],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $ss = new Spreadsheet();
        $ss->getActiveSheet()->setTitle('DATA_EDK')->fromArray([self::HEADERS, ...self::ROWS]);
        $path = tempnam(sys_get_temp_dir(), 'edk') . '.xlsx';
        (new Xlsx($ss))->save($path);

        $this->postJson('/api/edk/uploads', [
            'file'        => new UploadedFile($path, 'test.xlsx', null, null, true),
            'report_date' => '2026-11-02',
        ])->assertCreated();
    }

    private function downloadXlsx(string $query): Spreadsheet
    {
        $res = $this->get("/api/edk/export?{$query}")->assertOk();
        return IOFactory::load($res->baseResponse->getFile()->getPathname());
    }

    public function test_xlsx_dua_sheet_dengan_subtotal_dan_total(): void
    {
        $ss = $this->downloadXlsx('by=am&format=xlsx');

        $this->assertSame(['Ringkasan', 'Detail'], $ss->getSheetNames());

        $ws      = $ss->getSheetByName('Ringkasan');
        $lastRow = $ws->getHighestRow();
        $colA    = array_column($ws->rangeToArray("A7:A{$lastRow}"), 0);

        $this->assertContains('Subtotal Segmen DGS', $colA);
        $this->assertSame('WITEL SOLO JT TOTAL', end($colA));

        $totalOrderCol = Coordinate::stringFromColumnIndex(
            Coordinate::columnIndexFromString($ws->getHighestColumn()) - 1
        );
        $this->assertEquals(7, $ws->getCell("{$totalOrderCol}{$lastRow}")->getValue());

        $this->assertSame(5, $ss->getSheetByName('Detail')->getHighestRow());   // header + 4 baris
    }

    public function test_xlsx_ikut_filter(): void
    {
        $detail = $this->downloadXlsx('by=segmen&segmen=DGS')->getSheetByName('Detail');

        $this->assertSame(3, $detail->getHighestRow());                          // header + S1 + S2
        $this->assertSame('202512', $detail->getCell('H2')->getValue());         // periode tetap teks
    }

    public function test_csv_ringkasan(): void
    {
        $res = $this->get('/api/edk/export?by=segmen&format=csv')->assertOk();

        $csv   = ltrim($res->streamedContent(), "\xEF\xBB\xBF");
        $lines = array_values(array_filter(explode("\n", trim($csv))));

        $this->assertStringContainsString('Lanjut Complete Order', $lines[0]);
        $this->assertCount(5, $lines);                                           // header + DGS, DPS, RBS + total
        $this->assertStringStartsWith('"WITEL SOLO JT TOTAL"', end($lines));
    }

    public function test_summary_di_cache_per_snapshot(): void
    {
        $this->assertSame(7, $this->getJson('/api/edk/summary/segmen')->json('total.total_order'));

        EdkRecord::query()->delete();                                            // data berubah di luar alur normal

        $this->assertSame(7, $this->getJson('/api/edk/summary/segmen')->json('total.total_order'));
    }
}
