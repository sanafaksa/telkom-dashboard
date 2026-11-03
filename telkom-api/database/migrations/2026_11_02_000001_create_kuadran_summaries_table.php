<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kuadran_summaries', function (Blueprint $table) {
            $table->id();
            $table->string('bulan', 10)->comment('Jul, Aug, Sep, Oct, Nov, Dec');
            $table->string('period', 10)->default('')->comment('YYYYMM, contoh: 202607, 202608');
            $table->string('telda', 100)->comment('Region / Telda');
            $table->string('unit', 50)->comment('Segment: Business, Enterprise, Government');
            $table->string('kw_awal', 10)->default('')->comment('1..4, NEW, atau kosong untuk bulan dasar');
            $table->unsignedTinyInteger('kw_akhir')->comment('Kuadran bulan berjalan (1..4)');
            $table->unsignedInteger('jumlah')->default(0)->comment('Jumlah pelanggan');
            $table->timestamps();

            $table->unique(['bulan', 'telda', 'unit', 'kw_awal', 'kw_akhir'], 'uq_kuadran_summary');
            $table->index('bulan', 'idx_bulan');
            $table->index('telda', 'idx_telda');
            $table->index('unit', 'idx_unit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kuadran_summaries');
    }
};

