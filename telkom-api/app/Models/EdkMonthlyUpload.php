<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EdkMonthlyUpload extends Model
{
    protected $fillable = [
        'period',
        'version',
        'original_filename',
        'total_rows',
        'imported_rows',
        'status',
        'is_active',
        'error_summary',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'total_rows' => 'integer',
            'imported_rows' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function summaries(): HasMany
    {
        return $this->hasMany(EdkMonthlySummary::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
