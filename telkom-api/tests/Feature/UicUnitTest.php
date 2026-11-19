<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UicUnitTest extends TestCase
{
    use RefreshDatabase;

    public function test_tree_uic_memuat_hierarki_telkom_dan_isian_custom(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']), ['*']);

        $tree = $this->getJson('/api/uic-units')->assertOk()->json('tree');

        $telkom = collect($tree)->firstWhere('name', 'TELKOM');
        $this->assertNotNull($telkom);
        $this->assertSame(1, $telkom['level']);

        $tr3 = collect($telkom['children'])->firstWhere('name', 'TR3');
        $this->assertNotNull($tr3);

        $witel = collect($tr3['children'])->firstWhere('name', 'WITEL BALI');
        $this->assertNotNull($witel);
        $this->assertTrue(collect($witel['children'])->contains(fn ($c) => $c['is_custom_input'] === true));

        $tif = collect($tree)->firstWhere('name', 'TIF');
        $this->assertNotNull($tif);
        $this->assertTrue(collect($tif['children'])->contains(fn ($c) => $c['name'] === 'DISTRICT*' && $c['is_custom_input']));
    }

    public function test_tanpa_login_ditolak(): void
    {
        $this->getJson('/api/uic-units')->assertUnauthorized();
    }
}
