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

    /** Riwayat ubah password. Tetap terlihat walau pelakunya Super Admin (tampil sebagai "Admin"). */
    public const PASSWORD_ACTIONS = ['user.password_reset', 'profile.password_changed'];

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

        $page = self::visibleTo($viewAll)
            ->with('user:id,name,email,nip,role')
            // "password" = riwayat ubah password; "edk" cocok dengan semua aksi edk.*, "edk.upload" cocok persis.
            ->when($data['action'] ?? null, fn ($q, $v) => match (true) {
                $v === 'password'        => $q->whereIn('action', self::PASSWORD_ACTIONS),
                str_contains($v, '.')    => $q->where('action', $v),
                default                  => $q->where('action', 'like', $v . '.%'),
            })
            ->when($data['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($data['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('action', 'like', "%{$v}%")
                ->orWhere('ip_address', 'like', "%{$v}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$v}%")->orWhere('nip', 'like', "%{$v}%"))))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<', date('Y-m-d', strtotime($v . ' +1 day'))))
            ->latest('id')
            ->paginate(30);

        // Nama akun untuk objek bertipe User (ditampilkan sebagai nama, bukan "User #8").
        $subjectUsers = User::whereIn('id', $page->getCollection()
            ->where('subject_type', 'User')
            ->pluck('subject_id')
            ->filter()
            ->unique())
            ->get()
            ->keyBy('id');

        // Pelaku & objek Super Admin disamarkan sebagai "Admin" untuk viewer selain Super Admin.
        $page->through(function (AuditLog $log) use ($user, $subjectUsers) {
            $row = $log->toArray();
            if ($log->user) {
                $row['user'] = Rbac::displayActor($log->user, $user);
                $row['user_id'] = $row['user']['id'];
            }

            $subject = $subjectUsers->get($log->subject_id);
            if ($log->subject_type === 'User' && $subject) {
                $shown = Rbac::displayActor($subject, $user);
                $row['subject_label'] = $shown['name'];
                $row['subject_role'] = $shown['role'];
                $row['subject_id'] = $shown['id'];
            }

            return $row;
        });

        return $page->toArray() + ['scope' => $viewAll ? 'all' : 'limited'];
    }

    /**
     * Audit log terbatas: tanpa aktivitas Super Admin (kecuali riwayat ubah password)
     * dan tanpa aksi tingkat sistem.
     */
    public static function visibleTo(bool $viewAll): Builder
    {
        $query = AuditLog::query();

        if ($viewAll) {
            return $query;
        }

        $superIds = User::where('role', Rbac::SUPER_ADMIN)->pluck('id');

        return $query
            ->where(fn ($q) => $q->whereNull('user_id')
                ->orWhereNotIn('user_id', $superIds)
                ->orWhereIn('action', self::PASSWORD_ACTIONS))
            ->where(function ($q) {
                foreach (self::SYSTEM_PREFIXES as $prefix) {
                    $q->where('action', 'not like', $prefix . '%');
                }
            });
    }
}
