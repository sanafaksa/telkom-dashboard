<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EdkMonthlySummary extends Model
{
    protected $fillable = [
        'edk_monthly_upload_id',
        'segment',
        'lanjut_complete_order',
        'lanjut_complete_abonemen_rp',
        'lanjut_in_progress_order',
        'lanjut_in_progress_abonemen_rp',
        'tidak_lanjut_complete_order',
        'tidak_lanjut_complete_abonemen_rp',
        'tidak_lanjut_in_progress_order',
        'tidak_lanjut_in_progress_abonemen_rp',
        'konfirmasi_am_order',
        'konfirmasi_am_abonemen_rp',
        'konfirmasi_am_auto_renewal',
        'konfirmasi_am_in_progress',
        'bukan_witel_solo_jt_order',
        'bukan_witel_solo_jt_abonemen_rp',
        'total_order',
    ];

    public function monthlyUpload(): BelongsTo
    {
        return $this->belongsTo(EdkMonthlyUpload::class, 'edk_monthly_upload_id');
    }
}
