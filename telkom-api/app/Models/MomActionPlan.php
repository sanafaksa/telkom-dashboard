<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MomActionPlan extends Model
{
    protected $table = 'mom_action_plans';

    protected $fillable = [
        'no',
        'tgl',
        'agenda',
        'main_topic',
        'unit_telda',
        'peserta',
        'pembahasan',
        'pembahasan_notulen',
        'action_plan',
        'uic',
        'destinasi_fu',
        'support_needed',
        'deadline',
        'status',
        'notes',
    ];
}

