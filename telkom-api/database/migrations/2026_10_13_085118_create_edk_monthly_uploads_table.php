<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('edk_uploads', function (Blueprint $t) {
            $t->id();
            $t->date('report_date');
            $t->string('original_name');
            $t->string('file_path');
            $t->enum('status', ['processing', 'done', 'failed'])->default('processing');
            $t->boolean('is_active')->default(false)->index();
            $t->unsignedInteger('total_rows')->default(0);
            $t->json('errors')->nullable();
            $t->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edk_uploads');
    }
};
