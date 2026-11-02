<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('edk_records', function (Blueprint $t) {
            $t->string('sid', 50)->nullable()->change();
            $t->string('nama_pelanggan')->nullable()->change();
            $t->string('nama_am')->nullable()->change();
            $t->string('segmen', 10)->nullable()->change();
            $t->char('periode_edk', 6)->nullable()->change();
            $t->string('status_utama', 20)->nullable()->change();
            $t->string('status_detail', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('edk_records', function (Blueprint $t) {
            $t->string('sid', 50)->nullable(false)->change();
            $t->string('nama_pelanggan')->nullable(false)->change();
            $t->string('nama_am')->nullable(false)->change();
            $t->string('segmen', 10)->nullable(false)->change();
            $t->char('periode_edk', 6)->nullable(false)->change();
            $t->string('status_utama', 20)->nullable(false)->change();
            $t->string('status_detail', 20)->nullable(false)->change();
        });
    }
};
