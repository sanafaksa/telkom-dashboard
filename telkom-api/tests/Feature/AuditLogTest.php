<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\EdkUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = ['SID','NAMA_PELANGGAN','NAMA_AM','SEGMEN','PERIODE_EDK','STATUS_UTAMA','STATUS_DETAIL','ORDER','ABONEMEN'];

    private function xlsx(array $row): UploadedFile
    {
        $ss = new Spreadsheet();
        $ss->getActiveSheet()->setTitle('DATA_EDK')->fromArray([self::HEADERS, $row]);
        $path = tempnam(sys_get_temp_dir(), 'edk') . '.xlsx';
        (new Xlsx($ss))->save($path);

        return new UploadedFile($path, 'test.xlsx', null, null, true);
    }

    private function upload(array $row, string $date)
    {
        return $this->postJson('/api/edk/uploads', ['file' => $this->xlsx($row), 'report_date' => $date]);
    }

    private function admin(): User
    {
        return User::factory()->create([
            'email'    => 'admin@telkom.co.id',
            'password' => Hash::make('rahasia123'),
            'role'     => 'admin',
        ]);
    }

    public function test_login_berhasil_dan_gagal_tercatat(): void
    {
        $admin = $this->admin();

        $this->postJson('/api/auth/login', ['login' => 'admin@telkom.co.id', 'password' => 'rahasia123'])->assertOk();
        $this->postJson('/api/auth/login', ['login' => 'admin@telkom.co.id', 'password' => 'salah'])->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login', 'user_id' => $admin->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login_failed', 'user_id' => $admin->id]);
        $this->assertStringNotContainsString('salah', (string) AuditLog::where('action', 'auth.login_failed')->value('meta'));
    }

    public function test_upload_dan_aktivasi_tercatat(): void
    {
        Storage::fake('local');
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $row = ['S1','A','AM1','DGS','202611','LANJUT','COMPLETE',1,1000];
        $this->upload($row, '2026-10-26')->assertCreated();
        $this->upload($row, '2026-11-02')->assertCreated();

        $first = EdkUpload::orderBy('id')->first();
        $this->postJson("/api/edk/uploads/{$first->id}/activate")->assertOk();

        $this->assertSame(2, AuditLog::where('action', 'edk.upload')->count());

        $log = AuditLog::where('action', 'edk.activate')->first();
        $this->assertSame($first->id, $log->subject_id);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame($admin->id, $first->fresh()->activated_by);
        $this->assertNotNull($first->fresh()->activated_at);
    }

    public function test_upload_gagal_tercatat(): void
    {
        Storage::fake('local');
        Sanctum::actingAs($this->admin());

        $this->upload(['S1','A','AM1','XYZ','202611','LANJUT','COMPLETE',1,1000], '2026-11-02')->assertStatus(422);

        $log = AuditLog::where('action', 'edk.upload_failed')->first();
        $this->assertNotNull($log);
        $this->assertSame(1, $log->meta['error_count']);
    }

    public function test_hanya_admin_yang_bisa_lihat_log(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'viewer']));
        $this->getJson('/api/audit-logs')->assertForbidden();

        Sanctum::actingAs($this->admin());
        $this->getJson('/api/audit-logs')->assertOk()->assertJsonStructure(['data', 'current_page', 'last_page']);
    }
}
