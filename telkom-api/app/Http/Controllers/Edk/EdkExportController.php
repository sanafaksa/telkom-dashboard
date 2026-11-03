<?php

namespace App\Http\Controllers\Edk;

use App\Http\Controllers\Controller;
use App\Http\Requests\EdkFilterRequest;
use App\Services\Edk\EdkExporter;
use App\Support\Audit;

class EdkExportController extends Controller
{
    public function export(EdkFilterRequest $request, EdkExporter $exporter)
    {
        $upload  = $request->upload();
        $filters = $request->filters();
        $by      = $request->validated('by', 'segmen');
        $format  = $request->validated('format', 'xlsx');
        $name    = "EDK_Monitoring_{$by}_{$upload->report_date->format('Ymd')}.{$format}";

        Audit::log('edk.export', null, [
            'by'        => $by,
            'format'    => $format,
            'upload_id' => $upload->id,
            'filters'   => $filters,
        ]);

        if ($format === 'csv') {
            return $exporter->csv($upload, $filters, $by, $name);
        }

        return response()
            ->download($exporter->xlsx($upload, $filters, $by), $name)
            ->deleteFileAfterSend(true);
    }
}
