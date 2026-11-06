<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('action', 50);                    // auth.login, edk.upload, edk.activate, ...
            $t->string('subject_type', 50)->nullable();  // EdkUpload, User, ...
            $t->unsignedBigInteger('subject_id')->nullable();
            $t->json('meta')->nullable();
            $t->string('ip_address', 45)->nullable();
            $t->string('user_agent', 255)->nullable();
            $t->timestamp('created_at')->useCurrent();

            $t->index('action');
            $t->index('created_at');
            $t->index(['subject_type', 'subject_id']);
        });

        Schema::table('edk_uploads', function (Blueprint $t) {
            $t->foreignId('activated_by')->nullable()->after('uploaded_by')->constrained('users')->nullOnDelete();
            $t->timestamp('activated_at')->nullable()->after('activated_by');
        });
    }

    public function down(): void
    {
        Schema::table('edk_uploads', function (Blueprint $t) {
            $t->dropConstrainedForeignId('activated_by');
            $t->dropColumn('activated_at');
        });

        Schema::dropIfExists('audit_logs');
    }
};
