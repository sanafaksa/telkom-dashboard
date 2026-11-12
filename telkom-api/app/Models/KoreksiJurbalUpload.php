<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KoreksiJurbalUpload extends Model
{
    protected $fillable = [
        'original_name', 'file_hash', 'file_path', 'segmen', 'sheet_names', 'periode',
        'status', 'scanned_rows', 'total_rows', 'errors', 'uploaded_by',
    ];

    protected $hidden = ['file_path'];

    protected $casts = [
        'periode'      => 'integer',
        'scanned_rows' => 'integer',
        'total_rows'   => 'integer',
        'errors'       => 'array',
    ];

    public function entries()  { return $this->hasMany(KoreksiJurbalEntry::class); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
}
