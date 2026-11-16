<?php

namespace Tests\Feature;

use App\Models\MomActionPlan;
use App\Models\User;
use App\Services\BackupService;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Fitur khusus Super Admin benar-benar bekerja (bukan sekadar menu). */
class SystemAdminTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();

        $this->super = User::factory()->create(['role' => 'super_admin', 'password' => Hash::make('Rahasia123')]);
        Sanctum::actingAs($this->super, ['*']);
    }

    protected function tearDown(): void
    {
        $dir = app(BackupService::class)->directory();
        array_map('unlink', glob($dir . '/backup-*.json.gz') ?: []);

        parent::tearDown();
    }

    public function test_settings_tersimpan_dan_tercatat(): void
    {
        $this->putJson('/api/admin/settings/auth', [
            'session_idle_minutes' => 20, 'login_max_attempts' => 3,
            'password_min_length' => 12, 'single_session' => true,
        ])->assertOk();

        $this->assertSame(20, Settings::get('session_idle_minutes'));
        $this->assertTrue(Settings::get('single_session'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.updated']);

        // Panjang minimal password langsung berlaku.
        $this->postJson('/api/admin/users', ['name' => 'A', 'nip' => '71001', 'role' => 'user', 'password' => 'Pendek123'])
            ->assertStatus(422)->assertJsonValidationErrors('password');

        $this->putJson('/api/admin/settings/auth', ['session_idle_minutes' => 9999])->assertStatus(422);
    }

    public function test_pengumuman_muncul_di_payload_user(): void
    {
        $this->putJson('/api/admin/settings/general', ['announcement' => 'Maintenance Sabtu 22.00', 'maintenance_mode' => false])->assertOk();

        $this->getJson('/api/auth/me')->assertJsonPath('announcement', 'Maintenance Sabtu 22.00');
    }

    public function test_password_smtp_dienkripsi_dan_tidak_dikembalikan(): void
    {
        $this->putJson('/api/admin/settings/mail', ['mail_mailer' => 'smtp', 'mail_host' => 'smtp.test', 'mail_password' => 'rahasia-smtp'])
            ->assertOk()
            ->assertJsonMissing(['value' => 'rahasia-smtp']);

        $stored = DB::table('system_settings')->where('key', 'mail_password')->value('value');
        $this->assertNotSame('rahasia-smtp', $stored);
        $this->assertSame('rahasia-smtp', Settings::get('mail_password'));

        // Mengirim form tanpa password tidak menghapus password lama.
        $this->putJson('/api/admin/settings/mail', ['mail_mailer' => 'smtp', 'mail_password' => ''])->assertOk();
        $this->assertSame('rahasia-smtp', Settings::get('mail_password'));
    }

    public function test_email_uji(): void
    {
        Mail::fake();

        $this->postJson('/api/admin/settings/mail/test', ['to' => 'cek@telkom.co.id'])->assertOk();
        $this->postJson('/api/admin/settings/mail/test', ['to' => 'bukan-email'])->assertStatus(422);
    }

    public function test_api_key_hanya_bisa_scope_yang_diberikan(): void
    {
        $this->postJson('/api/admin/api-keys', ['label' => 'Bot', 'abilities' => ['users.view']])->assertStatus(422);

        $token = $this->postJson('/api/admin/api-keys', ['label' => 'Integrasi BI', 'abilities' => ['edk.view'], 'expires_days' => 30])
            ->assertCreated()->json('token');

        $this->getJson('/api/admin/api-keys')->assertOk()->assertJsonPath('keys.0.label', 'Integrasi BI');

        // Pakai API key sungguhan (bukan token sesi).
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/edk/uploads')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/kuadran')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/admin/users')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/edk/uploads', [])->assertForbidden();
    }

    public function test_sesi_bisa_dicabut_dari_security_center(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $id    = $staff->createToken(User::SESSION_TOKEN)->accessToken->id;

        $this->getJson('/api/admin/security/sessions')->assertOk()->assertJsonPath('sessions.0.user.id', $staff->id);
        $this->deleteJson("/api/admin/security/sessions/{$id}")->assertOk();

        $this->assertSame(0, $staff->tokens()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'session.revoked']);
        $this->getJson('/api/admin/security/overview')->assertOk()->assertJsonPath('active_super_admins', 1);
    }

    public function test_database_monitoring_dan_dev_tools(): void
    {
        $this->getJson('/api/admin/database')->assertOk()->assertJsonStructure(['driver', 'tables' => [['name', 'rows']], 'migrations', 'pending']);

        // Kolom sensitif disamarkan.
        $row = $this->getJson('/api/admin/database/tables/users')->assertOk()->json('rows.0');
        $this->assertSame('••••••', $row['password']);
        $this->getJson('/api/admin/database/tables/tidak_ada')->assertNotFound();

        $this->getJson('/api/admin/monitoring')->assertOk()->assertJsonPath('checks.0.ok', true);
        $this->getJson('/api/admin/dev')->assertOk()->assertJsonStructure(['actions', 'routes', 'log' => ['size', 'lines']]);
        $this->postJson('/api/admin/dev/actions/rm_rf')->assertNotFound();
        $this->assertDatabaseMissing('audit_logs', ['action' => 'dev.action']);

        $staff = User::factory()->create(['role' => 'staff']);
        $staff->createToken(User::SESSION_TOKEN, ['*'], now()->subHour());
        $staff->createToken(User::SESSION_TOKEN, ['*'], now()->addHour());
        $this->postJson('/api/admin/dev/actions/prune_tokens')->assertOk();
        $this->assertSame(1, $staff->tokens()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'dev.action']);
    }

    public function test_backup_dan_restore(): void
    {
        MomActionPlan::create(['no' => '1', 'agenda' => 'ASLI', 'action_plan' => 'Rencana', 'status' => 'OPEN']);

        $name = $this->postJson('/api/admin/backups', ['note' => 'uji'])->assertCreated()->json('name');
        $this->getJson('/api/admin/backups')->assertOk()->assertJsonPath('backups.0.name', $name);
        $this->get("/api/admin/backups/{$name}/download")->assertOk();

        // Data berubah setelah backup.
        MomActionPlan::query()->update(['agenda' => 'BERUBAH']);
        User::factory()->create(['role' => 'staff', 'nip' => 'baru-1']);

        // Tanpa password / konfirmasi yang benar → ditolak.
        $this->postJson("/api/admin/backups/{$name}/restore", ['password' => 'salah', 'confirm' => $name])->assertStatus(422);
        $this->postJson("/api/admin/backups/{$name}/restore", ['password' => 'Rahasia123', 'confirm' => 'ya'])->assertStatus(422);
        $this->assertSame('BERUBAH', MomActionPlan::first()->agenda);

        $this->postJson("/api/admin/backups/{$name}/restore", ['password' => 'Rahasia123', 'confirm' => $name])->assertOk();

        $this->assertSame('ASLI', MomActionPlan::first()->agenda);
        $this->assertDatabaseMissing('users', ['nip' => 'baru-1']);
        $this->assertDatabaseHas('users', ['id' => $this->super->id, 'role' => 'super_admin']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.restored']);

        // Backup pengaman dibuat otomatis; nama file tidak bisa dipakai untuk path traversal.
        $this->assertCount(2, app(BackupService::class)->list());
        $this->deleteJson('/api/admin/backups/..%2F..%2F.env')->assertNotFound();
        $this->deleteJson("/api/admin/backups/{$name}")->assertOk();
    }
}
