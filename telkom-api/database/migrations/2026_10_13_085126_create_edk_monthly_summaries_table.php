
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edk_monthly_summaries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('edk_monthly_upload_id')
                ->constrained('edk_monthly_uploads')
                ->cascadeOnDelete();

            $table->string('segment', 10);

            $table->unsignedInteger('lanjut_complete_order')->default(0);
            $table->decimal('lanjut_complete_abonemen_rp', 18, 2)->default(0);

            $table->unsignedInteger('lanjut_in_progress_order')->default(0);
            $table->decimal('lanjut_in_progress_abonemen_rp', 18, 2)->default(0);

            $table->unsignedInteger('tidak_lanjut_complete_order')->default(0);
            $table->decimal('tidak_lanjut_complete_abonemen_rp', 18, 2)->default(0);

            $table->unsignedInteger('tidak_lanjut_in_progress_order')->default(0);
            $table->decimal('tidak_lanjut_in_progress_abonemen_rp', 18, 2)->default(0);

            $table->unsignedInteger('konfirmasi_am_order')->default(0);
            $table->decimal('konfirmasi_am_abonemen_rp', 18, 2)->default(0);
            $table->unsignedInteger('konfirmasi_am_auto_renewal')->default(0);
            $table->unsignedInteger('konfirmasi_am_in_progress')->default(0);

            $table->unsignedInteger('bukan_witel_solo_jt_order')->default(0);
            $table->decimal('bukan_witel_solo_jt_abonemen_rp', 18, 2)->default(0);

            $table->unsignedInteger('total_order')->default(0);

            $table->timestamps();

            $table->unique(
                ['edk_monthly_upload_id', 'segment'],
                'edk_monthly_summaries_upload_segment_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edk_monthly_summaries');
    }
};
