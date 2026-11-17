<?php

use App\Support\Rbac;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $t) {
            $t->id();
            $t->string('key', 40)->unique();
            $t->string('label', 60);
            $t->string('description', 255)->nullable();
            $t->boolean('is_system')->default(false);
            $t->timestamps();
        });

        $now = now();
        DB::table('roles')->insert(array_map(
            fn ($key, $info) => [
                'key'         => $key,
                'label'       => $info['label'],
                'description' => $info['description'],
                'is_system'   => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            array_keys(Rbac::ROLES),
            Rbac::ROLES,
        ));

        // Kunci role bisa lebih panjang dari 20 karakter (role buatan Admin).
        Schema::table('users', fn (Blueprint $t) => $t->string('role', 40)->change());
        Schema::table('role_permissions', fn (Blueprint $t) => $t->string('role', 40)->change());

        // Admin dapat membuat dan mengatur role buatannya sendiri.
        DB::table('role_permissions')->insertOrIgnore(['role' => Rbac::ADMIN, 'permission' => 'roles.custom']);
    }

    public function down(): void
    {
        DB::table('role_permissions')->where('permission', 'roles.custom')->delete();
        DB::table('users')->whereNotIn('role', array_keys(Rbac::ROLES))->update(['role' => Rbac::USER]);
        DB::table('role_permissions')->whereNotIn('role', array_keys(Rbac::ROLES))->delete();
        Schema::dropIfExists('roles');
    }
};
