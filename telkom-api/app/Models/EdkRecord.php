<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class EdkRecord extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];

    protected $casts = [
        'order_qty' => 'integer',
        'abonemen'  => 'decimal:2',
    ];

    public function upload()
    {
        return $this->belongsTo(EdkUpload::class, 'edk_upload_id');
    }

    /** Satu filter untuk semua: summary, cards, top-customers, export. */
    public function scopeFilter(Builder $q, EdkUpload $upload, array $f = []): Builder
    {
        $yearStart = $upload->report_date->year . '01';

        return $q->where('edk_upload_id', $upload->id)
            ->when($f['periode'] ?? null, fn ($q, $p) => $p === 'old'
                ? $q->where('periode_edk', '<', $yearStart)
                : $q->where('periode_edk', $p))
            ->when($f['segmen'] ?? null, fn ($q, $v) => $q->where('segmen', $v))
            ->when($f['am'] ?? null, fn ($q, $v) => $q->where('nama_am', $v))
            ->when($f['flag'] ?? null, fn ($q, $v) => $q->where('flag', $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where('nama_pelanggan', 'like', "%{$v}%"));
    }
}
