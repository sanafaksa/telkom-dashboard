
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edk_monthly_uploads', function (Blueprint $table) {
            $table->id();
            $table->string('period', 6)->index();
            $table->unsignedInteger('version')->default(1);
            $table->string('original_filename')->nullable();
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('imported_rows')->default(0);
            $table->string('status')->default('pending');
            $table->boolean('is_active')->default(false);
            $table->text('error_summary')->nullable();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['period', 'version']);
            $table->index(['period', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edk_monthly_uploads');
    }
};
