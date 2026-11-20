<?php

use App\Support\Rbac;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Hasil upload rekap Koreksi & Jurbal PSAK, disimpan ke database. Data terakhir = data aktif. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('psak_koreksi_uploads', function (Blueprint $t) {
            $t->id();
            $t->string('filename', 255)->nullable();
            $t->string('period_reverse', 20);
            $t->string('period_correction', 20);
            $t->unsignedInteger('row_count')->default(0);
            $t->json('rows');
            $t->timestamps();
        });

        foreach ([Rbac::ADMIN, Rbac::STAFF] as $role) {
            DB::table('role_permissions')->insertOrIgnore(['role' => $role, 'permission' => 'psak.manage']);
        }

        Rbac::flush();
    }

    public function down(): void
    {
        DB::table('role_permissions')->where('permission', 'psak.manage')->delete();
        Schema::dropIfExists('psak_koreksi_uploads');

        Rbac::flush();
    }
};
