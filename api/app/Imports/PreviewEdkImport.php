<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\Import;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class PreviewEdkImport implements Import, WithMultipleSheets
{
    public array $rows = [];

    public function sheets(): array
    {
        return [
            'DATA_EDK' => new PreviewEdkSheet($this),
        ];
    }
}
