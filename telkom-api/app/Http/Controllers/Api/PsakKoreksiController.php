<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsakKoreksiUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Koreksi & Jurbal PSAK: data upload terakhir disimpan di database. */
class PsakKoreksiController extends Controller
{
    /** GET /api/koreksi-psak: data aktif, atau data null jika belum pernah diupload. */
    public function index(): JsonResponse
    {
        $latest = PsakKoreksiUpload::query()->latest('id')->first();

        return response()->json(['data' => $latest ? $this->present($latest) : null]);
    }

    /** POST /api/koreksi-psak: simpan hasil parse Excel dari frontend sebagai data aktif. */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'filename'          => 'nullable|string|max:255',
            'period.reverse'    => 'required|string|max:20',
            'period.correction' => 'required|string|max:20',
            'rows'              => 'required|array|min:1|max:500',
            'rows.*.segmen'     => 'required|string|max:120',
            'rows.*.reverse'    => 'required|numeric',
            'rows.*.correction' => 'required|numeric',
            'rows.*.net'        => 'required|numeric',
            'rows.*.psak'       => 'required|array',
            'rows.*.psak.*'     => 'numeric',
        ]);

        $rows = array_map(fn ($r) => [
            'segmen'     => $r['segmen'],
            'reverse'    => $r['reverse'],
            'correction' => $r['correction'],
            'net'        => $r['net'],
            'psak'       => $r['psak'],
        ], $payload['rows']);

        $upload = PsakKoreksiUpload::create([
            'filename'          => $payload['filename'] ?? null,
            'period_reverse'    => $payload['period']['reverse'],
            'period_correction' => $payload['period']['correction'],
            'row_count'         => count($rows),
            'rows'              => $rows,
        ]);

        return response()->json(['data' => $this->present($upload)], 201);
    }

    private function present(PsakKoreksiUpload $u): array
    {
        return [
            'period' => ['reverse' => $u->period_reverse, 'correction' => $u->period_correction],
            'rows'   => $u->rows,
            'source' => ['filename' => $u->filename, 'uploadedAt' => $u->created_at?->toIso8601String()],
        ];
    }
}
