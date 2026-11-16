<?php

namespace App\Http\Middleware;

use App\Support\Maintenance;
use App\Support\Settings;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureActive
{
    /** Tolak akun nonaktif (sekaligus cabut tokennya) dan terapkan mode pemeliharaan. */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            $token = $user->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }
            abort(401, 'Akun Anda dinonaktifkan. Hubungi administrator.');
        }

        Maintenance::activateIfDue();

        if ($user && ! in_array($user->role, [\App\Support\Rbac::SUPER_ADMIN, \App\Support\Rbac::SUPPORT], true) && Settings::get('maintenance_mode')) {
            abort(503, Settings::get('maintenance_message'));
        }

        return $next($request);
    }
}
