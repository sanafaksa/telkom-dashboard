<?php

namespace App\Providers;

use App\Support\Settings;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Login: dibatasi per NIP+IP (jumlahnya diatur Super Admin) dan per IP.
        RateLimiter::for('login', function (Request $request) {
            $max = max(3, (int) Settings::get('login_max_attempts'));
            $nip = strtolower(trim((string) $request->input('nip')));

            return [
                Limit::perMinute($max)->by('login:' . $nip . '|' . $request->ip()),
                Limit::perMinute($max * 4)->by('login-ip:' . $request->ip()),
            ];
        });

        // Idle timeout untuk semua role (termasuk Super Admin dan Admin): token berakhir bila tidak dipakai
        // selama session_idle_minutes (Authentication Settings). Setiap request valid memperpanjang expires_at.
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $token, bool $isValid) {
            if (! $isValid) {
                return false;
            }

            $token->forceFill([
                'expires_at' => now()->addMinutes(Settings::get('session_idle_minutes')),
            ])->save();

            return true;
        });

        // Seluruh endpoint administrasi.
        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(120)
            ->by('admin:' . ($request->user()?->id ?: $request->ip())));
    }
}
