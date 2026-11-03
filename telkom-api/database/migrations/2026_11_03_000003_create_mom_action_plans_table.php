<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_action_plans', function (Blueprint $table) {
            $table->id();
            $table->string('no', 20)->default('');
            $table->string('tgl', 30)->default('');
            $table->string('agenda', 120)->default('FORUM WITEL');
            $table->string('main_topic', 255)->default('');
            $table->string('unit_telda', 100)->default('PRQ');
            $table->text('peserta')->nullable();
            $table->longText('pembahasan')->nullable();
            $table->longText('pembahasan_notulen')->nullable();
            $table->text('action_plan');
            $table->string('uic', 150)->default('PRQ');
            $table->string('destinasi_fu', 255)->default('-');
            $table->text('support_needed')->nullable();
            $table->string('deadline', 80)->default('-');
            $table->string('status', 30)->default('BELUM FU');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('agenda', 'idx_mom_agenda');
            $table->index('status', 'idx_mom_status');
            $table->index('uic', 'idx_mom_uic');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_action_plans');
    }
};

