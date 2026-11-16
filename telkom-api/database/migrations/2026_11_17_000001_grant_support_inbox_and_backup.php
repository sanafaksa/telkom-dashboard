<?php

use App\Support\Rbac;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Menambah permission kotak masuk aduan (Admin & Support) dan backup & restore (Support) ke database yang sudah ada. */
return new class extends Migration
{
    private const GRANTS = [
        [Rbac::ADMIN, 'inbox.manage'],
        [Rbac::SUPPORT, 'inbox.manage'],
        [Rbac::SUPPORT, 'backup.manage'],
    ];

    public function up(): void
    {
        foreach (self::GRANTS as [$role, $permission]) {
            $exists = DB::table('role_permissions')->where(['role' => $role, 'permission' => $permission])->exists();
            if (! $exists) {
                DB::table('role_permissions')->insert(['role' => $role, 'permission' => $permission]);
            }
        }

        Rbac::flush();
    }

    public function down(): void
    {
        foreach (self::GRANTS as [$role, $permission]) {
            DB::table('role_permissions')->where(['role' => $role, 'permission' => $permission])->delete();
        }

        Rbac::flush();
    }
};
