<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;

class PreviewEdkSheet implements ToArray
{
    private PreviewEdkImport $parent;

    public function __construct(PreviewEdkImport $parent)
    {
        $this->parent = $parent;
    }

    public function array(array $array): void
    {
        $this->parent->rows = $array;
    }
}
