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
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
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

    public function test_menolak_file_tanpa_sheet_data_edk(): void
    {
        $ss = new Spreadsheet();
        $ss->getActiveSheet()->setTitle('Sheet1')->fromArray([
            self::HEADERS,
            ['S1', 'A', 'AM1', 'DGS', '202611', 'LANJUT', 'COMPLETE', 1, 1000],
        ]);
        $path = tempnam(sys_get_temp_dir(), 'edk') . '.xlsx';
        (new Xlsx($ss))->save($path);

        $res = $this->upload(new UploadedFile($path, 'wrong-sheet.xlsx', null, null, true));

        $res->assertStatus(422)
            ->assertJsonPath('errors.0.row', 1)
            ->assertJsonPath('errors.0.messages.0', 'Sheet wajib tidak ada: DATA_EDK');
        $this->assertSame(0, EdkRecord::count());
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
        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202610','LANJUT','COMPLETE',1,1000],
        ]), '2026-10-26');
        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
        ]), '2026-11-02');
        $first = EdkUpload::orderBy('id')->first();

        $this->postJson("/api/edk/uploads/{$first->id}/activate")->assertOk();
        $this->assertTrue($first->fresh()->is_active);
        $this->assertSame(1, EdkUpload::where('is_active', true)->count());
    }

    public function test_menolak_upload_file_yang_sama(): void
    {
        $file = $this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
        ]);

        $this->upload($file, '2026-11-02')->assertCreated();

        $duplicate = $this->upload(
            new UploadedFile($file->getRealPath(), 'duplicate.xlsx', null, null, true),
            '2026-11-09'
        );

        $duplicate->assertStatus(422)
            ->assertJsonPath('errors.0.row', 0)
            ->assertJsonPath('errors.0.messages.0', 'File yang sama sudah pernah diunggah dan tidak diproses ulang.');
        $this->assertSame(1, EdkUpload::count());
        $this->assertSame(1, EdkRecord::count());
    }

    public function test_upload_bulan_sama_membuat_snapshot_baru_tanpa_menggandakan_record(): void
    {
        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
        ]), '2026-11-02')->assertCreated();

        $this->upload($this->makeXlsx([
            ['S2','B','AM1','DGS','202611','LANJUT','COMPLETE',1,2000],
        ]), '2026-11-02')->assertCreated();

        $this->assertSame(2, EdkUpload::count());
        $this->assertSame(2, EdkRecord::count());
        $this->assertSame(1, EdkUpload::where('is_active', true)->count());
        $this->assertSame(1, EdkUpload::active()->first()->records()->count());
    }

    public function test_upload_invalid_menjaga_populasi_aktif_dan_records_lama(): void
    {
        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
        ]), '2026-11-02')->assertCreated();

        $activeId = EdkUpload::active()->value('id');

        $this->upload($this->makeXlsx([
            ['S2','B','AM1','INVALID_SEGMENT','202611','LANJUT','COMPLETE',1,2000],
        ]), '2026-11-09')->assertStatus(422);

        $this->assertSame($activeId, EdkUpload::active()->value('id'));
        $this->assertSame(1, EdkRecord::count());
        $this->assertSame(2, EdkUpload::count());
        $this->assertSame('failed', EdkUpload::whereKey(2)->value('status'));
    }

    public function test_upload_valid_terdaftar_dan_options_populasi_dapat_dibaca(): void
    {
        $this->upload($this->makeXlsx([
            ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000],
        ]), '2026-11-02')->assertCreated();

        $upload = EdkUpload::active()->first();
        $this->getJson('/api/edk/uploads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $upload->id)
            ->assertJsonPath('data.0.status', 'done');

        $this->getJson("/api/edk/options?upload_id={$upload->id}")
            ->assertOk()
            ->assertJsonPath('upload_id', $upload->id)
            ->assertJsonPath('segmen.0', 'DGS');
    }

    public function test_daftar_populasi_mencakup_sukses_di_luar_20_riwayat_terbaru(): void
    {
        foreach (range(1, 24) as $i) {
            EdkUpload::create([
                'report_date' => now()->subDays($i)->toDateString(),
                'original_name' => "population-{$i}.xlsx",
                'file_path' => "edk-uploads/population-{$i}.xlsx",
                'status' => 'done',
                'is_active' => $i === 1,
                'total_rows' => 1,
            ]);
        }
        EdkUpload::create([
            'report_date' => now()->toDateString(),
            'original_name' => 'failed.xlsx',
            'file_path' => 'edk-uploads/failed.xlsx',
            'status' => 'failed',
            'is_active' => false,
            'total_rows' => 0,
        ]);

        $this->getJson('/api/edk/populations')
            ->assertOk()
            ->assertJsonCount(24)
            ->assertJsonPath('0.status', 'done');
    }

    public function test_daftar_populasi_mengikuti_urutan_riwayat_dan_mempertahankan_versi_bulan_sama(): void
    {
        $older = EdkUpload::create([
            'report_date' => '2026-11-02',
            'original_name' => 'november-v1.xlsx',
            'file_path' => 'edk-uploads/november-v1.xlsx',
            'status' => 'done',
            'is_active' => false,
            'total_rows' => 10,
        ]);
        $newer = EdkUpload::create([
            'report_date' => '2026-11-02',
            'original_name' => 'november-v2.xlsx',
            'file_path' => 'edk-uploads/november-v2.xlsx',
            'status' => 'done',
            'is_active' => true,
            'total_rows' => 12,
        ]);

        $this->getJson('/api/edk/populations')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $newer->id)
            ->assertJsonPath('0.is_active', true)
            ->assertJsonPath('1.id', $older->id)
            ->assertJsonPath('1.is_active', false);

        $this->getJson('/api/edk/uploads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id);
    }

    public function test_download_template_selalu_memakai_template_edk_9_kolom_resmi(): void
    {
        $this->get('/api/edk/template')
            ->assertOk()
            ->assertDownload('Template_Import_EDK_Monitoring_SOLO_JT_Okt2026_9kolom.xlsx');

        $this->get('/api/edk/template?month=202609')
            ->assertOk()
            ->assertDownload('Template_Import_EDK_Monitoring_SOLO_JT_Okt2026_9kolom.xlsx');
    }
}
