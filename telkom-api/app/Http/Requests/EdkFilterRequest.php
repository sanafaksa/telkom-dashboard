<?php

namespace App\Http\Requests;

use App\Models\EdkUpload;
use App\Services\Edk\EdkImporter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EdkFilterRequest extends FormRequest
{
    private const LIST_KEYS = ['periode', 'segmen', 'am', 'flag'];

    public function authorize(): bool
    {
        return true;
    }

    /** "DGS,DPS" atau segmen[]=DGS → ['DGS','DPS']; segmen & flag di-uppercase. */
    protected function prepareForValidation(): void
    {
        foreach (self::LIST_KEYS as $k) {
            if (!$this->filled($k)) {
                continue;
            }

            $list = $this->input($k);
            $list = is_array($list) ? $list : explode(',', (string) $list);
            $list = array_values(array_filter(array_map('trim', $list), fn ($v) => $v !== ''));

            if (in_array($k, ['segmen', 'flag'], true)) {
                $list = array_map('strtoupper', $list);
            }

            $this->merge([$k => $list]);
        }
    }

    public function rules(): array
    {
        return [
            'upload_id' => 'nullable|integer',
            'periode'   => 'nullable|array',
            'periode.*' => ['regex:/^(old|\d{6})$/'],
            'segmen'    => 'nullable|array',
            'segmen.*'  => [Rule::in(EdkImporter::SEGMEN)],
            'am'        => 'nullable|array',
            'am.*'      => 'string|max:255',
            'flag'      => 'nullable|array',
            'flag.*'    => [Rule::in(['NEW', 'UPDATED', 'UNCHANGED'])],
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
            fn ($v) => $v !== null && $v !== '' && $v !== []
        );
    }
}
