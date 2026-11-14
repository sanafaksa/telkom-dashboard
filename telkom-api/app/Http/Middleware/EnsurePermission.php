<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Pemakaian: ->middleware('permission:edk.upload') atau 'permission:a,b' (salah satu cukup).
     *
     * Role dibaca dari database pada setiap request (bukan dari client), lalu
     * dicocokkan dengan matriks role_permissions. Token juga harus memiliki
     * scope yang sama, sehingga API key tidak bisa melampaui scope-nya.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        foreach ($permissions as $permission) {
            if ($user && $user->hasPermission($permission) && $user->tokenCan($permission)) {
                return $next($request);
            }
        }

        abort(403, 'Anda tidak punya akses untuk aksi ini.');
    }
}
