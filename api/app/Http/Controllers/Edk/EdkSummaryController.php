<?php

namespace App\Http\Controllers\Edk;

use App\Http\Controllers\Controller;
use App\Http\Requests\EdkFilterRequest;
use App\Models\EdkUpload;
use App\Services\Edk\EdkSummaryService;
use Closure;
use Illuminate\Support\Facades\Cache;

class EdkSummaryController extends Controller
{
    public function __construct(private EdkSummaryService $service) {}

    public function summary(EdkFilterRequest $request, string $by)
    {
        $upload  = $request->upload();
        $filters = $request->filters();

        return $this->cached("summary:{$by}", $upload, $filters,
            fn () => $this->service->summary($upload, $filters, $by));
    }

    public function cards(EdkFilterRequest $request)
    {
        $upload  = $request->upload();
        $filters = $request->filters();

        return $this->cached('cards', $upload, $filters,
            fn () => $this->service->cards($upload, $filters));
    }

    public function options(EdkFilterRequest $request)
    {
        $upload = $request->upload();

        return $this->cached('options', $upload, [],
            fn () => $this->service->options($upload));
    }

    public function topCustomers(EdkFilterRequest $request)
    {
        $upload  = $request->upload();
        $filters = $request->filters();
        $limit   = (int) $request->validated('limit', 10);
        $sort    = $request->validated('sort', 'abonemen_desc');
        $status  = $request->validated('status');
        $progress = $request->validated('progress', 'all');

        return $this->cached('top', $upload, $filters + compact('limit', 'sort', 'status', 'progress'),
            fn () => $this->service->topCustomers($upload, $filters, $limit, $sort, $status, $progress));
    }

    public function customerDetails(EdkFilterRequest $request)
    {
        $upload = $request->upload();
        $filters = $request->filters();
        $customerKey = $request->validated('customer_key');
        abort_if($customerKey === null || $customerKey === '', 422, 'customer_key wajib diisi.');

        $status = $request->validated('status');
        $progress = $request->validated('progress', 'all');

        return $this->cached('customer-detail', $upload, $filters + compact('customerKey', 'status', 'progress'),
            fn () => $this->service->customerDetails($upload, $filters, $customerKey, $status, $progress));
    }

    /**
     * Snapshot immutable → aman di-cache selamanya per upload_id + hash filter.
     * Naikkan versi cache jika bentuk response/logika query diubah.
     */
    private function cached(string $type, EdkUpload $upload, array $params, Closure $fn): array
    {
        ksort($params);
        $key = "edk:v2:{$type}:{$upload->id}:" . md5(json_encode($params));

        return Cache::rememberForever($key, fn () => json_decode(json_encode($fn()), true));
    }
}
