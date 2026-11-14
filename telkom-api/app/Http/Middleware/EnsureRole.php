<?php

namespace App\Http\Middleware;

use App\Support\Rbac;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /** Pemakaian di route: ->middleware('role:admin') atau 'role:admin,staff'. Super Admin selalu lolos. */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->role === Rbac::SUPER_ADMIN || in_array($user->role, $roles, true)),
            403,
            'Anda tidak punya akses untuk aksi ini.'
        );

        return $next($request);
    }
}
