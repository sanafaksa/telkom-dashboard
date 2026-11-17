<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Satu notulensi rapat. Action plan-nya ada di MomActionPlan. */
class MomMeeting extends Model
{
    protected $table = 'mom_meetings';

    protected $fillable = [
        'no',
        'tgl',
        'agenda',
        'main_topic',
        'unit_telda',
        'peserta',
        'pembahasan',
        'pembahasan_notulen',
    ];

    public function actionPlans(): HasMany
    {
        return $this->hasMany(MomActionPlan::class, 'mom_meeting_id')->orderBy('id');
    }
}
