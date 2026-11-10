<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_uploads', function (Blueprint $table) {
            $table->id();
            $table->string('filename', 255);
            $table->string('sheet_name', 100)->default('Notulensi Tracker');
            $table->unsignedInteger('row_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_uploads');
    }
};

