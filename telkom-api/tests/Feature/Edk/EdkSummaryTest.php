<?php

namespace Tests\Feature\Edk;

use App\Models\EdkUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class EdkSummaryTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = ['SID','NAMA_PELANGGAN','NAMA_AM','NAMA_CC','SEGMEN','WITEL','PERIODE_EDK','STATUS_UTAMA','STATUS_DETAIL','ORDER','ABONEMEN'];

    private const ROWS = [
        ['S1','Pemkot A','AM1','CC1','DGS','SOLO JT', '202512','LANJUT',       'COMPLETE',    2, 1000],
        ['S2','Pemkot A','AM1','CC1','DGS','SOLO JT', '202611','LANJUT',       'IN_PROGRESS', 1,  500],
        ['S3','RS B',    'AM2','CC2','DPS','SOLO JT', '202611','TIDAK_LANJUT', 'COMPLETE',    1, -200],
        ['S4','Toko C',  'AM3',null, 'RBS','SEMARANG','202610','KONFIRMASI_AM','AUTO_RENEWAL',3,  300],
    ];  // total order 7, total abonemen 1600

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->uploadRows(self::ROWS, '2026-11-02');
    }

    private function uploadRows(array $rows, string $date): void
    {
        $ss = new Spreadsheet();
        $ss->getActiveSheet()->setTitle('DATA_EDK')->fromArray([self::HEADERS, ...$rows]);
        $path = tempnam(sys_get_temp_dir(), 'edk') . '.xlsx';
        (new Xlsx($ss))->save($path);

        $this->postJson('/api/edk/uploads', [
            'file'        => new UploadedFile($path, 'test.xlsx', null, null, true),
            'report_date' => $date,
        ])->assertCreated();
    }

    public function test_total_order_identik_di_4_tab(): void
    {
        foreach (['segmen', 'periode', 'am', 'cc'] as $by) {
            $res = $this->getJson("/api/edk/summary/{$by}")->assertOk();
            $this->assertSame(7, collect($res->json('rows'))->sum('total_order'), "tab {$by}");
            $this->assertSame(7, $res->json('total.total_order'), "total {$by}");
        }
    }

    public function test_kategori_kolom_dan_bukan_witel(): void
    {
        $rows = collect($this->getJson('/api/edk/summary/segmen')->json('rows'))->keyBy('key');

        $this->assertSame(2, $rows['DGS']['lanjut_complete_order']);
        $this->assertEquals(1000, $rows['DGS']['lanjut_complete_abonemen']);
        $this->assertSame(1, $rows['DGS']['lanjut_in_progress_order']);
        $this->assertEquals(-200, $rows['DPS']['tidak_lanjut_complete_abonemen']);
        $this->assertSame(3, $rows['RBS']['bukan_witel_order']);
        $this->assertSame(0, $rows['RBS']['konfirmasi_am_auto_renewal_order']);   // non-Solo tidak masuk kategori
    }

    public function test_bucket_periode_lama_paling_atas(): void
    {
        $rows = $this->getJson('/api/edk/summary/periode')->json('rows');

        $this->assertSame(['< 2026', '202610', '202611'], array_column($rows, 'label'));
        $this->assertSame('old', $rows[0]['key']);
    }

    public function test_filter_segmen_dan_periode_old(): void
    {
        $rows = $this->getJson('/api/edk/summary/am?segmen=dgs&periode=old')->json('rows');

        $this->assertCount(1, $rows);
        $this->assertSame('AM1', $rows[0]['key']);
        $this->assertSame('DGS', $rows[0]['segmen']);
        $this->assertSame(2, $rows[0]['total_order']);
    }

    public function test_filter_multi_nilai_dipisah_koma(): void
    {
        $rows = $this->getJson('/api/edk/summary/segmen?segmen=DGS,DPS')->json('rows');
        $this->assertSame(['DGS', 'DPS'], array_column($rows, 'key'));

        $rows = $this->getJson('/api/edk/summary/periode?periode=old,202610')->json('rows');
        $this->assertSame(['< 2026', '202610'], array_column($rows, 'label'));
    }

    public function test_cards_delta_vs_snapshot_sebelumnya(): void
    {
        $this->assertNull($this->getJson('/api/edk/cards')->json('total_abonemen.delta_pct'));

        $rows = self::ROWS;
        $rows[1][10] = 1000;                         // S2: 500 → 1000, total 1600 → 2100
        $this->uploadRows($rows, '2026-11-09');

        $res = $this->getJson('/api/edk/cards')->assertOk();
        $this->assertEquals(2100, $res->json('total_abonemen.value'));
        $this->assertEquals(31.25, $res->json('total_abonemen.delta_pct'));
        $this->assertSame('2026-11-02', $res->json('compared_to'));
        $this->assertSame(1, $res->json('in_progress.value'));
        $this->assertEquals(14.29, $res->json('in_progress.pct_of_total'));
    }

    public function test_top_customers_urut_abonemen(): void
    {
        $res = $this->getJson('/api/edk/top-customers?limit=2')->assertOk();

        $this->assertSame(['Pemkot A', 'Toko C'], array_column($res->json('rows'), 'nama_pelanggan'));
        $this->assertEquals(1800, $res->json('total_abonemen'));
    }

    public function test_top_customers_mendukung_status_progress_dan_grouping_pelanggan(): void
    {
        $res = $this->getJson('/api/edk/top-customers?status=lanjut&progress=all&limit=10')->assertOk();

        $this->assertSame('lanjut', $res->json('status'));
        $this->assertSame('all', $res->json('progress'));
        $this->assertSame(['Pemkot A'], array_column($res->json('rows'), 'nama_pelanggan'));
        $this->assertSame(3, $res->json('rows.0.total_order'));
        $this->assertEquals(1500, $res->json('rows.0.total_abonemen'));
        $this->assertSame('DGS', $res->json('rows.0.segmen'));
        $this->assertSame('AM1', $res->json('rows.0.nama_am'));
        $this->assertSame(1, $res->json('total_results'));
        $this->assertSame(10, $res->json('top_limit'));
        $this->assertSame(1, $res->json('returned_results'));
        $this->assertSame(1, $res->json('pagination.total_results'));
        $this->assertSame(1, $res->json('pagination.returned'));
    }

    public function test_filter_progress_tidak_bocor_ke_status_lain(): void
    {
        $res = $this->getJson('/api/edk/top-customers?status=tidak_lanjut&progress=complete')->assertOk();

        $this->assertSame(['RS B'], array_column($res->json('rows'), 'nama_pelanggan'));
        $this->assertSame(1, $res->json('rows.0.total_order'));
        $this->assertEquals(-200, $res->json('rows.0.total_abonemen'));
    }

    public function test_pencarian_pelanggan_diterapkan_sebelum_ranking_top10(): void
    {
        $res = $this->getJson('/api/edk/top-customers?status=lanjut&q=Pemkot&limit=10')->assertOk();

        $this->assertSame(['Pemkot A'], array_column($res->json('rows'), 'nama_pelanggan'));
        $this->assertEquals(1500, $res->json('total_abonemen'));
    }

    public function test_upload_id_mengisolasi_populasi_yang_dibaca_semua_tab(): void
    {
        $september = EdkUpload::active()->first();
        $rows = self::ROWS;
        $rows[0][10] = 9000;
        $this->uploadRows($rows, '2026-11-09');
        $oktober = EdkUpload::active()->first();

        $this->assertNotSame($september->id, $oktober->id);

        $septemberResponse = $this->getJson("/api/edk/summary/segmen?upload_id={$september->id}")->assertOk();
        $oktoberResponse = $this->getJson("/api/edk/summary/segmen?upload_id={$oktober->id}")->assertOk();

        $this->assertSame($september->id, $septemberResponse->json('upload_id'));
        $this->assertSame($oktober->id, $oktoberResponse->json('upload_id'));
        $this->assertEquals(1600, $septemberResponse->json('total.total_abonemen'));
        $this->assertEquals(9600, $oktoberResponse->json('total.total_abonemen'));
    }

    public function test_status_bukan_witel_menggunakan_filter_progress_tersendiri(): void
    {
        $rows = self::ROWS;
        $rows[] = ['S5','Non Solo Customer','AM4','CC4','DGS','SEMARANG','202611','LANJUT','COMPLETE',2,700];
        $this->uploadRows($rows, '2026-11-09');

        $res = $this->getJson('/api/edk/top-customers?status=bukan_witel_solo_jt&progress=complete')->assertOk();

        $this->assertSame(['Non Solo Customer'], array_column($res->json('rows'), 'nama_pelanggan'));
        $this->assertSame(2, $res->json('rows.0.total_order'));
        $this->assertEquals(700, $res->json('rows.0.total_abonemen'));
    }

    public function test_detail_pelanggan_mengikuti_scope_status_dan_populasi(): void
    {
        $res = $this->getJson('/api/edk/top-customers/detail?customer_key=Pemkot%20A&status=lanjut&progress=complete')
            ->assertOk();

        $this->assertSame('Pemkot A', $res->json('customer_key'));
        $this->assertCount(1, $res->json('rows'));
        $this->assertSame('S1', $res->json('rows.0.sid'));

        $this->getJson('/api/edk/top-customers/detail?customer_key=Pemkot%20A&status=tidak_lanjut&progress=complete')
            ->assertOk()
            ->assertJsonCount(0, 'rows');
    }

    public function test_options_dan_404_tanpa_snapshot(): void
    {
        $opt = $this->getJson('/api/edk/options')->assertOk();
        $this->assertSame('old', $opt->json('periode.0.value'));
        $this->assertSame(['DGS', 'DPS', 'RBS'], $opt->json('segmen'));

        EdkUpload::query()->update(['is_active' => false]);
        $this->getJson('/api/edk/summary/segmen')->assertNotFound();
    }

    public function test_group_by_tidak_valid_ditolak(): void
    {
        $this->getJson('/api/edk/summary/nama_pelanggan')->assertNotFound();
    }
}
