<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\Rbac;
use Illuminate\Http\Request;

/** Dashboard administrasi (Admin & Super Admin). */
class OverviewController extends Controller
{
    public function index(Request $request)
    {
        $user    = $request->user();
        $viewAll = $user->hasPermission('audit.view_all');
        $counts  = User::query()->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role');

        $roles = [];
        foreach (Rbac::ROLES as $key => $info) {
            $roles[] = ['key' => $key, 'label' => $info['label'], 'users' => (int) ($counts[$key] ?? 0)];
        }

        $since = now()->subDay();

        return response()->json([
            'users' => [
                'total'    => (int) $counts->sum(),
                'active'   => User::where('is_active', true)->count(),
                'inactive' => User::where('is_active', false)->count(),
                'new_30d'  => User::where('created_at', '>=', now()->subDays(30))->count(),
            ],
            'roles'    => $roles,
            'activity' => [
                'logins_24h'        => AuditLog::where('action', 'auth.login')->where('created_at', '>=', $since)->count(),
                'failed_logins_24h' => AuditLog::where('action', 'auth.login_failed')->where('created_at', '>=', $since)->count(),
                'events_24h'        => AuditLogController::visibleTo($viewAll)->where('created_at', '>=', $since)->count(),
            ],
            'recent_logins' => User::whereNotNull('last_login_at')
                ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('role', '!=', Rbac::SUPER_ADMIN))
                ->latest('last_login_at')
                ->limit(6)
                ->get(['id', 'name', 'nip', 'role', 'last_login_at']),
            'recent_activity' => $user->hasPermission('audit.view') || $viewAll
                ? AuditLogController::visibleTo($viewAll)->with('user:id,name,nip')->latest('id')->limit(8)->get()
                : [],
        ]);
    }
}
