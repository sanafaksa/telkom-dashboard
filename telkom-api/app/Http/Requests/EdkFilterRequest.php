<?php

namespace App\Http\Requests;

use App\Models\EdkUpload;
use App\Services\Edk\EdkImporter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EdkFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['segmen', 'flag'] as $k) {
            if ($this->filled($k)) {
                $this->merge([$k => strtoupper($this->input($k))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'upload_id' => 'nullable|integer',
            'periode'   => ['nullable', 'regex:/^(old|\d{6})$/'],
            'segmen'    => ['nullable', Rule::in(EdkImporter::SEGMEN)],
            'am'        => 'nullable|string|max:255',
            'flag'      => ['nullable', Rule::in(['NEW', 'UPDATED', 'UNCHANGED'])],
            'q'         => 'nullable|string|max:100',
            'sort'      => ['nullable', Rule::in(['abonemen_desc', 'abonemen_asc', 'nama_asc', 'order_desc'])],
            'limit'     => 'nullable|integer|min:1|max:100',
            'by'        => ['nullable', Rule::in(['segmen', 'periode', 'am', 'cc'])],
            'format'    => ['nullable', Rule::in(['xlsx', 'csv'])],
        ];
    }

    /** Snapshot yang dipakai: upload_id (kunci link report) atau snapshot aktif. */
    public function upload(): EdkUpload
    {
        $id = $this->validated('upload_id');

        $upload = $id
            ? EdkUpload::where('status', 'done')->find($id)
            : EdkUpload::active()->first();

        abort_if(!$upload, 404, 'Belum ada snapshot EDK. Silakan upload file terlebih dahulu.');

        return $upload;
    }

    /** Filter yang diteruskan ke EdkRecord::scopeFilter() */
    public function filters(): array
    {
        return array_filter(
            $this->safe()->only(['periode', 'segmen', 'am', 'flag', 'q']),
            fn ($v) => $v !== null && $v !== ''
        );
    }
}
