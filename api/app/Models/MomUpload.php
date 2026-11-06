<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MomUpload extends Model
{
    protected $table = 'mom_uploads';

    protected $fillable = [
        'filename',
        'sheet_name',
        'row_count',
    ];

    protected $casts = [
        'row_count' => 'integer',
    ];
}

