<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EdkUpload extends Model
{
    protected $fillable = [
        'report_date', 'original_name', 'file_path', 'status',
        'file_hash',
        'is_active', 'total_rows', 'errors', 'uploaded_by',
        'activated_by', 'activated_at',
    ];

    protected $hidden = ['file_path'];

    protected $casts = [
        'report_date' => 'date:Y-m-d',
        'is_active'   => 'boolean',
        'errors'       => 'array',
        'activated_at' => 'datetime',
    ];

    public function records()  { return $this->hasMany(EdkRecord::class); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
    public function activator() { return $this->belongsTo(User::class, 'activated_by'); }

    public function scopeActive($q) { return $q->where('is_active', true); }

    /** Snapshot 'done' tepat sebelum $upload (urut report_date, lalu id). */
    public static function previousOf(self $upload): ?self
    {
        return static::where('status', 'done')
            ->where('id', '<>', $upload->id)
            ->where(fn ($q) => $q
                ->where('report_date', '<', $upload->report_date)
                ->orWhere(fn ($q) => $q
                    ->where('report_date', $upload->report_date)
                    ->where('id', '<', $upload->id)))
            ->orderByDesc('report_date')->orderByDesc('id')
            ->first();
    }
}
