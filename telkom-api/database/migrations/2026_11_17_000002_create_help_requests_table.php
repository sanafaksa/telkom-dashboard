<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Aduan lupa kata sandi dari halaman login (kotak masuk untuk Admin & Support). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('help_requests', function (Blueprint $t) {
            $t->id();
            $t->string('name', 100);
            $t->string('nip', 30)->nullable();
            $t->string('contact', 150);
            $t->text('message');
            $t->string('status', 10)->default('open')->index();
            $t->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('handled_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('help_requests');
    }
};
