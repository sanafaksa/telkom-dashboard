<?php

namespace App\Http\Controllers\Edk;

use App\Http\Controllers\Controller;
use App\Http\Requests\EdkFilterRequest;
use App\Services\Edk\EdkExporter;

class EdkExportController extends Controller
{
    public function export(EdkFilterRequest $request, EdkExporter $exporter)
    {
        $upload = $request->upload();
        $by     = $request->validated('by', 'segmen');
        $format = $request->validated('format', 'xlsx');
        $name   = "EDK_Monitoring_{$by}_{$upload->report_date->format('Ymd')}.{$format}";

        if ($format === 'csv') {
            return $exporter->csv($upload, $request->filters(), $by, $name);
        }

        return response()
            ->download($exporter->xlsx($upload, $request->filters(), $by), $name)
            ->deleteFileAfterSend(true);
    }
}
