<?php

use App\Support\Rbac;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - Jejak ubah password: siapa yang terakhir mengubah password setiap akun.
 * - User Management untuk Support (clone dari Admin, tanpa menyentuh Admin & Super Admin).
 */
return new class extends Migration
{
    private const SUPPORT_GRANTS = [
        'users.view',
        'users.create',
        'users.update',
        'users.reset_password',
        'users.toggle_active',
    ];

    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->timestamp('password_changed_at')->nullable()->after('password');
            $t->foreignId('password_changed_by')->nullable()->after('password_changed_at')
                ->constrained('users')->nullOnDelete();
        });

        foreach (self::SUPPORT_GRANTS as $permission) {
            $exists = DB::table('role_permissions')
                ->where(['role' => Rbac::SUPPORT, 'permission' => $permission])
                ->exists();

            if (! $exists) {
                DB::table('role_permissions')->insert(['role' => Rbac::SUPPORT, 'permission' => $permission]);
            }
        }

        Rbac::flush();
    }

    public function down(): void
    {
        DB::table('role_permissions')
            ->where('role', Rbac::SUPPORT)
            ->whereIn('permission', self::SUPPORT_GRANTS)
            ->delete();

        Schema::table('users', function (Blueprint $t) {
            $t->dropConstrainedForeignId('password_changed_by');
            $t->dropColumn('password_changed_at');
        });

        Rbac::flush();
    }
};
