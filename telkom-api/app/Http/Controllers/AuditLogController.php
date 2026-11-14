<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Rbac;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /** Aksi tingkat sistem: hanya terlihat oleh pemegang audit.view_all (Super Admin). */
    private const SYSTEM_PREFIXES = ['role.', 'settings.', 'backup.', 'dev.', 'apikey.', 'session.', 'database.'];

    public function index(Request $request)
    {
        $data = $request->validate([
            'action'  => 'nullable|string|max:50',
            'user_id' => 'nullable|integer',
            'q'       => 'nullable|string|max:100',
            'from'    => 'nullable|date',
            'to'      => 'nullable|date',
        ]);

        $user    = $request->user();
        $viewAll = $user->hasPermission('audit.view_all') && $user->tokenCan('audit.view_all');

        return self::visibleTo($viewAll)
            ->with('user:id,name,email,nip,role')
            // "edk" cocok dengan semua aksi edk.*, "edk.upload" cocok persis.
            ->when($data['action'] ?? null, fn ($q, $v) => str_contains($v, '.')
                ? $q->where('action', $v)
                : $q->where('action', 'like', $v . '.%'))
            ->when($data['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($data['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('action', 'like', "%{$v}%")
                ->orWhere('ip_address', 'like', "%{$v}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$v}%")->orWhere('nip', 'like', "%{$v}%"))))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<', date('Y-m-d', strtotime($v . ' +1 day'))))
            ->latest('id')
            ->paginate(30)
            ->toArray() + ['scope' => $viewAll ? 'all' : 'limited'];
    }

    /** Audit log terbatas: tanpa aktivitas Super Admin dan tanpa aksi tingkat sistem. */
    public static function visibleTo(bool $viewAll): Builder
    {
        $query = AuditLog::query();

        if ($viewAll) {
            return $query;
        }

        $superIds = User::where('role', Rbac::SUPER_ADMIN)->pluck('id');

        return $query
            ->where(fn ($q) => $q->whereNull('user_id')->orWhereNotIn('user_id', $superIds))
            ->where(function ($q) {
                foreach (self::SYSTEM_PREFIXES as $prefix) {
                    $q->where('action', 'not like', $prefix . '%');
                }
            });
    }
}
