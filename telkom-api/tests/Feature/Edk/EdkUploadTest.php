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

    public function test_tolak_duplikat_status_invalid_dan_periode_salah(): void
    {
        $res = $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],     // baris 3 duplikat
            ['S2','B','AM1','DGS','202611','LANJUT','AUTO_RENEWAL',1,1000], // baris 4 kombinasi salah
            ['S3','C','AM1','DGS','20261','LANJUT','COMPLETE',1,1000],      // baris 5 periode salah
        ]));

        $res->assertStatus(422)->assertJsonPath('total_errors', 3);
        $this->assertSame([3, 4, 5], array_column($res->json('errors'), 'row'));
        $this->assertSame(0, EdkRecord::count());                         // all-or-nothing
        $this->assertSame('failed', EdkUpload::first()->status);
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
