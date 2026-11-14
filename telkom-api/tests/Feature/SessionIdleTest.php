<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class SessionIdleTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_memberi_masa_idle_sesuai_konfigurasi(): void
    {
        $user = User::factory()->create(['password' => bcrypt('rahasia-123')]);
        $this->withoutMiddleware(); // lewati verifikasi Turnstile di tes ini
        $this->mockTurnstile();

        $res = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'rahasia-123',
            'cf-turnstile-response' => 'ok',
        ])->assertOk();

        $expires = now()->parse($res->json('expires_at'));
        $this->assertTrue($expires->between(now()->addMinutes(14), now()->addMinutes(16)));
    }

    public function test_token_yang_diam_melewati_idle_ditolak(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('dashboard', ['*'], now()->subMinute());

        $this->withHeader('Authorization', 'Bearer '.$token->plainTextToken)
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_request_aktif_memperpanjang_masa_idle(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('dashboard', ['*'], now()->addMinutes(2));

        $this->withHeader('Authorization', 'Bearer '.$token->plainTextToken)
            ->getJson('/api/auth/me')
            ->assertOk();

        $fresh = PersonalAccessToken::find($token->accessToken->id);
        $this->assertTrue($fresh->expires_at->gt(now()->addMinutes(10)));
    }

    private function mockTurnstile(): void
    {
        \Illuminate\Support\Facades\Http::fake([
            'challenges.cloudflare.com/*' => \Illuminate\Support\Facades\Http::response(['success' => true]),
        ]);
    }
}
