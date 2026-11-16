<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sumber kebenaran role & permission SOLARIS.
 *
 * - Daftar role bersifat tetap (5 role).
 * - Katalog permission didefinisikan di sini; pemetaan role → permission
 *   disimpan di tabel role_permissions dan dapat diubah Super Admin.
 * - Super Admin selalu memiliki seluruh permission (tidak bisa dikurangi).
 * - Permission bertanda super-only tidak pernah bisa diberikan ke role lain.
 */
class Rbac
{
    public const SUPER_ADMIN = 'super_admin';
    public const ADMIN       = 'admin';
    public const STAFF       = 'staff';
    public const SUPPORT     = 'support';
    public const USER        = 'user';

    public const ROLES = [
        self::SUPER_ADMIN => ['label' => 'Super Admin', 'description' => 'Developer / pemilik sistem. Akses penuh.'],
        self::ADMIN       => ['label' => 'Admin',       'description' => 'Pengelola administrasi dan operasional.'],
        self::STAFF       => ['label' => 'Staff',       'description' => 'Fitur operasional sesuai permission.'],
        self::SUPPORT     => ['label' => 'Support',     'description' => 'Fitur pelayanan dan dukungan.'],
        self::USER        => ['label' => 'User',        'description' => 'Halaman pengguna biasa.'],
    ];

    /** Role yang boleh dikelola oleh Admin (bukan Super Admin). */
    public const REGULAR_ROLES = [self::STAFF, self::SUPPORT, self::USER];

    /** key => [label, grup, super-only] */
    public const PERMISSIONS = [
        'dashboard.view'       => ['Melihat Executive Overview', 'Operasional', false],
        'edk.view'             => ['Melihat EDK Monitoring', 'Operasional', false],
        'edk.upload'           => ['Upload & rollback report EDK', 'Operasional', false],
        'edk.export'           => ['Export laporan EDK', 'Operasional', false],
        'order_sjt.view'       => ['Melihat Monitoring Order SJT', 'Operasional', false],
        'psak.view'            => ['Melihat Koreksi & Jurbal PSAK', 'Operasional', false],
        'kuadran.view'         => ['Melihat Kuadran SJT', 'Operasional', false],
        'kuadran.manage'       => ['Mengelola data Kuadran', 'Operasional', false],
        'mom.view'             => ['Melihat MoM & Support Needed', 'Operasional', false],
        'mom.manage'           => ['Mengelola MoM & Support Needed', 'Operasional', false],

        'admin.dashboard'      => ['Dashboard administrasi', 'Administrasi', false],
        'users.view'           => ['Melihat pengguna', 'Administrasi', false],
        'users.create'         => ['Menambah pengguna', 'Administrasi', false],
        'users.update'         => ['Mengedit data pengguna', 'Administrasi', false],
        'users.reset_password' => ['Reset password pengguna', 'Administrasi', false],
        'users.toggle_active'  => ['Mengaktifkan / menonaktifkan pengguna', 'Administrasi', false],
        'audit.view'           => ['Melihat audit log (terbatas)', 'Administrasi', false],

        'users.delete'         => ['Menghapus pengguna', 'Sistem', true],
        'admins.manage'        => ['Mengelola Admin & Super Admin', 'Sistem', true],
        'roles.manage'         => ['Mengubah role & permission', 'Sistem', true],
        'audit.view_all'       => ['Melihat seluruh audit log', 'Sistem', true],
        'system.config'        => ['System Configuration', 'Sistem', true],
        'auth.settings'        => ['Authentication Settings', 'Sistem', true],
        'security.center'      => ['Security Center', 'Sistem', true],
        'database.manage'      => ['Database Management', 'Sistem', true],
        'email.config'         => ['Email Configuration', 'Sistem', true],
        'api.manage'           => ['API Management', 'Sistem', true],
        'backup.manage'        => ['Backup & Restore', 'Sistem', true],
        'system.monitor'       => ['System Monitoring', 'Sistem', true],
        'dev.tools'            => ['Developer Tools', 'Sistem', true],
    ];

