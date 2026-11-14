<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Pilihan Unit/Telda bisa lebih dari 100 karakter (checkbox multi-pilih), jadi kolom dilebarkan.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE mom_action_plans MODIFY unit_telda VARCHAR(500) NOT NULL DEFAULT 'PRQ'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE mom_action_plans MODIFY unit_telda VARCHAR(100) NOT NULL DEFAULT 'PRQ'");
        }
    }
};
