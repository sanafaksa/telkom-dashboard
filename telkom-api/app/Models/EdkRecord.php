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
            ->when($f['periode'] ?? null, function ($q, $list) use ($yearStart) {
                $list  = (array) $list;
                $exact = array_values(array_diff($list, ['old']));

                $q->where(function ($w) use ($list, $exact, $yearStart) {
                    if (in_array('old', $list, true)) {
                        $w->orWhere('periode_edk', '<', $yearStart);
                    }
                    if ($exact) {
                        $w->orWhereIn('periode_edk', $exact);
                    }
                });
            })
            ->when($f['segmen'] ?? null, fn ($q, $v) => $q->whereIn('segmen', (array) $v))
            ->when($f['am'] ?? null, fn ($q, $v) => $q->whereIn('nama_am', (array) $v))
            ->when($f['flag'] ?? null, fn ($q, $v) => $q->whereIn('flag', (array) $v))
            ->when($f['q'] ?? null, fn ($q, $v) => $q->where('nama_pelanggan', 'like', "%{$v}%"));
    }
}
