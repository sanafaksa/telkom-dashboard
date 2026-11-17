<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MomActionPlan;
use App\Models\MomMeeting;
use App\Models\MomUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Notulensi (mom_meetings) berisi beberapa action plan (mom_action_plans).
 * Respons daftar tetap "flat" (satu item per action plan, data notulensi ikut di dalamnya),
 * jadi tampilan lain tidak perlu berubah. Edit notulensi cukup di satu baris dan semua
 * action plan-nya ikut berubah.
 */
class MomSupportController extends Controller
{
    private const STATUSES = 'DONE,IN PROGRESS,NEED DISCUSS,BELUM FU';

    /** GET /api/mom-support */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'source'  => 'mysql',
            'items'   => $this->allItems(),
        ]);
    }

    /** POST /api/mom-support/sync — hasil baca Excel/CSV. Butir dengan notulensi yang sama masuk ke satu notulensi. */
    public function sync(Request $request): JsonResponse
    {
        // Batas panjang mengikuti kolom tabel. Data yang melebihi batas ditolak dengan pesan jelas (422).
        $payload = $request->validate([
            'filename'            => 'nullable|string|max:255',
            'sheet_name'          => 'nullable|string|max:100',
            'mode'                => 'nullable|string|in:replace,append',
            'items'               => 'required|array|min:1',
            'items.*.no'          => 'nullable|string|max:50',
            'items.*.tgl'         => 'nullable|string|max:100',
            'items.*.agenda'      => 'nullable|string|max:120',
            'items.*.mainTopic'   => 'nullable|string|max:255',
            'items.*.unitTelda'   => 'nullable|string|max:500',
            'items.*.uic'         => 'nullable|string|max:150',
            'items.*.destinasiFu' => 'nullable|string|max:255',
            'items.*.deadline'    => 'nullable|string|max:255',
            'items.*.status'      => 'nullable|string|max:30',
        ]);

        $mode = $payload['mode'] ?? 'replace';

        DB::transaction(function () use ($mode, $payload) {
            if ($mode === 'replace') {
                MomActionPlan::query()->delete();
                MomMeeting::query()->delete();
            }

            foreach ($payload['items'] as $idx => $it) {
                $meeting = $this->findOrCreateMeeting($this->meetingFromSyncItem($it, $idx));

                MomActionPlan::create($this->actionFromSyncItem($it) + ['mom_meeting_id' => $meeting->id]);
            }

            MomUpload::create([
                'filename'   => $payload['filename'] ?? 'Notulensi_Rapat_GM.xlsx',
                'sheet_name' => $payload['sheet_name'] ?? 'Notulensi Tracker',
                'row_count'  => count($payload['items']),
            ]);
        });

        return response()->json([
            'success'   => true,
            'message'   => 'Data MoM & Support Needed berhasil disimpan ke MySQL.',
            'row_count' => count($payload['items']),
            'items'     => $this->allItems(),
        ]);
    }

    /** PUT /api/mom-support/{id} — edit satu action plan (data notulensi yang ikut dikirim ikut diperbarui). */
    public function update(Request $request, int $id): JsonResponse
    {
        $plan = MomActionPlan::with('meeting')->findOrFail($id);
        $meeting = $plan->meeting;

        $meeting->update($this->meetingInput($request, $meeting));

        $planData = [
            'action_plan'    => (string) $this->input($request, 'actionPlan', 'action_plan', $plan->action_plan),
            'uic'            => (string) $request->input('uic', $plan->uic),
            'destinasi_fu'   => (string) $this->input($request, 'destinasiFu', 'destinasi_fu', $plan->destinasi_fu),
            'support_needed' => (string) $this->input($request, 'supportNeeded', 'support_needed', $plan->support_needed),
            'deadline'       => (string) $request->input('deadline', $plan->deadline),
            'status'         => (string) $request->input('status', $plan->status),
            'notes'          => (string) $request->input('notes', $plan->notes),
        ];
        if ($request->has('supportClear')) {
            $planData['support_clear'] = $request->boolean('supportClear');
        }
        $plan->update($planData);

        return response()->json([
            'success' => true,
            'message' => 'Perubahan Action Plan berhasil disimpan ke MySQL.',
            'item'    => self::toCamelItem($plan->fresh('meeting')),
        ]);
    }

    /**
     * PUT /api/mom-support/meetings/{meeting} — edit notulensi.
     * Deadline yang dikirim (tidak kosong) diterapkan ke semua action plan di notulensi ini.
     */
    public function updateMeeting(Request $request, MomMeeting $meeting): JsonResponse
    {
        $data = $request->validate(['deadline' => 'nullable|string|max:255']);

        $meeting->update($this->meetingInput($request, $meeting));

        if (filled($data['deadline'] ?? null)) {
            MomActionPlan::where('mom_meeting_id', $meeting->id)
                ->update(['deadline' => trim($data['deadline'])]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notulensi berhasil disimpan ke MySQL.',
            'meeting' => self::meetingToCamel($meeting),
            'items'   => $this->meetingItems($meeting),
        ]);
    }

    /** POST /api/mom-support/meetings/{meeting}/actions — tambah action plan ke notulensi yang sudah ada. */
    public function addAction(Request $request, MomMeeting $meeting): JsonResponse
    {
        $data = $request->validate(self::actionRules());

        $plan = $meeting->actionPlans()->create($this->actionFromPayload($data) + ['mom_meeting_id' => $meeting->id]);
        $plan->setRelation('meeting', $meeting);

        return response()->json([
            'success' => true,
            'message' => 'Action plan berhasil ditambahkan ke notulensi.',
            'item'    => self::toCamelItem($plan),
        ], 201);
    }

    /** PATCH /api/mom-support/{id}/support-clear — centang / hapus centang "support sudah clear". */
    public function toggleSupportClear(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['supportClear' => 'required|boolean']);

        $plan = MomActionPlan::with('meeting')->findOrFail($id);
        $plan->update(['support_clear' => $data['supportClear']]);

        return response()->json([
            'success' => true,
            'item'    => self::toCamelItem($plan->fresh('meeting')),
        ]);
    }

    /** DELETE /api/mom-support/{id} — hapus satu action plan. Notulensi yang kosong ikut dihapus. */
    public function destroy(int $id): JsonResponse
    {
        $plan = MomActionPlan::with('meeting')->findOrFail($id);
        $meeting = $plan->meeting;
        $plan->delete();

        if ($meeting && ! $meeting->actionPlans()->exists()) {
            $meeting->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Butir Action Plan berhasil dihapus dari MySQL.',
            'id'      => $id,
        ]);
    }

    /** DELETE /api/mom-support/meetings/{meeting} — hapus notulensi beserta semua action plan-nya. */
    public function destroyMeeting(MomMeeting $meeting): JsonResponse
    {
        $id = $meeting->id;
        $meeting->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notulensi dan seluruh action plan-nya berhasil dihapus.',
            'id'      => $id,
        ]);
    }

    /** POST /api/mom-support — tambah satu butir manual. Notulensi dengan NO, tanggal, agenda, dan topik yang sama dipakai bersama. */
    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate(array_merge(self::meetingRules(), self::actionRules()));

        $meeting = $this->meetingForManualInput($payload, (string) $request->input('no', ''));
        $plan = $meeting->actionPlans()->create($this->actionFromPayload($payload) + ['mom_meeting_id' => $meeting->id]);
        $plan->setRelation('meeting', $meeting);

        return response()->json([
            'success' => true,
            'message' => 'Butir Action Plan berhasil ditambahkan ke MySQL.',
            'item'    => self::toCamelItem($plan),
        ], 201);
    }

    /** POST /api/mom-support/batch — satu rapat dengan banyak butir action plan (NO dibuat otomatis jika kosong). */
    public function batch(Request $request): JsonResponse
    {
        $payload = $request->validate(array_merge(self::meetingRules(), [
            'items'                 => 'required|array|min:1',
            'items.*.actionPlan'    => 'required|string',
            'items.*.supportNeeded' => 'nullable|string',
            'items.*.uic'           => 'nullable|string|max:150',
            'items.*.destinasiFu'   => 'nullable|string|max:255',
            'items.*.deadline'      => 'nullable|string|max:255',
            'items.*.status'        => 'nullable|string|in:' . self::STATUSES,
            'items.*.notes'         => 'nullable|string',
        ]));

        $requestedNo = (string) $request->input('no', '');
        $meeting = DB::transaction(function () use ($payload, $requestedNo) {
            $meeting = $this->meetingForManualInput($payload, $requestedNo);

            foreach ($payload['items'] as $it) {
                $meeting->actionPlans()->create($this->actionFromPayload($it) + ['mom_meeting_id' => $meeting->id]);
            }

            return $meeting;
        });

        return response()->json([
            'success' => true,
            'message' => 'Rapat dan butir Action Plan berhasil ditambahkan ke MySQL.',
            'no'      => $meeting->no,
            'items'   => $this->meetingItems($meeting),
        ], 201);
    }

    /** POST /api/mom-support/reset — kembalikan isi tabel ke data seed awal. */
    public function reset(): JsonResponse
    {
        $seedFile = base_path('database/seeders/mom_seed_data.json');
        if (file_exists($seedFile)) {
            $rows = json_decode((string) file_get_contents($seedFile), true);
            if (is_array($rows) && count($rows) > 0) {
                DB::transaction(function () use ($rows) {
                    MomActionPlan::query()->delete();
                    MomMeeting::query()->delete();

                    foreach ($rows as $row) {
                        $meeting = $this->findOrCreateMeeting([
                            'no'                 => (string) ($row['no'] ?? ''),
                            'tgl'                => (string) ($row['tgl'] ?? ''),
                            'agenda'             => (string) ($row['agenda'] ?? 'FORUM WITEL'),
                            'main_topic'         => (string) ($row['main_topic'] ?? ''),
                            'unit_telda'         => (string) ($row['unit_telda'] ?? 'PRQ'),
                            'peserta'            => $row['peserta'] ?? null,
                            'pembahasan'         => $row['pembahasan'] ?? null,
                            'pembahasan_notulen' => $row['pembahasan_notulen'] ?? null,
                        ]);

                        MomActionPlan::create([
                            'mom_meeting_id' => $meeting->id,
                            'action_plan'    => (string) ($row['action_plan'] ?? ''),
                            'uic'            => (string) ($row['uic'] ?? '-'),
                            'destinasi_fu'   => (string) ($row['destinasi_fu'] ?? '-'),
                            'support_needed' => (string) ($row['support_needed'] ?? '-'),
                            'deadline'       => (string) ($row['deadline'] ?? '-'),
                            'status'         => (string) ($row['status'] ?? 'BELUM FU'),
                            'notes'          => (string) ($row['notes'] ?? ''),
                        ]);
                    }
                });
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Data MoM & Support Needed dikembalikan ke data awal di MySQL.',
            'items'   => $this->allItems(),
        ]);
    }

    // ===== Helper =====

    /** Notulensi dengan kunci (NO, tanggal, agenda, topik) yang sama dipakai bersama. */
    private function findOrCreateMeeting(array $attrs): MomMeeting
    {
        return MomMeeting::firstOrCreate(Arr::only($attrs, ['no', 'tgl', 'agenda', 'main_topic']), $attrs);
    }

    /**
     * Notulensi untuk input manual (tambah butir / batch). NO selalu dibuat otomatis oleh sistem.
     * Pengecualian: kalau notulensi dengan NO, tanggal, agenda, dan topik yang sama sudah ada, butir
     * ditambahkan ke notulensi itu (NO-nya tetap, tidak diubah).
     */
    private function meetingForManualInput(array $payload, string $requestedNo): MomMeeting
    {
        $requestedNo = trim($requestedNo);

        if ($requestedNo !== '') {
            $existing = MomMeeting::where('no', $requestedNo)
                ->where('tgl', $payload['tgl'])
                ->where('agenda', $payload['agenda'])
                ->where('main_topic', $payload['mainTopic'])
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        return MomMeeting::create($this->meetingFromPayload($payload, $this->nextMeetingNo()));
    }

    private function nextMeetingNo(): string
    {
        $maxNo = MomMeeting::query()->pluck('no')
            ->filter(fn ($n) => ctype_digit(trim((string) $n)))
            ->map(fn ($n) => (int) $n)
            ->max() ?? 0;

        return (string) ($maxNo + 1);
    }

    private function meetingFromPayload(array $p, string $no): array
    {
        return [
            'no'                 => $no,
            'tgl'                => $p['tgl'],
            'agenda'             => $p['agenda'],
            'main_topic'         => $p['mainTopic'],
            'unit_telda'         => $this->orDefault($p['unitTelda'] ?? null, 'PRQ'),
            'peserta'            => (string) ($p['peserta'] ?? ''),
            'pembahasan'         => (string) ($p['pembahasan'] ?? ''),
            'pembahasan_notulen' => (string) ($p['pembahasanNotulen'] ?? ''),
        ];
    }

    private function actionFromPayload(array $p): array
    {
        return [
            'action_plan'    => $p['actionPlan'],
            'uic'            => $this->orDefault($p['uic'] ?? null, '-'),
            'destinasi_fu'   => $this->orDefault($p['destinasiFu'] ?? null, '-'),
            'support_needed' => $this->orDefault($p['supportNeeded'] ?? null, '-'),
            'deadline'       => $this->orDefault($p['deadline'] ?? null, '-'),
            'status'         => $p['status'] ?? 'BELUM FU',
            'notes'          => (string) ($p['notes'] ?? ''),
        ];
    }

    private function meetingFromSyncItem(array $it, int $idx): array
    {
        return [
            'no'                 => (string) ($it['no'] ?? ($idx + 1)),
            'tgl'                => (string) ($it['tgl'] ?? 'N/A'),
            'agenda'             => (string) ($it['agenda'] ?? 'FORUM WITEL'),
            'main_topic'         => (string) ($it['mainTopic'] ?? $it['main_topic'] ?? 'Umum'),
            'unit_telda'         => (string) ($it['unitTelda'] ?? $it['unit_telda'] ?? 'PRQ'),
            'peserta'            => (string) ($it['peserta'] ?? ''),
            'pembahasan'         => (string) ($it['pembahasan'] ?? ''),
            'pembahasan_notulen' => (string) ($it['pembahasanNotulen'] ?? $it['pembahasan_notulen'] ?? ''),
        ];
    }

    private function actionFromSyncItem(array $it): array
    {
        return [
            'action_plan'    => (string) ($it['actionPlan'] ?? $it['action_plan'] ?? '(Tidak ada rincian aksi)'),
            'uic'            => (string) ($it['uic'] ?? 'PRQ'),
            'destinasi_fu'   => (string) ($it['destinasiFu'] ?? $it['destinasi_fu'] ?? '-'),
            'support_needed' => (string) ($it['supportNeeded'] ?? $it['support_needed'] ?? '-'),
            'deadline'       => (string) ($it['deadline'] ?? '-'),
            'status'         => (string) ($it['status'] ?? 'BELUM FU'),
            'notes'          => (string) ($it['notes'] ?? ''),
        ];
    }

    /** Field notulensi dari request (camelCase atau snake_case); yang tidak dikirim memakai nilai lama. */
    private function meetingInput(Request $request, MomMeeting $m): array
    {
        return [
            // NO rapat dikunci: hanya dibuat otomatis oleh sistem, tidak pernah diubah lewat edit
            'no'                 => (string) $m->no,
            'tgl'                => (string) $request->input('tgl', $m->tgl),
            'agenda'             => (string) $request->input('agenda', $m->agenda),
            'main_topic'         => (string) $this->input($request, 'mainTopic', 'main_topic', $m->main_topic),
            'unit_telda'         => (string) $this->input($request, 'unitTelda', 'unit_telda', $m->unit_telda),
            'peserta'            => (string) $request->input('peserta', $m->peserta),
            'pembahasan'         => (string) $request->input('pembahasan', $m->pembahasan),
            'pembahasan_notulen' => (string) $this->input($request, 'pembahasanNotulen', 'pembahasan_notulen', $m->pembahasan_notulen),
        ];
    }

    private function input(Request $request, string $camel, string $snake, mixed $default): mixed
    {
        return $request->input($camel, $request->input($snake, $default));
    }

    private function orDefault(?string $value, string $default): string
    {
        $value = trim((string) $value);

        return $value === '' ? $default : $value;
    }

    /** @return array<int, array> */
    private function allItems(): array
    {
        return MomActionPlan::with('meeting')->orderBy('id')->get()
            ->map(fn ($r) => self::toCamelItem($r))
            ->all();
    }

    /** @return array<int, array> */
    private function meetingItems(MomMeeting $meeting): array
    {
        return $meeting->actionPlans()->get()
            ->each(fn ($plan) => $plan->setRelation('meeting', $meeting))
            ->map(fn ($plan) => self::toCamelItem($plan))
            ->all();
    }

    private static function meetingRules(): array
    {
        return [
            'tgl'               => 'required|string|max:100',
            'agenda'            => 'required|string|max:120',
            'mainTopic'         => 'required|string|max:255',
            'unitTelda'         => 'nullable|string|max:500',
            'peserta'           => 'nullable|string',
            'pembahasan'        => 'nullable|string',
            'pembahasanNotulen' => 'nullable|string',
        ];
    }

    private static function actionRules(): array
    {
        return [
            'actionPlan'    => 'required|string',
            'uic'           => 'nullable|string|max:150',
            'destinasiFu'   => 'nullable|string|max:255',
            'supportNeeded' => 'nullable|string',
            'deadline'      => 'nullable|string|max:255',
            'status'        => 'nullable|string|in:' . self::STATUSES,
            'notes'         => 'nullable|string',
        ];
    }

    public static function toCamelItem(MomActionPlan $p): array
    {
        $m = $p->meeting;

        return [
            'id'                => (int) $p->id,
            'meetingId'         => $p->mom_meeting_id ? (int) $p->mom_meeting_id : null,
            'no'                => (string) ($m?->no ?? ''),
            'tgl'               => (string) ($m?->tgl ?? ''),
            'agenda'            => (string) ($m?->agenda ?? ''),
            'mainTopic'         => (string) ($m?->main_topic ?? ''),
            'unitTelda'         => (string) ($m?->unit_telda ?? ''),
            'peserta'           => (string) ($m?->peserta ?? ''),
            'pembahasan'        => (string) ($m?->pembahasan ?? ''),
            'pembahasanNotulen' => (string) ($m?->pembahasan_notulen ?? ''),
            'actionPlan'        => (string) $p->action_plan,
            'uic'               => (string) $p->uic,
            'destinasiFu'       => (string) ($p->destinasi_fu ?? '-'),
            'supportNeeded'     => (string) ($p->support_needed ?? '-'),
            'deadline'          => (string) ($p->deadline ?? '-'),
            'status'            => (string) ($p->status ?? 'BELUM FU'),
            'supportClear'      => (bool) $p->support_clear,
            'notes'             => (string) ($p->notes ?? ''),
        ];
    }

    public static function meetingToCamel(MomMeeting $m): array
    {
        return [
            'id'                => (int) $m->id,
            'no'                => (string) $m->no,
            'tgl'               => (string) $m->tgl,
            'agenda'            => (string) $m->agenda,
            'mainTopic'         => (string) $m->main_topic,
            'unitTelda'         => (string) $m->unit_telda,
            'peserta'           => (string) ($m->peserta ?? ''),
            'pembahasan'        => (string) ($m->pembahasan ?? ''),
            'pembahasanNotulen' => (string) ($m->pembahasan_notulen ?? ''),
        ];
    }
}
