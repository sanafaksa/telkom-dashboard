<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /** Sistem EDK lama (tabel pivot lebar) sudah digantikan edk_uploads + edk_records. */
    public function up(): void
    {
        Schema::dropIfExists('edk_monthly_summaries');
        Schema::dropIfExists('edk_monthly_uploads');
    }

    public function down(): void
    {
        // Sengaja tidak dibuat ulang: struktur lama tidak dipakai lagi.
        // Jika perlu, kembalikan lewat git (migration lama masih ada).
    }
};
