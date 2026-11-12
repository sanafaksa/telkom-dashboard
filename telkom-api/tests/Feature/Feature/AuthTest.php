<?php

namespace Tests\Feature;

use App\Models\EdkUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'admin'): User
    {
        return User::factory()->create([
            'email'    => 'a@telkom.co.id',
            'nik'      => '123456',
            'password' => Hash::make('rahasia123'),
            'role'     => $role,
        ]);
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
            'login'                 => 'a@telkom.co.id',
            'password'              => 'rahasia123',
            'cf-turnstile-response' => 'dummy-token',
        ], $body));
    }

    public function test_login_pakai_email_atau_nik(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        $this->login(['login' => 'a@telkom.co.id'])
            ->assertOk()
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'name', 'email', 'nik', 'role']])
            ->assertJsonPath('user.role', 'admin');

        $this->login(['login' => '123456'])
            ->assertOk();
    }

    public function test_password_salah_ditolak(): void
    {
        $this->fakeTurnstile();
        $this->makeUser();

        $this->login(['password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('login');
    }

    public function test_turnstile_gagal_ditolak(): void
    {
        $this->fakeTurnstile(false);
        $this->makeUser();

        $this->login()
            ->assertStatus(422)
            ->assertJsonValidationErrors('login');
    }

    public function test_turnstile_wajib_diisi(): void
    {
        $this->makeUser();

        $this->postJson('/api/auth/login', [
            'login'    => 'a@telkom.co.id',
            'password' => 'rahasia123',
        ])->assertStatus(422)
          ->assertJsonValidationErrors('cf-turnstile-response');
    }

    public function test_endpoint_edk_wajib_login(): void
    {
        $this->getJson('/api/edk/summary/segmen')->assertUnauthorized();
        $this->getJson('/api/edk/uploads')->assertUnauthorized();
    }

    public function test_viewer_tidak_boleh_upload_dan_rollback(): void
    {
        Sanctum::actingAs($this->makeUser('viewer'));

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
