<?php

use App\Support\Rbac;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // NIP menjadi username login (sebelumnya kolom "nik").
        Schema::table('users', function (Blueprint $t) {
            $t->renameColumn('nik', 'nip');
        });

        Schema::table('users', function (Blueprint $t) {
            $t->string('email')->nullable()->change();
            $t->string('role', 20)->default(Rbac::USER)->change();
            $t->boolean('is_active')->default(true)->after('role');
            $t->timestamp('last_login_at')->nullable()->after('is_active');
        });

        // Normalisasi role lama: superadmin → super_admin, viewer/lainnya → user.
        DB::table('users')->where('role', 'superadmin')->update(['role' => Rbac::SUPER_ADMIN]);
        // Pakai daftar role bawaan dari kode, bukan tabel roles (belum dibuat pada tahap migration ini).
        DB::table('users')->whereNotIn('role', array_keys(Rbac::ROLES))->update(['role' => Rbac::USER]);

        Schema::create('role_permissions', function (Blueprint $t) {
            $t->id();
            $t->string('role', 20);
            $t->string('permission', 60);
            $t->unique(['role', 'permission']);
        });

        $rows = [];
        foreach (Rbac::DEFAULTS as $role => $permissions) {
            foreach ($permissions as $permission) {
                $rows[] = ['role' => $role, 'permission' => $permission];
            }
        }
        DB::table('role_permissions')->insert($rows);

        Schema::create('system_settings', function (Blueprint $t) {
            $t->string('key', 80)->primary();
            $t->text('value')->nullable();
            $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('role_permissions');

        DB::table('users')->where('role', Rbac::SUPER_ADMIN)->update(['role' => 'superadmin']);
        DB::table('users')->whereIn('role', Rbac::REGULAR_ROLES)->update(['role' => 'viewer']);

        Schema::table('users', function (Blueprint $t) {
            $t->dropColumn(['is_active', 'last_login_at']);
            $t->string('role', 20)->default('viewer')->change();
        });

        Schema::table('users', function (Blueprint $t) {
            $t->renameColumn('nip', 'nik');
        });
    }
};
