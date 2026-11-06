<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KuadranSummary extends Model
{
    protected $table = 'kuadran_summaries';

    protected $fillable = [
        'bulan',
        'period',
        'telda',
        'unit',
        'kw_awal',
        'kw_akhir',
        'jumlah',
    ];

    protected $casts = [
        'kw_akhir' => 'integer',
        'jumlah'   => 'integer',
    ];
}

