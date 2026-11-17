<?php

namespace Tests\Feature;

use App\Models\MomActionPlan;
use App\Models\MomMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MomSupportCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']), ['*']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'no'                => '',
            'tgl'               => '11/11/2026',
            'agenda'            => 'FORUM WITEL',
            'mainTopic'         => 'HSI LIMITER',
            'unitTelda'         => 'PRQ',
            'peserta'           => 'GM WITEL, PRQ (3)',
            'pembahasan'        => 'Poin pembahasan',
            'pembahasanNotulen' => 'Notulen rapat',
            'actionPlan'        => 'Susun grup koordinasi',
            'uic'               => 'BS',
            'destinasiFu'       => 'SSGS',
            'supportNeeded'     => 'Dukungan eskalasi ke regional',
            'deadline'          => '18 Nov 2026',
            'status'            => 'IN PROGRESS',
            'notes'             => 'NDE 123',
        ], $overrides);
    }

    /** Notulensi + satu action plan untuk data uji. */
    private function plan(string $no, string $action = 'x', array $meeting = []): MomActionPlan
    {
        $m = MomMeeting::create($meeting + [
            'no' => $no, 'tgl' => '01/11/2026', 'agenda' => 'A', 'main_topic' => 'T',
        ]);

        return $m->actionPlans()->create(['action_plan' => $action]);
    }

    public function test_store_menyimpan_butir_baru_dengan_field_camel_case(): void
    {
        $res = $this->postJson('/api/mom-support', $this->payload(['no' => '7']))
            ->assertStatus(201)
            ->assertJsonPath('item.no', '1')
            ->assertJsonPath('item.mainTopic', 'HSI LIMITER')
            ->assertJsonPath('item.actionPlan', 'Susun grup koordinasi')
            ->assertJsonPath('item.supportNeeded', 'Dukungan eskalasi ke regional')
            ->assertJsonPath('item.status', 'IN PROGRESS')
            ->assertJsonPath('item.supportClear', false);

        $this->assertDatabaseHas('mom_meetings', [
            'no'                 => '1',
            'main_topic'         => 'HSI LIMITER',
            'pembahasan_notulen' => 'Notulen rapat',
        ]);
        $this->assertDatabaseHas('mom_action_plans', ['id' => $res->json('item.id'), 'support_clear' => false]);
    }

    public function test_no_rapat_selalu_dibuat_otomatis_dan_tidak_bisa_dipaksa_dari_input(): void
    {
        $this->postJson('/api/mom-support', $this->payload(['no' => '7', 'actionPlan' => 'Butir 1']))
            ->assertStatus(201)
            ->assertJsonPath('item.no', '1');
        $this->postJson('/api/mom-support', $this->payload(['no' => '7', 'actionPlan' => 'Butir 2']))
            ->assertStatus(201)
            ->assertJsonPath('item.no', '2');

        $this->assertSame(2, MomMeeting::count());
    }

    public function test_tambah_butir_ke_notulensi_yang_sama_memakai_no_yang_sudah_ada(): void
    {
        $first = $this->postJson('/api/mom-support', $this->payload(['actionPlan' => 'Butir 1']))->assertStatus(201);
        $second = $this->postJson('/api/mom-support', $this->payload([
            'no' => $first->json('item.no'), 'actionPlan' => 'Butir 2',
        ]))->assertStatus(201);

        $this->assertSame(1, MomMeeting::count());
        $this->assertSame($first->json('item.meetingId'), $second->json('item.meetingId'));
    }

    public function test_no_rapat_tidak_berubah_saat_notulensi_diedit(): void
    {
        $plan = $this->plan('5');

        $this->putJson('/api/mom-support/meetings/'.$plan->mom_meeting_id, ['no' => '99', 'mainTopic' => 'Baru'])
            ->assertOk()
            ->assertJsonPath('meeting.no', '5');

        $this->assertSame('5', $plan->fresh()->meeting->no);
    }

    public function test_store_no_kosong_melanjutkan_nomor_terbesar(): void
    {
        $this->plan('3');
        $this->plan('9');

        $this->postJson('/api/mom-support', $this->payload(['no' => '']))
            ->assertStatus(201)
            ->assertJsonPath('item.no', '10');
    }

    public function test_store_mengisi_default_untuk_field_kosong(): void
    {
        $this->postJson('/api/mom-support', $this->payload([
            'unitTelda'     => '',
            'uic'           => '',
            'destinasiFu'   => '',
            'supportNeeded' => '',
            'deadline'      => '',
            'status'        => null,
        ]))
            ->assertStatus(201)
            ->assertJsonPath('item.unitTelda', 'PRQ')
            ->assertJsonPath('item.uic', '-')
            ->assertJsonPath('item.destinasiFu', '-')
            ->assertJsonPath('item.supportNeeded', '-')
            ->assertJsonPath('item.deadline', '-')
            ->assertJsonPath('item.status', 'BELUM FU');
    }

    public function test_store_menolak_field_wajib_dan_status_tidak_valid(): void
    {
        $this->postJson('/api/mom-support', $this->payload([
            'agenda'     => '',
            'mainTopic'  => '',
            'actionPlan' => '',
            'tgl'        => '',
        ]))->assertStatus(422)->assertJsonValidationErrors(['agenda', 'mainTopic', 'actionPlan', 'tgl']);

        $this->postJson('/api/mom-support', $this->payload(['status' => 'SELESAI']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->assertDatabaseCount('mom_action_plans', 0);
        $this->assertDatabaseCount('mom_meetings', 0);
    }

    public function test_edit_notulensi_otomatis_mengubah_semua_action_plan_di_dalamnya(): void
    {
        $first = $this->plan('5', 'Aksi 1', ['main_topic' => 'Lama']);
        $second = $first->meeting->actionPlans()->create(['action_plan' => 'Aksi 2']);

        $this->putJson('/api/mom-support/meetings/'.$first->mom_meeting_id, [
            'no' => '5', 'tgl' => '02/11/2026', 'agenda' => 'A', 'mainTopic' => 'Baru', 'unitTelda' => 'PRQ',
            'pembahasanNotulen' => 'Notulen baru',
        ])
            ->assertOk()
            ->assertJsonPath('meeting.mainTopic', 'Baru')
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('items.0.mainTopic', 'Baru')
            ->assertJsonPath('items.1.tgl', '02/11/2026')
            ->assertJsonPath('items.1.pembahasanNotulen', 'Notulen baru');

        $this->assertSame('Baru', $second->fresh()->meeting->main_topic);
    }

    public function test_deadline_di_notulensi_mengubah_semua_action_plan_lalu_masih_bisa_diubah_satu_per_satu(): void
    {
        $first = $this->plan('11', 'Aksi 1');
        $second = $first->meeting->actionPlans()->create(['action_plan' => 'Aksi 2', 'deadline' => '25 Sep 2026']);

        $this->putJson('/api/mom-support/meetings/'.$first->mom_meeting_id, ['deadline' => '4 Okt 2026'])
            ->assertOk()
            ->assertJsonPath('items.0.deadline', '4 Okt 2026')
            ->assertJsonPath('items.1.deadline', '4 Okt 2026');

        // Setelah itu masing-masing action plan tetap bisa diubah sendiri.
        $this->putJson('/api/mom-support/'.$second->id, ['deadline' => '30 Okt 2026'])
            ->assertOk()
            ->assertJsonPath('item.deadline', '30 Okt 2026');
        $this->assertSame('4 Okt 2026', $first->fresh()->deadline);
        $this->assertSame('30 Okt 2026', $second->fresh()->deadline);
    }

    public function test_deadline_kosong_di_notulensi_tidak_mengubah_action_plan(): void
    {
        $plan = $this->plan('12');

        $this->putJson('/api/mom-support/meetings/'.$plan->mom_meeting_id, ['mainTopic' => 'Ganti topik', 'deadline' => ''])
            ->assertOk();

        $this->assertSame('-', $plan->fresh()->deadline);
    }

    public function test_edit_action_plan_dengan_data_notulensi_ikut_memperbarui_notulensi(): void
    {
        $plan = $this->plan('6', 'Lama');

        $this->putJson('/api/mom-support/'.$plan->id, [
            'mainTopic' => 'Topik Dari Butir', 'actionPlan' => 'Baru', 'status' => 'DONE',
        ])
            ->assertOk()
            ->assertJsonPath('item.mainTopic', 'Topik Dari Butir')
            ->assertJsonPath('item.actionPlan', 'Baru');

        $this->assertSame('Topik Dari Butir', $plan->fresh()->meeting->main_topic);
    }

    public function test_tambah_action_plan_ke_notulensi_yang_ada(): void
    {
        $plan = $this->plan('8', 'Pertama');

        $this->postJson('/api/mom-support/meetings/'.$plan->mom_meeting_id.'/actions', [
            'actionPlan' => 'Kedua', 'uic' => 'BS',
        ])
            ->assertStatus(201)
            ->assertJsonPath('item.no', '8')
            ->assertJsonPath('item.actionPlan', 'Kedua')
            ->assertJsonPath('item.meetingId', $plan->mom_meeting_id);

        $this->assertSame(2, MomMeeting::find($plan->mom_meeting_id)->actionPlans()->count());
    }

    public function test_checklist_support_clear_bisa_dicentang_dan_dibatalkan(): void
    {
        $plan = $this->plan('9');

        $this->patchJson('/api/mom-support/'.$plan->id.'/support-clear', ['supportClear' => true])
            ->assertOk()
            ->assertJsonPath('item.supportClear', true);

        $this->patchJson('/api/mom-support/'.$plan->id.'/support-clear', ['supportClear' => false])
            ->assertOk()
            ->assertJsonPath('item.supportClear', false);
    }

    public function test_destroy_butir_terakhir_ikut_menghapus_notulensi_kosong(): void
    {
        $plan = $this->plan('1');

        $this->deleteJson('/api/mom-support/'.$plan->id)
            ->assertOk()
            ->assertJsonPath('id', $plan->id);

        $this->assertDatabaseMissing('mom_action_plans', ['id' => $plan->id]);
        $this->assertDatabaseCount('mom_meetings', 0);
    }

    public function test_destroy_meeting_menghapus_semua_action_plan_di_dalamnya(): void
    {
        $plan = $this->plan('2');
        $plan->meeting->actionPlans()->create(['action_plan' => 'Lain']);

        $this->deleteJson('/api/mom-support/meetings/'.$plan->mom_meeting_id)->assertOk();

        $this->assertDatabaseCount('mom_meetings', 0);
        $this->assertDatabaseCount('mom_action_plans', 0);
    }

    public function test_destroy_id_tidak_ada_mengembalikan_404(): void
    {
        $this->deleteJson('/api/mom-support/999')->assertNotFound();
    }

    public function test_index_mengembalikan_items_kosong_saat_tabel_kosong(): void
    {
        $this->getJson('/api/mom-support')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(0, 'items');
    }

    public function test_batch_satu_rapat_banyak_action_plan_dengan_no_sama(): void
    {
        $this->plan('12');

        $res = $this->postJson('/api/mom-support/batch', [
            'tgl'        => '13/11/2026',
            'agenda'     => 'WBR 11 FEB',
            'mainTopic'  => 'RADIO IP',
            'unitTelda'  => 'PRQ, BS',
            'pembahasan' => 'Notulen rapat',
            'items'      => [
                ['actionPlan' => 'Poin 1', 'uic' => 'BS', 'status' => 'DONE'],
                ['actionPlan' => 'Poin 2', 'deadline' => '18 Nov 2026'],
            ],
        ])->assertStatus(201)
          ->assertJsonPath('no', '13')
          ->assertJsonCount(2, 'items')
          ->assertJsonPath('items.0.no', '13')
          ->assertJsonPath('items.1.no', '13')
          ->assertJsonPath('items.0.unitTelda', 'PRQ, BS')
          ->assertJsonPath('items.0.pembahasan', 'Notulen rapat')
          ->assertJsonPath('items.1.uic', '-')
          ->assertJsonPath('items.1.status', 'BELUM FU');

        $this->assertSame(1, MomMeeting::where('no', '13')->count());
        $this->assertSame(2, MomMeeting::where('no', '13')->first()->actionPlans()->count());
        $this->assertNotEmpty($res->json('items'));
    }

    public function test_batch_menolak_rapat_tanpa_butir(): void
    {
        $this->postJson('/api/mom-support/batch', [
            'tgl'       => '13/11/2026',
            'agenda'    => 'WBR 11 FEB',
            'mainTopic' => 'RADIO IP',
            'items'     => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['items']);
    }

    public function test_endpoint_membutuhkan_login(): void
    {
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Accept' => 'application/json'])
            ->postJson('/api/mom-support', $this->payload())
            ->assertStatus(401);
    }
}
