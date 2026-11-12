<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KoreksiJurbalEntry extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];

    protected $casts = [
        'periode' => 'integer',
        'amount'  => 'decimal:6',
    ];

    public function upload()
    {
        return $this->belongsTo(KoreksiJurbalUpload::class, 'koreksi_jurbal_upload_id');
    }
}
