<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsakKoreksiUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\Exception\ProcessTimedOutException;

/** Koreksi & Jurbal PSAK: data upload terakhir disimpan di database. */
class PsakKoreksiController extends Controller
{
    /**
     * Ukuran chunk upload (byte). Harus sama dengan CHUNK_SIZE di frontend (lib/psakData.js).
     * Kecil supaya tiap request di bawah batas body nginx dan post_max_size PHP.
     */
    private const CHUNK_SIZE = 1000000;

    /** Batas per file (byte): 300 MB. */
    private const MAX_FILE_SIZE = 300 * 1024 * 1024;

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

    /**
     * POST /api/koreksi-psak/upload/chunk: terima satu potongan file (body mentah, bukan multipart).
     * Header: X-Upload-Id (uuid sesi), X-File-Slot (0-3), X-Chunk-Index (mulai 0).
     * Body mentah tidak kena upload_max_filesize / post_max_size, jadi tidak perlu ubah php.ini.
     */
    public function uploadChunk(Request $request): JsonResponse
    {
        $uploadId = (string) $request->header('X-Upload-Id');
        $slot = $request->header('X-File-Slot');
        $index = $request->header('X-Chunk-Index');

        if (! $this->isValidUploadId($uploadId) || ! ctype_digit((string) $slot) || (int) $slot > 3
            || ! ctype_digit((string) $index)) {
            return response()->json(['message' => 'Header upload tidak valid.'], 422);
        }

        $slot = (int) $slot;
        $expectedOffset = (int) $index * self::CHUNK_SIZE;
        if ($expectedOffset >= self::MAX_FILE_SIZE) {
            return response()->json(['message' => 'File terlalu besar (maks 300 MB per file).'], 413);
        }

        $dir = $this->sessionDir($uploadId);
        File::ensureDirectoryExists($dir);
        $path = $dir.DIRECTORY_SEPARATOR.$slot.'.xlsx';

        $currentSize = is_file($path) ? filesize($path) : 0;
        if ($currentSize !== $expectedOffset) {
            return response()->json(['message' => 'Urutan potongan file tidak sesuai. Ulangi upload.'], 409);
        }

        $in = $request->getContent(true);
        $out = fopen($path, 'ab');
        $written = stream_copy_to_stream($in, $out);
        fclose($out);

        if ($written > self::CHUNK_SIZE) {
            // Potongan lebih besar dari yang disepakati: potong balik supaya offset tetap konsisten
            $handle = fopen($path, 'r+b');
            ftruncate($handle, $expectedOffset);
            fclose($handle);

            return response()->json(['message' => 'Ukuran potongan melebihi batas.'], 413);
        }

        return response()->json(['received' => $expectedOffset + $written]);
    }

    /**
     * POST /api/koreksi-psak/upload/finish: setelah 4 file lengkap dikirim per chunk, hitung di server
     * dengan scripts/psak_extract.py, lalu simpan sebagai data aktif.
     */
    public function uploadFinish(Request $request): JsonResponse
    {
        $uploadId = (string) $request->input('upload_id');
        if (! $this->isValidUploadId($uploadId)) {
            return response()->json(['message' => 'Sesi upload tidak valid.'], 422);
        }

        $dir = $this->sessionDir($uploadId);
        $paths = [];
        for ($slot = 0; $slot < 4; $slot++) {
            $path = $dir.DIRECTORY_SEPARATOR.$slot.'.xlsx';
            if (! is_file($path) || filesize($path) === 0) {
                return response()->json(['message' => 'Upload belum lengkap: pilih dan kirim 4 file.'], 422);
            }
            $paths[] = $path;
        }

        set_time_limit(0);
        try {
            $result = Process::timeout(config('psak.timeout'))->run(
                array_merge([config('psak.python'), '-I', config('psak.script')], $paths)
            );
        } catch (ProcessTimedOutException) {
            return response()->json(['message' => 'Proses terlalu lama. Coba lagi atau kurangi ukuran file.'], 422);
        } finally {
            File::deleteDirectory($dir);
        }

        $payload = json_decode($result->output(), true);

        if (! $result->successful() || ! is_array($payload) || isset($payload['error'])) {
            $detail = $payload['error'] ?? trim($result->errorOutput()) ?: 'script tidak menghasilkan output';
            Log::error('PSAK extract gagal', ['exit' => $result->exitCode(), 'detail' => $detail]);

            return response()->json([
                'message' => 'Gagal memproses file: '.mb_substr($detail, 0, 300),
            ], 422);
        }

        $upload = PsakKoreksiUpload::create([
            'filename'          => mb_substr(implode(', ', array_values($payload['sources'])), 0, 255),
            'period_reverse'    => $payload['period']['reverse'],
            'period_correction' => $payload['period']['correction'],
            'row_count'         => count($payload['rows']),
            'rows'              => $payload['rows'],
        ]);

        return response()->json(['data' => $this->present($upload)], 201);
    }

    private function isValidUploadId(string $id): bool
    {
        return (bool) preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $id);
    }

    private function sessionDir(string $uploadId): string
    {
        return storage_path('app'.DIRECTORY_SEPARATOR.'psak-upload-tmp'.DIRECTORY_SEPARATOR.$uploadId);
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
