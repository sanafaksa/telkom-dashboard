<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('edk_monthly_summaries', function (Blueprint $table) {
    $table->decimal('konfirmasi_am_auto_renewal_abonemen_rp', 18, 2)->default(0)->change();
    $table->decimal('konfirmasi_am_in_progress_abonemen_rp', 18, 2)->default(0)->change();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('edk_monthly_summaries', function (Blueprint $table) {
    $table->unsignedBigInteger('konfirmasi_am_auto_renewal_abonemen_rp')->default(0)->change();
    $table->unsignedBigInteger('konfirmasi_am_in_progress_abonemen_rp')->default(0)->change();
});
    }
};
