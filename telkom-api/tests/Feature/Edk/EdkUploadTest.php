<?php

namespace Tests\Feature\Edk;

use App\Models\EdkRecord;
use App\Models\EdkUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class EdkUploadTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = ['SID','NAMA_PELANGGAN','NAMA_AM','SEGMEN','PERIODE_EDK','STATUS_UTAMA','STATUS_DETAIL','ORDER','ABONEMEN'];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Sanctum::actingAs(User::factory()->create());
    }

    private function upload(UploadedFile $file, string $date = '2026-11-02')
    {
        return $this->postJson('/api/edk/uploads', ['file' => $file, 'report_date' => $date]);
    }

    private function dummy(): UploadedFile
    {
        return new UploadedFile(base_path('tests/Fixtures/edk_dummy.xlsx'), 'edk_dummy.xlsx', null, null, true);
    }

    private function makeXlsx(array $rows): UploadedFile
    {
        $ss = new Spreadsheet();
        $ss->getActiveSheet()->setTitle('DATA_EDK')->fromArray([self::HEADERS, ...$rows]);
        $path = tempnam(sys_get_temp_dir(), 'edk') . '.xlsx';
        (new Xlsx($ss))->save($path);
        return new UploadedFile($path, 'test.xlsx', null, null, true);
    }

    public function test_upload_dummy_berhasil_semua_new(): void
    {
        $this->upload($this->dummy())->assertCreated();

        $this->assertSame(24, EdkRecord::count());
        $this->assertSame(24, EdkRecord::where('flag', 'NEW')->count());
        $this->assertTrue(EdkUpload::first()->is_active);
    }

    public function test_upload_kedua_flag_unchanged_dan_updated(): void
    {
        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
            ['S2','B','AM1','DGS','202611','LANJUT','IN_PROGRESS',1,2000],
        ]), '2026-10-26')->assertCreated();

        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],   // sama
            ['S2','B','AM1','DGS','202611','LANJUT','COMPLETE',1,2000],   // status berubah
            ['S3','C','AM2','DPS','202611','KONFIRMASI_AM','AUTO_RENEWAL',1,-500],
        ]), '2026-11-02')->assertCreated();

        $active = EdkUpload::active()->first();
        $flags  = $active->records()->orderBy('sid')->pluck('flag', 'sid');
        $this->assertSame(['S1' => 'UNCHANGED', 'S2' => 'UPDATED', 'S3' => 'NEW'], $flags->all());
        $this->assertSame(1, EdkUpload::where('is_active', true)->count());
    }

        public function test_tolak_format_salah_status_dan_periode(): void
    {
        $res = $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
            ['S2','B','AM1','DGS','202611','LANJUT','AUTO_RENEWAL',1,1000], // baris 3 kombinasi salah
            ['S3','C','AM1','DGS','20261','LANJUT','COMPLETE',1,1000],      // baris 4 periode salah
            ['S4','D','AM1','XYZ','202611','LANJUT','COMPLETE',1,'abc'],    // baris 5 segmen & abonemen salah
        ]));

        $res->assertStatus(422)->assertJsonPath('total_errors', 3);
        $this->assertSame([3, 4, 5], array_column($res->json('errors'), 'row'));
        $this->assertSame(0, EdkRecord::count());                         // all-or-nothing
        $this->assertSame('failed', EdkUpload::first()->status);
    }

    public function test_kolom_kosong_boleh_dan_duplikat_tetap_masuk(): void
    {
        $this->upload($this->makeXlsx([
            ['S1', 'A', 'AM1', 'DGS', '202611', 'LANJUT', 'COMPLETE', 1, 1000],
            ['S1', 'A', 'AM1', 'DGS', '202611', 'LANJUT', 'COMPLETE', 1, 1000],      // dobel → S1|202611#2
            ['S2', null, null, null, null, null, null, null, null],                 // hampir semua kosong
            [null, 'Tanpa SID', 'AM2', 'DPS', '202610', 'LANJUT', 'IN_PROGRESS', 2, 500],
        ]))->assertCreated();

        $this->assertSame(4, EdkRecord::count());
        $this->assertSame(
            ['ROW5', 'S1|202611', 'S1|202611#2', 'S2|'],
            EdkRecord::orderBy('row_key')->pluck('row_key')->all()
        );

        $empty = EdkRecord::where('sid', 'S2')->first();
        $this->assertNull($empty->nama_pelanggan);
        $this->assertSame(1, $empty->order_qty);      // ORDER kosong → 1
        $this->assertEquals(0, $empty->abonemen);     // ABONEMEN kosong → 0
    }

    public function test_activate_rollback(): void
    {
        $this->upload($this->dummy(), '2026-10-26');
        $this->upload($this->dummy(), '2026-11-02');
        $first = EdkUpload::orderBy('id')->first();

        $this->postJson("/api/edk/uploads/{$first->id}/activate")->assertOk();
        $this->assertTrue($first->fresh()->is_active);
        $this->assertSame(1, EdkUpload::where('is_active', true)->count());
    }
}
