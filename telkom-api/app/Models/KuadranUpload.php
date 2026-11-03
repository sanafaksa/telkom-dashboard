<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KuadranUpload extends Model
{
    protected $table = 'kuadran_uploads';

    protected $fillable = [
        'filename',
        'months',
        'row_count',
    ];

    protected $casts = [
        'row_count' => 'integer',
    ];
}

