<?php

namespace Tests\Feature;

use App\Models\MomActionPlan;
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
        Sanctum::actingAs(User::factory()->create());
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
            'deadline'          => 'W3 Nov 2026',
            'status'            => 'IN PROGRESS',
            'notes'             => 'NDE 123',
        ], $overrides);
    }

    public function test_store_menyimpan_butir_baru_dengan_field_camel_case(): void
    {
        $res = $this->postJson('/api/mom-support', $this->payload(['no' => '7']))
            ->assertStatus(201)
            ->assertJsonPath('item.no', '7')
            ->assertJsonPath('item.mainTopic', 'HSI LIMITER')
            ->assertJsonPath('item.actionPlan', 'Susun grup koordinasi')
            ->assertJsonPath('item.supportNeeded', 'Dukungan eskalasi ke regional')
            ->assertJsonPath('item.status', 'IN PROGRESS');

        $this->assertDatabaseHas('mom_action_plans', [
            'id'                 => $res->json('item.id'),
            'main_topic'         => 'HSI LIMITER',
            'pembahasan_notulen' => 'Notulen rapat',
        ]);
    }

    public function test_store_no_kosong_melanjutkan_nomor_terbesar(): void
    {
        MomActionPlan::create(['no' => '3', 'tgl' => '01/11/2026', 'agenda' => 'A', 'main_topic' => 'T', 'action_plan' => 'x']);
        MomActionPlan::create(['no' => '9', 'tgl' => '01/11/2026', 'agenda' => 'A', 'main_topic' => 'T', 'action_plan' => 'y']);

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
    }

    public function test_destroy_menghapus_butir(): void
    {
        $plan = MomActionPlan::create(['no' => '1', 'tgl' => '01/11/2026', 'agenda' => 'A', 'main_topic' => 'T', 'action_plan' => 'x']);

        $this->deleteJson('/api/mom-support/'.$plan->id)
            ->assertOk()
            ->assertJsonPath('id', $plan->id);

        $this->assertDatabaseMissing('mom_action_plans', ['id' => $plan->id]);
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

    public function test_endpoint_membutuhkan_login(): void
    {
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Accept' => 'application/json'])
            ->postJson('/api/mom-support', $this->payload())
            ->assertStatus(401);
    }
}
