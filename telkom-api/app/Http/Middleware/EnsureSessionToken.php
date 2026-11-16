<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSessionToken
{
    /** Hanya sesi login penuh (bukan API key ber-scope) yang boleh mengelola akun sendiri. */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->tokenCan('*'), 403, 'Anda tidak punya akses untuk aksi ini.');

        return $next($request);
    }
}
