<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;   // hanya created_at, diisi otomatis

    protected $fillable = [
        'user_id', 'action', 'subject_type', 'subject_id',
        'meta', 'ip_address', 'user_agent', 'created_at',
    ];

    protected $casts = [
        'meta'       => 'array',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
