<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use App\Support\Settings;
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
            'nip'                    => 'required|string|max:30',
            'password'               => 'required|string|max:255',
            'remember'               => 'boolean',
            'cf-turnstile-response'  => 'required|string',
        ]);

        if (!$this->verifyTurnstile($data['cf-turnstile-response'], $request->ip())) {
            throw ValidationException::withMessages([
                'nip' => 'Verifikasi keamanan gagal. Silakan coba lagi.',
            ]);
        }

        $nip  = trim($data['nip']);
        $user = User::where('nip', $nip)->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            Audit::log('auth.login_failed', null, ['nip' => $nip], $user);

            throw ValidationException::withMessages([
                'nip' => 'NIP atau kata sandi salah.',
            ]);
        }

        if (!$user->is_active) {
            Audit::log('auth.login_blocked', null, ['reason' => 'inactive'], $user);

            throw ValidationException::withMessages([
                'nip' => 'Akun Anda dinonaktifkan. Hubungi administrator.',
            ]);
        }

        if (!$user->isSuperAdmin() && Settings::get('maintenance_mode')) {
            throw ValidationException::withMessages([
                'nip' => Settings::get('maintenance_message'),
            ]);
        }

        if (Settings::get('single_session')) {
            $user->tokens()->where('name', User::SESSION_TOKEN)->delete();
        }

        $remember  = (bool) ($data['remember'] ?? false);
        $expiresAt = $remember
            ? now()->addDays(Settings::get('remember_days'))
            : now()->addHours(Settings::get('session_hours'));
        $token = $user->createToken(User::SESSION_TOKEN, ['*'], $expiresAt)->plainTextToken;

        $user->forceFill(['last_login_at' => now()])->save();

        Audit::log('auth.login', null, ['remember' => $remember], $user);

        return response()->json([
            'token'      => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'user'       => self::payload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(self::payload($request->user()));
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

    /** Data user untuk client. Permission selalu dihitung server dari role di database. */
    public static function payload(User $user): array
    {
        return [
            ...$user->only(['id', 'name', 'email', 'nip', 'role', 'is_active']),
            'role_label'   => Rbac::label($user->role),
            'permissions'  => $user->permissions(),
            'announcement' => Settings::get('announcement'),
        ];
    }
}
