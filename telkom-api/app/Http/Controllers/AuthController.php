<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'login'                  => 'required|string|max:255',   // email atau NIK
            'password'               => 'required|string',
            'remember'               => 'boolean',
            'cf-turnstile-response'  => 'required|string',
        ]);

        if (!$this->verifyTurnstile($data['cf-turnstile-response'], $request->ip())) {
            throw ValidationException::withMessages([
                'login' => 'Verifikasi keamanan gagal. Silakan coba lagi.',
            ]);
        }

        $field = filter_var($data['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'nik';
        $user  = User::where($field, trim($data['login']))->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            Audit::log('auth.login_failed', null, ['login' => $data['login']], $user);

            throw ValidationException::withMessages([
                'login' => 'Email/NIK atau kata sandi salah.',
            ]);
        }

        $expiresAt = ($data['remember'] ?? false) ? now()->addDays(30) : now()->addHours(12);
        $token     = $user->createToken('dashboard', ['*'], $expiresAt)->plainTextToken;

        Audit::log('auth.login', null, ['remember' => (bool) ($data['remember'] ?? false)], $user);

        return response()->json([
            'token'      => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'user'       => $this->payload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->payload($request->user()));
    }

    public function logout(Request $request)
    {
        Audit::log('auth.logout');

        $token = $request->user()->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    private function verifyTurnstile(string $token, ?string $ip): bool
    {
        $response = Http::asForm()
            ->timeout(10)
            ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret'   => config('services.turnstile.secret'),
                'response' => $token,
                'remoteip' => $ip,
            ]);

        return $response->successful() && $response->json('success') === true;
    }

    private function payload(User $user): array
    {
        return $user->only(['id', 'name', 'email', 'nik', 'role']);
    }
}
