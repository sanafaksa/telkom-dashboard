<?php

namespace Tests\Feature;

use App\Models\EdkUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_login_pakai_email_atau_nik(): void
    {
        $this->makeUser();

        $this->postJson('/api/auth/login', ['login' => 'a@telkom.co.id', 'password' => 'rahasia123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'name', 'email', 'nik', 'role']])
            ->assertJsonPath('user.role', 'admin');

        $this->postJson('/api/auth/login', ['login' => '123456', 'password' => 'rahasia123'])
            ->assertOk();
    }

    public function test_password_salah_ditolak(): void
    {
        $this->makeUser();

        $this->postJson('/api/auth/login', ['login' => 'a@telkom.co.id', 'password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('login');
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
        $this->getJson('/api/edk/uploads')->assertOk();                 // lihat riwayat tetap boleh
    }

    public function test_logout_menghapus_token(): void
    {
        $this->makeUser();
        $token = $this->postJson('/api/auth/login', ['login' => 'a@telkom.co.id', 'password' => 'rahasia123'])
            ->json('token');

        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
