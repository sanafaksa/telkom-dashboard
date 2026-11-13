<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MomActionPlan;
use App\Models\MomUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MomSupportController extends Controller
{
    /**
     * GET /api/mom-support
     * Mengambil semua butir Action Plan & Support Needed dari tabel MySQL mom_action_plans.
     */
    public function index(): JsonResponse
    {
        $rows = MomActionPlan::orderBy('id')->get();
        return response()->json([
            'success' => true,
            'source' => 'mysql',
            'items'  => $rows->map(fn ($r) => self::toCamelItem($r->toArray()))->all(),
        ]);
    }

    /**
     * POST /api/mom-support/sync
     * Menerima hasil bacaan CSV / Excel Notulensi dari frontend dan menyimpannya ke MySQL.
     */
    public function sync(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'filename'   => 'nullable|string|max:255',
            'sheet_name' => 'nullable|string|max:100',
            'mode'       => 'nullable|string|in:replace,append',
            'items'      => 'required|array|min:1',
        ]);

        $mode = $payload['mode'] ?? 'replace';
        $now = now();
        $records = [];

        foreach ($payload['items'] as $idx => $it) {
            $records[] = [
                'no'                 => (string) ($it['no'] ?? ($idx + 1)),
                'tgl'                => (string) ($it['tgl'] ?? 'N/A'),
                'agenda'             => (string) ($it['agenda'] ?? 'FORUM WITEL'),
                'main_topic'         => (string) ($it['mainTopic'] ?? $it['main_topic'] ?? 'Umum'),
                'unit_telda'         => (string) ($it['unitTelda'] ?? $it['unit_telda'] ?? 'PRQ'),
                'peserta'            => (string) ($it['peserta'] ?? ''),
                'pembahasan'         => (string) ($it['pembahasan'] ?? ''),
                'pembahasan_notulen' => (string) ($it['pembahasanNotulen'] ?? $it['pembahasan_notulen'] ?? ''),
                'action_plan'        => (string) ($it['actionPlan'] ?? $it['action_plan'] ?? '(Tidak ada rincian aksi)'),
                'uic'                => (string) ($it['uic'] ?? 'PRQ'),
                'destinasi_fu'       => (string) ($it['destinasiFu'] ?? $it['destinasi_fu'] ?? '-'),
                'support_needed'     => (string) ($it['supportNeeded'] ?? $it['support_needed'] ?? '-'),
                'deadline'           => (string) ($it['deadline'] ?? '-'),
                'status'             => (string) ($it['status'] ?? 'BELUM FU'),
                'notes'              => (string) ($it['notes'] ?? ''),
                'created_at'         => $now,
                'updated_at'         => $now,
            ];
        }

        DB::transaction(function () use ($mode, $records, $payload) {
            if ($mode === 'replace') {
                MomActionPlan::query()->delete();
            }

            foreach (array_chunk($records, 100) as $chunk) {
                MomActionPlan::insert($chunk);
            }

            MomUpload::create([
                'filename'   => $payload['filename'] ?? 'Notulensi_Rapat_GM.xlsx',
                'sheet_name' => $payload['sheet_name'] ?? 'Notulensi Tracker',
                'row_count'  => count($records),
            ]);
        });

        $all = MomActionPlan::orderBy('id')->get();

        return response()->json([
            'success'   => true,
            'message'   => 'Data MoM & Support Needed berhasil disimpan ke MySQL.',
            'row_count' => count($records),
            'items'     => $all->map(fn ($r) => self::toCamelItem($r->toArray()))->all(),
        ]);
    }

    /**
     * PUT /api/mom-support/{id}
     * Menyimpan perubahan ketika user mengedit langsung Action Plan / Status / Support Needed di modal detail.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $plan = MomActionPlan::findOrFail($id);

        $plan->update([
            'no'                 => (string) ($request->input('no', $plan->no)),
            'tgl'                => (string) ($request->input('tgl', $plan->tgl)),
            'agenda'             => (string) ($request->input('agenda', $plan->agenda)),
            'main_topic'         => (string) ($request->input('mainTopic', $request->input('main_topic', $plan->main_topic))),
            'unit_telda'         => (string) ($request->input('unitTelda', $request->input('unit_telda', $plan->unit_telda))),
            'peserta'            => (string) ($request->input('peserta', $plan->peserta)),
            'pembahasan'         => (string) ($request->input('pembahasan', $plan->pembahasan)),
            'pembahasan_notulen' => (string) ($request->input('pembahasanNotulen', $request->input('pembahasan_notulen', $plan->pembahasan_notulen))),
            'action_plan'        => (string) ($request->input('actionPlan', $request->input('action_plan', $plan->action_plan))),
            'uic'                => (string) ($request->input('uic', $plan->uic)),
            'destinasi_fu'       => (string) ($request->input('destinasiFu', $request->input('destinasi_fu', $plan->destinasi_fu))),
            'support_needed'     => (string) ($request->input('supportNeeded', $request->input('support_needed', $plan->support_needed))),
            'deadline'           => (string) ($request->input('deadline', $plan->deadline)),
            'status'             => (string) ($request->input('status', $plan->status)),
            'notes'              => (string) ($request->input('notes', $plan->notes)),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Perubahan Action Plan berhasil disimpan ke MySQL.',
            'item'    => self::toCamelItem($plan->fresh()->toArray()),
        ]);
    }

    /**
     * POST /api/mom-support
     * Tambah butir Action Plan & Support Needed secara manual (input dari form, sesuai kolom Notulensi Tracker).
     */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'no'                => 'nullable|string|max:20',
            'tgl'               => 'required|string|max:30',
            'agenda'            => 'required|string|max:120',
            'mainTopic'         => 'required|string|max:255',
            'unitTelda'         => 'nullable|string|max:100',
            'peserta'           => 'nullable|string',
            'pembahasan'        => 'nullable|string',
            'pembahasanNotulen' => 'nullable|string',
            'actionPlan'        => 'required|string',
            'uic'               => 'nullable|string|max:150',
            'destinasiFu'       => 'nullable|string|max:255',
            'supportNeeded'     => 'nullable|string',
            'deadline'          => 'nullable|string|max:80',
            'status'            => 'nullable|string|in:DONE,IN PROGRESS,NEED DISCUSS,BELUM FU',
            'notes'             => 'nullable|string',
        ]);

        // NO kosong = lanjutkan nomor rapat terbesar yang sudah ada.
        $no = trim((string) ($payload['no'] ?? ''));
        if ($no === '') {
            $maxNo = MomActionPlan::query()->pluck('no')
                ->filter(fn ($n) => ctype_digit(trim((string) $n)))
                ->map(fn ($n) => (int) $n)
                ->max() ?? 0;
            $no = (string) ($maxNo + 1);
        }

        $item = MomActionPlan::create([
            'no'                 => $no,
            'tgl'                => $payload['tgl'],
            'agenda'             => $payload['agenda'],
            'main_topic'         => $payload['mainTopic'],
            'unit_telda'         => $this->orDefault($payload['unitTelda'] ?? null, 'PRQ'),
            'peserta'            => (string) ($payload['peserta'] ?? ''),
            'pembahasan'         => (string) ($payload['pembahasan'] ?? ''),
            'pembahasan_notulen' => (string) ($payload['pembahasanNotulen'] ?? ''),
            'action_plan'        => $payload['actionPlan'],
            'uic'                => $this->orDefault($payload['uic'] ?? null, '-'),
            'destinasi_fu'       => $this->orDefault($payload['destinasiFu'] ?? null, '-'),
            'support_needed'     => $this->orDefault($payload['supportNeeded'] ?? null, '-'),
            'deadline'           => $this->orDefault($payload['deadline'] ?? null, '-'),
            'status'             => $payload['status'] ?? 'BELUM FU',
            'notes'              => (string) ($payload['notes'] ?? ''),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Butir Action Plan berhasil ditambahkan ke MySQL.',
            'item'    => self::toCamelItem($item->fresh()->toArray()),
        ], 201);
    }

    /**
     * DELETE /api/mom-support/{id}
     * Hapus satu butir Action Plan & Support Needed.
     */
    public function destroy(int $id): JsonResponse
    {
        MomActionPlan::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Butir Action Plan berhasil dihapus dari MySQL.',
            'id'      => $id,
        ]);
    }

    private function orDefault(?string $value, string $default): string
    {
        $value = trim((string) $value);
        return $value === '' ? $default : $value;
    }

    /**
     * POST /api/mom-support/reset
     * Mengembalikan isi tabel mom_action_plans ke data seed awal (21 baris Notulensi Tracker).
     */
    public function reset(): JsonResponse
    {
        $seedFile = base_path('database/seeders/mom_seed_data.json');
        if (file_exists($seedFile)) {
            $rows = json_decode((string) file_get_contents($seedFile), true);
            if (is_array($rows) && count($rows) > 0) {
                MomActionPlan::query()->delete();
                MomActionPlan::insert($rows);
            }
        }

        $all = MomActionPlan::orderBy('id')->get();
        return response()->json([
            'success' => true,
            'message' => 'Data MoM & Support Needed dikembalikan ke data awal di MySQL.',
            'items'   => $all->map(fn ($r) => self::toCamelItem($r->toArray()))->all(),
        ]);
    }

    public static function toCamelItem(array $r): array
    {
        return [
            'id'                => (int) $r['id'],
            'no'                => (string) ($r['no'] ?? ''),
            'tgl'               => (string) ($r['tgl'] ?? ''),
            'agenda'            => (string) ($r['agenda'] ?? ''),
            'mainTopic'         => (string) ($r['main_topic'] ?? ''),
            'unitTelda'         => (string) ($r['unit_telda'] ?? ''),
            'peserta'           => (string) ($r['peserta'] ?? ''),
            'pembahasan'        => (string) ($r['pembahasan'] ?? ''),
            'pembahasanNotulen' => (string) ($r['pembahasan_notulen'] ?? ''),
            'actionPlan'        => (string) ($r['action_plan'] ?? ''),
            'uic'               => (string) ($r['uic'] ?? ''),
            'destinasiFu'       => (string) ($r['destinasi_fu'] ?? '-'),
            'supportNeeded'     => (string) ($r['support_needed'] ?? '-'),
            'deadline'          => (string) ($r['deadline'] ?? '-'),
            'status'            => (string) ($r['status'] ?? 'BELUM FU'),
            'notes'             => (string) ($r['notes'] ?? ''),
        ];
    }
}

