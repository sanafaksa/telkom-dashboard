<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /** Pemakaian di route: ->middleware('role:admin') atau 'role:admin,editor' */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->role === 'superadmin' || in_array($user->role, $roles, true)),
            403,

            'Anda tidak punya akses untuk aksi ini.'
        );

        return $next($request);
    }
}
