<?php

namespace App\Imports;

use App\Models\EdkRecord;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\Importable;

class EdkImport implements ToCollection, WithHeadingRow, WithValidation
{
    use Importable;

    public function collection(Collection $rows)
    {
        // Kosong dulu; proses simpan akan dilakukan di controller setelah validasi/preview
        // sesuai prinsip sederhana & aman.
    }

    public function rules(): array
    {
        return [
            '*.po_number' => ['nullable', 'string', 'max:255'],
            '*.customer_name' => ['nullable', 'string', 'max:255'],
            '*.status' => ['nullable', 'string', 'max:100'],
            '*.warehouse' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function headingRow(): int
    {
        return 1;
    }
}
