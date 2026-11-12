<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class KoreksiJurbalImportException extends RuntimeException
{
    /** @param array<int, array{row:int, messages:string[]}> $errors */
    public function __construct(public readonly array $errors)
    {
        parent::__construct('Import Koreksi & Jurbal gagal: ' . count($errors) . ' baris bermasalah.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message'      => $this->getMessage(),
            'total_errors' => count($this->errors),
            'errors'       => array_slice($this->errors, 0, 200),
        ], 422);
    }
}
