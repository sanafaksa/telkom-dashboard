<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    if (Schema::hasIndex('edk_uploads', 'edk_uploads_file_hash_unique')) {
        Schema::table('edk_uploads', function (Blueprint $table) {
            $table->dropUnique('edk_uploads_file_hash_unique');
        });
    }
}

    public function down(): void
    {
        // Jangan aktifkan kembali UNIQUE secara otomatis.
        // Riwayat upload dapat memiliki file_hash yang sama.
    }
};
