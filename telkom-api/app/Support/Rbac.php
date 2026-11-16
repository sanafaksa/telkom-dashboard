<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Sumber kebenaran role & permission SOLARIS.
 *
 * - Role bawaan (ROLES) selalu ada. Admin dapat membuat role baru yang disimpan di tabel roles.
 * - Katalog permission didefinisikan di sini; pemetaan role → permission
 *   disimpan di tabel role_permissions dan dapat diubah.
 * - Super Admin selalu memiliki seluruh permission (tidak bisa dikurangi) dan hanya 1 akun.
 * - Permission bertanda super-only (grup Sistem) tidak pernah bisa diberikan ke role lain.
 */
class Rbac
{
    public const SUPER_ADMIN = 'super_admin';
    public const ADMIN       = 'admin';
    public const STAFF       = 'staff';
    public const SUPPORT     = 'support';
    public const USER        = 'user';

    /** Role bawaan sistem (tidak bisa dihapus). Seed awal tabel roles. */
    public const ROLES = [
        self::SUPER_ADMIN => ['label' => 'Super Admin', 'description' => 'Developer / pemilik sistem. Akses penuh.'],
        self::ADMIN       => ['label' => 'Admin',       'description' => 'Pengelola administrasi dan operasional.'],
        self::STAFF       => ['label' => 'Staff',       'description' => 'Fitur operasional sesuai permission.'],
        self::SUPPORT     => ['label' => 'Support',     'description' => 'Fitur pelayanan dan dukungan.'],
        self::USER        => ['label' => 'User',        'description' => 'Halaman pengguna biasa.'],
    ];

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
        'maintenance.manage'   => ['Mengatur mode pemeliharaan', 'Administrasi', false],
        'inbox.manage'         => ['Mengelola kotak masuk aduan lupa kata sandi', 'Administrasi', false],
        'roles.custom'         => ['Membuat & mengatur role buatan', 'Administrasi', false],

