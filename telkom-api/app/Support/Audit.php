<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Throwable;

class Audit
{
    /** Catat aktivitas. Tidak pernah melempar error ke pemanggil. */
    public static function log(string $action, ?Model $subject = null, array $meta = [], ?User $user = null): ?AuditLog
    {
        try {
            $request = request();

            return AuditLog::create([
                'user_id'      => ($user ?? $request->user())?->id,
                'action'       => $action,
                'subject_type' => $subject ? class_basename($subject) : null,
                'subject_id'   => $subject?->getKey(),
                'meta'         => $meta ?: null,
                'ip_address'   => $request->ip(),
                'user_agent'   => Str::limit((string) $request->userAgent(), 250, ''),
                'created_at'   => now(),
            ]);
        } catch (Throwable $e) {
            report($e);   // masuk storage/logs/laravel.log, aksi utama tetap jalan
            return null;
        }
    }
}
