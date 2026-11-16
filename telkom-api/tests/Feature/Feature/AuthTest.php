<?php

namespace Tests\Feature;

use App\Models\EdkUpload;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'admin', array $extra = []): User
    {
        return User::factory()->create(array_merge([
            'email'    => 'a@telkom.co.id',
            'nip'      => '123456',
            'password' => Hash::make('rahasia123'),
            'role'     => $role,
        ], $extra));
    }

    /** Simulasikan respons siteverify dari Cloudflare. */
    private function fakeTurnstile(bool $success = true): void
    {
        Http::fake([
            'challenges.cloudflare.com/*' => Http::response(['success' => $success]),
        ]);
    }

    /** Kirim request login lengkap dengan token Turnstile. */
    private function login(array $body = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/auth/login', array_merge([
            'nip'                   => '123456',
            'password'              => 'rahasia123',
            'cf-turnstile-response' => 'dummy-token',
        ], $body));
    }

    public function test_login_pakai_nip(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        $this->login()
            ->assertOk()
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'name', 'email', 'nip', 'role', 'role_label', 'permissions']])
            ->assertJsonPath('user.role', 'admin');

        $this->assertNotNull(User::first()->last_login_at);
    }

    public function test_login_pakai_email_tidak_lagi_diterima(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        $this->login(['nip' => 'a@telkom.co.id'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nip');
    }

    public function test_password_salah_ditolak(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        $this->login(['password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nip');
    }

    public function test_akun_nonaktif_tidak_bisa_login(): void
    {
        $this->fakeTurnstile();
        $this->makeUser('staff', ['is_active' => false]);

        $this->login()->assertStatus(422)->assertJsonValidationErrors('nip');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_token_akun_yang_dinonaktifkan_langsung_ditolak(): void
    {
        $this->fakeTurnstile();
        $user  = $this->makeUser('staff');
        $token = $this->login()->json('token');

        $this->withToken($token)->getJson('/api/auth/me')->assertOk();

        $user->forceFill(['is_active' => false])->save();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_login_dibatasi_rate_limit(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        for ($i = 0; $i < 5; $i++) {
            $this->login(['password' => 'salah'])->assertStatus(422);
        }

        $this->login(['password' => 'salah'])->assertStatus(429);
    }

    public function test_durasi_sesi_mengikuti_authentication_settings(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();
        Settings::put(['session_idle_minutes' => 30]);

        $expires = $this->login()->assertOk()->json('expires_at');

        $this->assertEqualsWithDelta(now()->addMinutes(30)->timestamp, strtotime($expires), 5);
    }

    public function test_mode_pemeliharaan_hanya_meloloskan_super_admin(): void
    {
        $this->fakeTurnstile();
        Settings::put(['maintenance_mode' => true]);

        $this->makeUser('admin');
        $this->login()->assertStatus(422);

        User::factory()->create(['nip' => '999', 'password' => Hash::make('rahasia123'), 'role' => 'super_admin']);
        $this->login(['nip' => '999'])->assertOk();
    }

    public function test_turnstile_gagal_ditolak(): void
    {
        $this->fakeTurnstile(false);
        $this->makeUser();

        $this->login()
            ->assertStatus(422)
            ->assertJsonValidationErrors('nip');
    }

    public function test_turnstile_wajib_diisi(): void
    {
        $this->makeUser();

        $this->postJson('/api/auth/login', [
            'nip'      => '123456',
            'password' => 'rahasia123',
        ])->assertStatus(422)
          ->assertJsonValidationErrors('cf-turnstile-response');
    }

    public function test_endpoint_wajib_login(): void
    {
        $this->getJson('/api/edk/summary/segmen')->assertUnauthorized();
        $this->getJson('/api/edk/uploads')->assertUnauthorized();
        $this->getJson('/api/kuadran')->assertUnauthorized();
        $this->postJson('/api/kuadran/sync', [])->assertUnauthorized();
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_user_biasa_tidak_boleh_upload_dan_rollback(): void
    {
        Sanctum::actingAs($this->makeUser('user'), ['*']);

        $upload = EdkUpload::create([
            'report_date'   => '2026-11-02',
            'original_name' => 'x.xlsx',
            'file_path'     => 'edk-uploads/x.xlsx',
            'status'        => 'done',
        ]);

        $this->postJson('/api/edk/uploads', [])->assertForbidden();
        $this->postJson("/api/edk/uploads/{$upload->id}/activate")->assertForbidden();
        $this->getJson('/api/edk/uploads')->assertOk();   // lihat riwayat tetap boleh
    }

    public function test_logout_menghapus_token(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        $token = $this->login()->json('token');

        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
