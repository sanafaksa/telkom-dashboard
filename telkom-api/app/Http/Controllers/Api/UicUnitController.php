<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/** Master UIC bertingkat untuk dropdown (baca saja). */
class UicUnitController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = DB::table('uic_units')->orderBy('id')->get();

        $byParent = [];
        foreach ($rows as $r) {
            $byParent[$r->parent_id ?? 0][] = $r;
        }

        $build = function ($parentId) use (&$build, $byParent) {
            return collect($byParent[$parentId] ?? [])->map(fn ($r) => [
                'id'              => $r->id,
                'name'            => $r->name,
                'level'           => $r->level,
                'is_custom_input' => (bool) $r->is_custom_input,
                'children'        => $build($r->id),
            ])->values()->all();
        };

        return response()->json(['tree' => $build(0)]);
    }
}