        'users.delete'         => ['Menghapus pengguna', 'Sistem', true],
        'admins.manage'        => ['Mengelola Admin & Super Admin', 'Sistem', true],
        'roles.manage'         => ['Mengubah role & permission bawaan', 'Sistem', true],
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
            'users.reset_password', 'users.toggle_active', 'audit.view', 'maintenance.manage', 'roles.custom',
            'inbox.manage',
        ],
        self::STAFF => [
            'dashboard.view', 'edk.view', 'edk.upload', 'edk.export', 'order_sjt.view', 'psak.view',
            'kuadran.view', 'kuadran.manage', 'mom.view', 'mom.manage',
        ],
        self::SUPPORT => [
            'dashboard.view', 'mom.view', 'mom.manage', 'audit.view', 'maintenance.manage',
            'inbox.manage', 'backup.manage',
        ],
        self::USER    => [
            'dashboard.view', 'edk.view', 'edk.export', 'order_sjt.view', 'psak.view', 'kuadran.view', 'mom.view',
        ],
    ];

    /** Scope yang boleh diberikan ke API key integrasi (hanya baca). */
    public const API_ABILITIES = ['dashboard.view', 'edk.view', 'edk.export', 'kuadran.view', 'mom.view'];

    /**
     * Permission di luar grup Operasional yang boleh diberikan ke Support (troubleshooting, di bawah Admin).
     * Termasuk backup.manage, yang masuk grup Sistem tapi bisa diberikan khusus ke Support.
     */
    public const SUPPORT_EXTRA = ['audit.view', 'maintenance.manage', 'inbox.manage', 'backup.manage'];

    private const CACHE_KEY       = 'rbac.matrix';
    private const ROLES_CACHE_KEY = 'rbac.roles';

    // ===== Daftar role (dari tabel roles) =====

    /** key => ['label', 'description', 'is_system'] (termasuk Super Admin). */
    public static function roles(): array
    {
        return Cache::rememberForever(self::ROLES_CACHE_KEY, function () {
            return DB::table('roles')->orderBy('id')->get()
                ->mapWithKeys(fn ($r) => [$r->key => [
                    'label'       => $r->label,
                    'description' => $r->description,
                    'is_system'   => (bool) $r->is_system,
                ]])
                ->all();
        });
    }

    public static function roleKeys(): array
    {
        return array_keys(self::roles());
    }

    public static function label(string $role): string
    {
        return self::roles()[$role]['label'] ?? $role;
    }

    public static function isSystem(string $role): bool
    {
        return self::roles()[$role]['is_system'] ?? false;
    }

    /** Role yang dikelola Admin: semua kecuali Super Admin dan Admin. */
    public static function regularRoles(): array
    {
        return array_values(array_diff(self::roleKeys(), [self::SUPER_ADMIN, self::ADMIN]));
    }

    // ===== Permission =====

    /** Permission yang boleh diberikan ke role selain Super Admin (tanpa grup Sistem). */
    public static function grantable(): array
    {
        return array_keys(array_filter(self::PERMISSIONS, fn ($p) => ! $p[2]));
    }

    private static function operationalKeys(): array
    {
        return array_keys(array_filter(self::PERMISSIONS, fn ($p) => $p[1] === 'Operasional' && ! $p[2]));
    }

    /**
     * Permission yang boleh diatur untuk satu role.
     * - Admin: seluruh permission non-super.
     * - Support: grup Operasional + SUPPORT_EXTRA.
     * - Staff, User: hanya grup Operasional.
     * - Role buatan Admin: seluruh permission non-super (grup Sistem tetap khusus Super Admin).
     */
    public static function grantableFor(string $role): array
    {
        return match (true) {
            $role === self::SUPER_ADMIN => [],
            $role === self::ADMIN       => self::grantable(),
            $role === self::SUPPORT     => array_values(array_unique([...self::operationalKeys(), ...self::SUPPORT_EXTRA])),
            in_array($role, [self::STAFF, self::USER], true) => self::operationalKeys(),
            default                     => self::grantable(),
        };
    }

    /** @return array<string, string[]> role => permission[] (tanpa super_admin) */
    public static function matrix(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            // Semua role kecuali Super Admin (yang selalu punya seluruh permission).
            $matrix = array_fill_keys(array_values(array_diff(self::roleKeys(), [self::SUPER_ADMIN])), []);
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

        $role = (string) $role;

        return array_values(array_intersect(self::grantableFor($role), self::matrix()[$role] ?? []));
    }

    public static function setPermissions(string $role, array $permissions): void
    {
        $permissions = array_values(array_intersect(self::grantableFor($role), $permissions));

        DB::transaction(function () use ($role, $permissions) {
            DB::table('role_permissions')->where('role', $role)->delete();
            DB::table('role_permissions')->insert(
                array_map(fn ($p) => ['role' => $role, 'permission' => $p], $permissions)
            );
        });

        self::flush();
    }

    /** Buat role buatan Admin. Mengembalikan key role baru. */
    public static function createRole(string $label, ?string $description, array $permissions): string
    {
        $base = Str::limit(Str::slug($label, '_'), 30, '');
        $base = $base !== '' ? $base : 'role';
        $key  = $base;
        $n    = 2;
        while (DB::table('roles')->where('key', $key)->exists() || isset(self::ROLES[$key])) {
            $key = $base . '_' . $n++;
        }

        DB::table('roles')->insert([
            'key'         => $key,
            'label'       => $label,
            'description' => $description,
            'is_system'   => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        self::flush();
        self::setPermissions($key, $permissions);

        return $key;
    }

    /**
     * Hapus role buatan. Akun yang memakai role ini dipindahkan ke role User.
     * Mengembalikan jumlah akun yang dipindahkan.
     */
    public static function deleteRole(string $role): int
    {
        $moved = User::where('role', $role)->update(['role' => self::USER]);

        DB::transaction(function () use ($role) {
            DB::table('role_permissions')->where('role', $role)->delete();
            DB::table('roles')->where('key', $role)->delete();
        });

        self::flush();

        return $moved;
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::ROLES_CACHE_KEY);
    }

    // ===== Aturan pengelolaan pengguna (anti privilege escalation) =====

    /** Role yang boleh diberikan $actor kepada pengguna lain. Super Admin tidak pernah bisa diberikan. */
    public static function assignableRoles(User $actor): array
    {
        return $actor->isSuperAdmin()
            ? array_values(array_merge([self::ADMIN], self::regularRoles()))
            : self::regularRoles();
    }

    /** Apakah $actor boleh mengubah akun $target (di luar pengecekan permission). */
    public static function canManage(User $actor, User $target): bool
    {
        if ($actor->isSuperAdmin()) {
            return true;
        }

        return ! in_array($target->role, [self::SUPER_ADMIN, self::ADMIN], true);
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
