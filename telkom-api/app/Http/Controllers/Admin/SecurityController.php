<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class SecurityController extends Controller
{
    public function overview(Request $request)
    {
        $isSuper = $request->user()->isSuperAdmin();
        $failed = fn ($since) => AuditLog::where('action', 'auth.login_failed')->where('created_at', '>=', $since);

        $topIps = $failed(now()->subDays(7))
            ->selectRaw('ip_address, count(*) as total')
            ->groupBy('ip_address')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $events = AuditLog::with('user:id,name,nip')
            ->where(fn ($q) => $q
                ->where('action', 'like', 'user.%')
                ->orWhere('action', 'like', 'role.%')
                ->orWhere('action', 'like', 'session.%')
                ->orWhere('action', 'like', 'settings.%')
                ->orWhereIn('action', ['auth.login_failed', 'auth.login_blocked']))
            // Admin tidak melihat peristiwa yang dilakukan oleh Super Admin
            ->when(! $isSuper, fn ($q) => $q->whereDoesntHave('user', fn ($u) => $u->where('role', Rbac::SUPER_ADMIN)))
            ->latest('id')
            ->limit(15)
            ->get();

        return response()->json([
            'failed_logins_24h'   => $failed(now()->subDay())->count(),
            'failed_logins_7d'    => $failed(now()->subDays(7))->count(),
            'logins_24h'          => AuditLog::where('action', 'auth.login')->where('created_at', '>=', now()->subDay())->count(),
            'active_sessions'     => $this->sessionQuery($isSuper)->count(),
            'inactive_users'      => User::where('is_active', false)->count(),
            'users_without_nip'   => User::whereNull('nip')->count(),
            // null = tidak ditampilkan untuk admin
            'active_super_admins' => $isSuper ? User::where('role', Rbac::SUPER_ADMIN)->where('is_active', true)->count() : null,
            'top_failed_ips'      => $topIps,
            'recent_events'       => $events,
        ]);
    }

    public function sessions(Request $request)
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        $sessions = $this->sessionQuery($request->user()->isSuperAdmin())
            ->with('tokenable:id,name,nip,role')
            ->latest('last_used_at')
            ->limit(200)
            ->get()
            ->map(fn (PersonalAccessToken $t) => [
                'id'           => $t->id,
                'user'         => $t->tokenable?->only(['id', 'name', 'nip', 'role']),
                'created_at'   => $t->created_at,
                'last_used_at' => $t->last_used_at,
                'expires_at'   => $t->expires_at,
                'is_current'   => $t->id === $currentId,
            ]);

        return response()->json(['sessions' => $sessions]);
    }

    public function revokeSession(Request $request, int $id)
    {
        // Admin tidak bisa mengakhiri sesi Super Admin (dianggap tidak ditemukan)
        $token = $this->sessionQuery($request->user()->isSuperAdmin())->findOrFail($id);
        $owner = $token->tokenable;
        $token->delete();

        Audit::log('session.revoked', $owner instanceof User ? $owner : null, ['token_id' => $id]);

        return response()->json(['message' => 'Sesi diakhiri.']);
    }

    public function revokeUserSessions(Request $request, User $user)
    {
        abort_if($user->isSuperAdmin() && ! $request->user()->isSuperAdmin(), 404);

        $count = $user->tokens()->where('name', User::SESSION_TOKEN)->delete();

        Audit::log('session.revoked_all', $user, ['jumlah' => $count]);

        return response()->json(['message' => "{$count} sesi diakhiri."]);
    }

    private function sessionQuery(bool $includeSuper = true)
    {
        return PersonalAccessToken::query()
            ->where('name', User::SESSION_TOKEN)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->when(! $includeSuper, fn ($q) => $q->whereHasMorph(
                'tokenable',
                [User::class],
                fn ($u) => $u->where('role', '!=', Rbac::SUPER_ADMIN),
            ));
    }
}
