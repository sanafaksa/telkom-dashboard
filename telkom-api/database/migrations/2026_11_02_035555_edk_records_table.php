<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('edk_records', function (Blueprint $t) {
            $t->id();
            $t->foreignId('edk_upload_id')->constrained('edk_uploads')->cascadeOnDelete();
            $t->string('row_key', 80);
            $t->string('sid', 50);
            $t->string('no_order', 50)->nullable();          // ← tambahan
            $t->string('nama_pelanggan');
            $t->string('nama_am');
            $t->string('nama_cc')->nullable();
            $t->string('segmen', 10);
            $t->string('witel', 30)->default('SOLO JT');
            $t->char('periode_edk', 6);
            $t->string('status_utama', 20);
            $t->string('status_detail', 20);
            $t->unsignedInteger('order_qty')->default(1);
            $t->decimal('abonemen', 18, 2)->default(0);
            $t->enum('flag', ['NEW', 'UPDATED', 'UNCHANGED'])->default('NEW');

            $t->unique(['edk_upload_id', 'row_key']);
            $t->index(['edk_upload_id', 'segmen']);
            $t->index(['edk_upload_id', 'periode_edk']);
            $t->index(['edk_upload_id', 'nama_am']);
            $t->index(['edk_upload_id', 'nama_cc']);
            $t->index(['edk_upload_id', 'flag']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edk_records');
    }
};
