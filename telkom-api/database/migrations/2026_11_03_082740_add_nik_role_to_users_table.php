<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('nik', 30)->nullable()->unique()->after('email');
            $t->string('role', 20)->default('viewer')->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropUnique(['nik']);
            $t->dropColumn(['nik', 'role']);
        });
    }
};
