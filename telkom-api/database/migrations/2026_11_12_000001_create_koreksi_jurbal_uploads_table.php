<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Riwayat upload file Excel Koreksi & Jurbal (satu file = satu segmen)
        Schema::create('koreksi_jurbal_uploads', function (Blueprint $t) {
            $t->id();
            $t->string('original_name');
            $t->char('file_hash', 64)->nullable()->unique();
            $t->string('file_path');
            $t->string('segmen', 10)->nullable();             // DGS / DPS / DSS / RBS (terdeteksi otomatis)
            $t->string('sheet_names')->nullable();            // sheet yang dibaca
            $t->unsignedInteger('periode')->nullable();       // periode terbaru di file, mis. 202609
            $t->enum('status', ['processing', 'done', 'failed'])->default('processing');
            $t->unsignedInteger('scanned_rows')->default(0);  // seluruh baris data yang dibaca
            $t->unsignedInteger('total_rows')->default(0);    // baris koreksi/jurbal yang disimpan
            $t->json('errors')->nullable();
            $t->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->index(['segmen', 'status']);
        });

        // Baris koreksi & jurbal hasil import (format seragam untuk semua segmen)
        Schema::create('koreksi_jurbal_entries', function (Blueprint $t) {
            $t->id();
            // restrict: riwayat upload tidak boleh ikut terhapus
            $t->foreignId('koreksi_jurbal_upload_id')->constrained('koreksi_jurbal_uploads')->restrictOnDelete();
            $t->string('sheet', 100);
            $t->unsignedInteger('row_number');
            $t->string('segmen', 10);
            $t->string('witel', 50);
            $t->unsignedInteger('periode');                    // YYYYMM
            $t->enum('kategori', ['reverse', 'correction']);
            $t->string('tipe_psak', 20)->nullable();           // agent / amortisasi / edk / populasi / splitbill / timing / lowCr
            $t->string('source_data', 100)->nullable();
            $t->string('deskripsi')->nullable();               // DESC2 / KETERANGAN asli
            $t->decimal('amount', 24, 6);

            $t->index(['koreksi_jurbal_upload_id', 'periode', 'kategori'], 'kj_entries_upload_period_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('koreksi_jurbal_entries');
        Schema::dropIfExists('koreksi_jurbal_uploads');
    }
};
