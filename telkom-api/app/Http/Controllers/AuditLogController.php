<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'action'  => 'nullable|string|max:50',
            'user_id' => 'nullable|integer',
        ]);

        return AuditLog::with('user:id,name,email')
            ->when($data['action'] ?? null, fn ($q, $v) => $q->where('action', $v))
            ->when($data['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->latest('id')
            ->paginate(30);
    }
}
