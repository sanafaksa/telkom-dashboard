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
    public function overview()
    {
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
            ->latest('id')
            ->limit(15)
            ->get();

        return response()->json([
            'failed_logins_24h'   => $failed(now()->subDay())->count(),
            'failed_logins_7d'    => $failed(now()->subDays(7))->count(),
            'logins_24h'          => AuditLog::where('action', 'auth.login')->where('created_at', '>=', now()->subDay())->count(),
            'active_sessions'     => $this->sessionQuery()->count(),
            'inactive_users'      => User::where('is_active', false)->count(),
            'users_without_nip'   => User::whereNull('nip')->count(),
            'active_super_admins' => User::where('role', Rbac::SUPER_ADMIN)->where('is_active', true)->count(),
            'top_failed_ips'      => $topIps,
            'recent_events'       => $events,
        ]);
    }

    public function sessions(Request $request)
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        $sessions = $this->sessionQuery()
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

    public function revokeSession(int $id)
    {
        $token = $this->sessionQuery()->findOrFail($id);
        $owner = $token->tokenable;
        $token->delete();

        Audit::log('session.revoked', $owner instanceof User ? $owner : null, ['token_id' => $id]);

        return response()->json(['message' => 'Sesi diakhiri.']);
    }

    public function revokeUserSessions(User $user)
    {
        $count = $user->tokens()->where('name', User::SESSION_TOKEN)->delete();

        Audit::log('session.revoked_all', $user, ['jumlah' => $count]);

        return response()->json(['message' => "{$count} sesi diakhiri."]);
    }

    private function sessionQuery()
    {
        return PersonalAccessToken::query()
            ->where('name', User::SESSION_TOKEN)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}
