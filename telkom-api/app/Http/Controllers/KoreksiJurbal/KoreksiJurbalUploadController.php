<?php

namespace App\Http\Controllers\KoreksiJurbal;

use App\Exceptions\KoreksiJurbalImportException;
use App\Http\Controllers\Controller;
use App\Models\KoreksiJurbalUpload;
use App\Services\KoreksiJurbal\KoreksiJurbalImporter;
use App\Services\KoreksiJurbal\KoreksiJurbalSummary;
use App\Support\Audit;
use Illuminate\Http\Request;

class KoreksiJurbalUploadController extends Controller
{
    public function index()
    {
        return KoreksiJurbalUpload::with('uploader:id,name')
            ->latest('id')
            ->paginate(20)
            ->through(fn (KoreksiJurbalUpload $u) => $u
                ->setAttribute('error_count', count($u->errors ?? []))
                ->setAttribute('first_error', $u->errors[0] ?? null)
                ->makeHidden('errors'));
    }

    /** Rekap tabel per segmen dari upload terbaru masing-masing segmen. */
    public function summary(KoreksiJurbalSummary $summary)
    {
        return response()->json($summary->build());
    }

    /** File disimpan lalu diimport di queue → 202, status dipantau lewat GET uploads. */
    public function store(Request $request, KoreksiJurbalImporter $importer)
    {
        $data = $request->validate([
            'file' => 'required|file|mimes:xlsx|max:' . config('koreksi_jurbal.max_kb'),
        ]);

        try {
            $upload = $importer->queue($data['file'], $request->user()?->id);
        } catch (KoreksiJurbalImportException $e) {
            Audit::log('koreksi_jurbal.upload_failed', null, [
                'original_name' => $data['file']->getClientOriginalName(),
                'error_count'   => count($e->errors),
            ]);
            throw $e;
        }

        Audit::log('koreksi_jurbal.upload', $upload, [
            'original_name' => $upload->original_name,
        ]);

        return response()->json([
            'message' => 'File diterima, sedang diproses.',
            'data'    => $upload->fresh(),
        ], 202);
    }
}
