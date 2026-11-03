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
        abort_unless(
            $request->user() && in_array($request->user()->role, $roles, true),
            403,
            'Anda tidak punya akses untuk aksi ini.'
        );

        return $next($request);
    }
}
