<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PsakKoreksiUpload extends Model
{
    protected $table = 'psak_koreksi_uploads';

    protected $fillable = [
        'filename',
        'period_reverse',
        'period_correction',
        'row_count',
        'rows',
    ];

    protected $casts = [
        'rows' => 'array',
        'row_count' => 'integer',
    ];
}
