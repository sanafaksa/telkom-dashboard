<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Action plan milik satu notulensi (MomMeeting). */
class MomActionPlan extends Model
{
    protected $table = 'mom_action_plans';

    protected $fillable = [
        'mom_meeting_id',
        'action_plan',
        'uic',
        'destinasi_fu',
        'support_needed',
        'deadline',
        'status',
        'support_clear',
        'notes',
    ];

    protected $casts = [
        'support_clear' => 'boolean',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(MomMeeting::class, 'mom_meeting_id');
    }
}
