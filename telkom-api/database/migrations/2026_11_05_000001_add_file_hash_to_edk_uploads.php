<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('edk_uploads', function (Blueprint $t) {
            $t->char('file_hash', 64)->nullable()->unique()->after('original_name');
        });
    }

    public function down(): void
    {
        Schema::table('edk_uploads', function (Blueprint $t) {
            $t->dropUnique(['file_hash']);
            $t->dropColumn('file_hash');
        });
    }
};
