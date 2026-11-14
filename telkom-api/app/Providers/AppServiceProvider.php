<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Idle timeout: token sesi berakhir bila tidak dipakai selama idle_minutes.
        // Setiap request valid memperpanjang expires_at, jadi hanya sesi yang benar-benar diam yang berakhir.
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $token, bool $isValid) {
            if (! $isValid) {
                return false;
            }

            $token->forceFill([
                'expires_at' => now()->addMinutes((int) config('sanctum.idle_minutes', 15)),
            ])->save();

            return true;
        });
    }
}
