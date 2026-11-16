<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HelpRequest;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Kotak masuk aduan lupa kata sandi (permission inbox.manage: Admin & Support). */
class HelpRequestController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status', HelpRequest::OPEN);
        $query = HelpRequest::query()->with('handler:id,name')->latest();

        if (in_array($status, [HelpRequest::OPEN, HelpRequest::DONE], true)) {
            $query->where('status', $status);
        }

        $items = $query->limit(200)->get()->map(fn (HelpRequest $r) => [
            'id'         => $r->id,
            'name'       => $r->name,
            'nip'        => $r->nip,
            'contact'    => $r->contact,
            'message'    => $r->message,
            'status'     => $r->status,
            'created_at' => $r->created_at?->toIso8601String(),
            'handled_by' => $r->handler?->name,
            'handled_at' => $r->handled_at?->toIso8601String(),
        ]);

        return response()->json(['items' => $items, 'open' => HelpRequest::where('status', HelpRequest::OPEN)->count()]);
    }

    public function update(Request $request, HelpRequest $helpRequest)
    {
        $data = $request->validate(['status' => 'required|in:open,done']);
        $actor = $request->user();
        $before = $helpRequest->status;

        $helpRequest->update([
            'status'     => $data['status'],
            'handled_by' => $data['status'] === HelpRequest::DONE ? $actor->id : null,
            'handled_at' => $data['status'] === HelpRequest::DONE ? Carbon::now() : null,
        ]);

        if ($before !== $data['status']) {
            Audit::log('help_request.status', $helpRequest, ['dari' => $before, 'ke' => $data['status']]);
        }

        return response()->json(['id' => $helpRequest->id, 'status' => $helpRequest->status]);
    }
}
