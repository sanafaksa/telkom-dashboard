<?php

namespace App\Http\Controllers\Edk;

use App\Exceptions\EdkImportException;
use App\Http\Controllers\Controller;
use App\Models\EdkUpload;
use App\Services\Edk\EdkImporter;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EdkUploadController extends Controller
{
    private const TEMPLATE = 'Template_Import_EDK_Monitoring_SOLO_JT_Okt2026_9kolom.xlsx';

    public function populations()
    {
        return EdkUpload::query()
            ->where('status', 'done')
            ->orderByDesc('id')
            ->get(['id', 'report_date', 'periode_edk', 'original_name', 'status', 'is_active', 'total_rows', 'created_at']);
    }

    public function index()
    {
        return EdkUpload::with(['uploader:id,name', 'activator:id,name'])
            ->latest('id')
            ->paginate(20)
            ->through(fn (EdkUpload $u) => $u
                ->setAttribute('error_count', count($u->errors ?? []))
                ->makeHidden('errors'));
    }

    public function store(Request $request, EdkImporter $importer)
    {
        $data = $request->validate([
            'file'        => 'required|file|mimes:xlsx|max:10240',
            'report_date' => 'required|date',
            'periode_edk' => 'required|string|max:10',
        ]);

        try {
            $upload = $importer->import($data['file'], $data['report_date'], $request->user()?->id, $data['periode_edk']);

        } catch (EdkImportException $e) {
            Audit::log('edk.upload_failed', null, [
                'original_name' => $data['file']->getClientOriginalName(),
                'report_date'   => $data['report_date'],
                'error_count'   => count($e->errors),
            ]);
            throw $e;
        }

        Audit::log('edk.upload', $upload, [
            'original_name' => $upload->original_name,
            'report_date'   => $upload->report_date->toDateString(),
            'total_rows'    => $upload->total_rows,
        ]);

        return response()->json(['message' => 'Upload berhasil.', 'data' => $upload], 201);
    }

    public function activate(Request $request, EdkUpload $upload)
    {
        abort_unless($upload->status === 'done', 422, 'Hanya snapshot berstatus done yang bisa diaktifkan.');

        $previousId = EdkUpload::active()->value('id');

        DB::transaction(function () use ($upload, $request) {
            EdkUpload::where('is_active', true)->update(['is_active' => false]);
            $upload->update([
                'is_active'    => true,
                'activated_by' => $request->user()?->id,
                'activated_at' => now(),
            ]);
        });

        Audit::log('edk.activate', $upload, [
            'report_date'        => $upload->report_date->toDateString(),
            'previous_active_id' => $previousId,
        ]);

        return response()->json(['message' => 'Snapshot diaktifkan.', 'data' => $upload->fresh()]);
    }

    public function template()
    {
        $path = base_path('../data/' . self::TEMPLATE);
        abort_unless(is_file($path), 404, 'File template EDK tidak ditemukan di folder data.');

        return response()->download($path, self::TEMPLATE);
    }
}
