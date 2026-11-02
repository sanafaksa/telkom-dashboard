<?php

namespace App\Http\Controllers\Edk;

use App\Http\Controllers\Controller;
use App\Models\EdkUpload;
use App\Services\Edk\EdkImporter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EdkUploadController extends Controller
{
    public function index()
    {
        return EdkUpload::with('uploader:id,name')
            ->latest('id')
            ->paginate(20);
    }

    public function store(Request $request, EdkImporter $importer)
    {
        $data = $request->validate([
            'file'        => 'required|file|mimes:xlsx|max:10240',
            'report_date' => 'required|date',
        ]);

        $upload = $importer->import($data['file'], $data['report_date'], $request->user()?->id);

        return response()->json(['message' => 'Upload berhasil.', 'data' => $upload], 201);
    }

    public function activate(EdkUpload $upload)
    {
        abort_unless($upload->status === 'done', 422, 'Hanya snapshot berstatus done yang bisa diaktifkan.');

        DB::transaction(function () use ($upload) {
            EdkUpload::where('is_active', true)->update(['is_active' => false]);
            $upload->update(['is_active' => true]);
        });

        return response()->json(['message' => 'Snapshot diaktifkan.', 'data' => $upload->fresh()]);
    }

    public function template()
    {
        $path = storage_path('app/templates/Template_Import_EDK_Monitoring.xlsx');
        abort_unless(is_file($path), 404, 'Template belum tersedia.');

        return response()->download($path, 'Template_Import_EDK_Monitoring.xlsx');
    }
}