    public const DEFAULTS = [
        self::ADMIN => [
            'dashboard.view', 'edk.view', 'edk.upload', 'edk.export', 'order_sjt.view', 'psak.view',
            'kuadran.view', 'kuadran.manage', 'mom.view', 'mom.manage',
            'admin.dashboard', 'users.view', 'users.create', 'users.update',
            'users.reset_password', 'users.toggle_active', 'audit.view',
        ],
        self::STAFF => [
            'dashboard.view', 'edk.view', 'edk.upload', 'edk.export', 'order_sjt.view', 'psak.view',
            'kuadran.view', 'kuadran.manage', 'mom.view', 'mom.manage',
        ],
        self::SUPPORT => ['dashboard.view', 'mom.view', 'mom.manage'],
        self::USER    => [
            'dashboard.view', 'edk.view', 'edk.export', 'order_sjt.view', 'psak.view', 'kuadran.view', 'mom.view',
        ],
    ];

    /** Scope yang boleh diberikan ke API key integrasi (hanya baca). */
    public const API_ABILITIES = ['dashboard.view', 'edk.view', 'edk.export', 'kuadran.view', 'mom.view'];

    private const CACHE_KEY = 'rbac.matrix';

    public static function roleKeys(): array
    {
        return array_keys(self::ROLES);
    }

    public static function label(string $role): string
    {
        return self::ROLES[$role]['label'] ?? $role;
    }

    /** Permission yang boleh diberikan ke role selain Super Admin. */
    public static function grantable(): array
    {
        return array_keys(array_filter(self::PERMISSIONS, fn ($p) => ! $p[2]));
    }

    /** @return array<string, string[]> role => permission[] (tanpa super_admin) */
    public static function matrix(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $matrix = array_fill_keys([self::ADMIN, self::STAFF, self::SUPPORT, self::USER], []);
            foreach (DB::table('role_permissions')->get(['role', 'permission']) as $row) {
                if (isset($matrix[$row->role])) {
                    $matrix[$row->role][] = $row->permission;
                }
            }

            return $matrix;
        });
    }

    public static function permissionsFor(?string $role): array
    {
        if ($role === self::SUPER_ADMIN) {
            return array_keys(self::PERMISSIONS);
        }

        return array_values(array_intersect(self::grantable(), self::matrix()[$role] ?? []));
    }

    public static function setPermissions(string $role, array $permissions): void
    {
        $permissions = array_values(array_intersect(self::grantable(), $permissions));

        DB::transaction(function () use ($role, $permissions) {
            DB::table('role_permissions')->where('role', $role)->delete();
            DB::table('role_permissions')->insert(
                array_map(fn ($p) => ['role' => $role, 'permission' => $p], $permissions)
            );
        });

        self::flush();
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    // ===== Aturan pengelolaan pengguna (anti privilege escalation) =====

    /** Role yang boleh diberikan $actor kepada pengguna lain. */
    public static function assignableRoles(User $actor): array
    {
        return $actor->isSuperAdmin() ? self::roleKeys() : self::REGULAR_ROLES;
    }

    /** Apakah $actor boleh mengubah akun $target (di luar pengecekan permission). */
    public static function canManage(User $actor, User $target): bool
    {
        return $actor->isSuperAdmin() || in_array($target->role, self::REGULAR_ROLES, true);
    }

    /**
     * Pastikan masih ada Super Admin aktif lain sebelum $target diturunkan,
     * dinonaktifkan, atau dihapus. Panggil di dalam transaksi.
     */
    public static function ensureNotLastSuperAdmin(User $target): void
    {
        if ($target->role !== self::SUPER_ADMIN || ! $target->is_active) {
            return;
        }

        $others = User::where('role', self::SUPER_ADMIN)
            ->where('is_active', true)
            ->where('id', '!=', $target->id)
            ->lockForUpdate()
            ->count();

        if ($others === 0) {
            throw ValidationException::withMessages([
                'role' => 'Minimal satu Super Admin harus tetap aktif.',
            ]);
        }
    }
}
