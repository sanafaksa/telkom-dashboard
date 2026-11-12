<?php

namespace App\Jobs;

use App\Models\KoreksiJurbalUpload;
use App\Services\KoreksiJurbal\KoreksiJurbalImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ImportKoreksiJurbalUpload implements ShouldQueue
{
    use Queueable;

    /** Import tidak diulang otomatis: hasil gagal dicatat di errors upload. */
    public int $tries = 1;

    public int $timeout = 1800;

    public function __construct(public int $uploadId) {}

    public function handle(KoreksiJurbalImporter $importer): void
    {
        $upload = KoreksiJurbalUpload::find($this->uploadId);
        if ($upload?->status === 'processing') {
            $importer->process($upload);
        }
    }

    public function failed(?\Throwable $e): void
    {
        KoreksiJurbalUpload::where('id', $this->uploadId)->where('status', 'processing')->update([
            'status' => 'failed',
            'errors' => json_encode([['row' => 0, 'messages' => [$e?->getMessage() ?? 'Job import gagal.']]]),
        ]);
    }
}
