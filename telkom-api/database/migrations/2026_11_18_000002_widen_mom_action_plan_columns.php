<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Hasil baca Excel kadang lebih panjang dari kolom lama (no, tgl, deadline) sehingga sync ke MySQL gagal.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE mom_action_plans MODIFY no VARCHAR(50) NOT NULL DEFAULT ''");
            DB::statement("ALTER TABLE mom_action_plans MODIFY tgl VARCHAR(100) NOT NULL DEFAULT ''");
            DB::statement("ALTER TABLE mom_action_plans MODIFY deadline VARCHAR(255) NOT NULL DEFAULT '-'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE mom_action_plans MODIFY no VARCHAR(20) NOT NULL DEFAULT ''");
            DB::statement("ALTER TABLE mom_action_plans MODIFY tgl VARCHAR(30) NOT NULL DEFAULT ''");
            DB::statement("ALTER TABLE mom_action_plans MODIFY deadline VARCHAR(80) NOT NULL DEFAULT '-'");
        }
    }
};
