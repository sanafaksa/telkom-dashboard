<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('edk_uploads', function (Blueprint $t) {
            $t->string('periode_edk', 10)->nullable()->after('report_date');
        });
    }

    public function down(): void
    {
        Schema::table('edk_uploads', function (Blueprint $t) {
            $t->dropColumn('periode_edk');
        });
    }
};
