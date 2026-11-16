<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Rbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, array $extra = []): User
    {
        return User::factory()->create(['role' => $role] + $extra);
    }

    private function actAs(string $role): User
    {
        $user = $this->user($role);
        Sanctum::actingAs($user, ['*']);

        return $user;
    }

    private function newUser(array $overrides = []): array
    {
        return array_merge([
            'name'     => 'Pegawai Baru',
            'nip'      => '700123',
            'role'     => 'staff',
            'password' => 'Rahasia123',
        ], $overrides);
    }

    // ===== Matriks akses per role =====

    public static function accessMatrix(): array
    {
        // [role, method, uri, status yang diharapkan]
        $rows = [];
        $expect = [
            // endpoint                         super admin staff support user
            ['GET', '/api/auth/me',              200, 200, 200, 200, 200],
            ['GET', '/api/profile',              200, 200, 200, 200, 200],
            ['GET', '/api/edk/uploads',          200, 200, 200, 403, 200],
            ['GET', '/api/kuadran',              200, 200, 200, 403, 200],
            ['GET', '/api/mom-support',          200, 200, 200, 200, 200],
            ['POST', '/api/mom-support/reset',   200, 200, 200, 200, 403],
            ['DELETE', '/api/kuadran/Jan',       200, 200, 200, 403, 403],
            ['GET', '/api/admin/overview',       200, 200, 403, 403, 403],
            ['GET', '/api/admin/users',          200, 200, 403, 403, 403],
            ['GET', '/api/audit-logs',           200, 200, 403, 403, 403],
            ['GET', '/api/admin/roles',          200, 403, 403, 403, 403],
            ['GET', '/api/admin/settings/general', 200, 403, 403, 403, 403],
            ['GET', '/api/admin/settings/auth',  200, 403, 403, 403, 403],
            ['GET', '/api/admin/settings/mail',  200, 403, 403, 403, 403],
            ['GET', '/api/admin/security/overview', 200, 403, 403, 403, 403],
            ['GET', '/api/admin/security/sessions', 200, 403, 403, 403, 403],
            ['GET', '/api/admin/database',       200, 403, 403, 403, 403],
            ['GET', '/api/admin/api-keys',       200, 403, 403, 403, 403],
            ['GET', '/api/admin/backups',        200, 403, 403, 403, 403],
            ['GET', '/api/admin/monitoring',     200, 403, 403, 403, 403],
            ['GET', '/api/admin/dev',            200, 403, 403, 403, 403],
            ['POST', '/api/admin/dev/actions/cache_clear', 200, 403, 403, 403, 403],
        ];

        foreach ($expect as $row) {
            [$method, $uri] = $row;
            $statuses = array_slice($row, 2);
            foreach (Rbac::roleKeys() as $i => $role) {
                $rows["{$role} {$method} {$uri}"] = [$role, $method, $uri, $statuses[$i]];
            }
        }

        return $rows;
    }

    #[DataProvider('accessMatrix')]
    public function test_akses_endpoint_per_role(string $role, string $method, string $uri, int $status): void
    {
        $this->actAs($role);

        $this->json($method, $uri)->assertStatus($status);
    }

    public function test_payload_user_berisi_permission_sesuai_role(): void
    {
        $this->actAs('support');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('role', 'support')
            ->assertJsonPath('permissions', ['dashboard.view', 'mom.view', 'mom.manage']);
    }

    public function test_role_dari_client_tidak_dipercaya(): void
    {
        $this->actAs('user');

        $this->withHeaders(['X-Role' => 'super_admin'])
            ->getJson('/api/admin/users?role=super_admin')
            ->assertForbidden();

        $this->putJson('/api/profile', ['name' => 'Saya', 'role' => 'super_admin', 'is_active' => true])->assertOk();
        $this->assertSame('user', User::first()->role);
    }

    // ===== Super Admin =====

    public function test_super_admin_bisa_membuat_semua_role(): void
    {
        $this->actAs('super_admin');

        foreach (Rbac::roleKeys() as $i => $role) {
            $this->postJson('/api/admin/users', $this->newUser(['nip' => "80000{$i}", 'role' => $role]))
                ->assertCreated()
                ->assertJsonPath('role', $role);
        }

        $this->assertSame(5, AuditLog::where('action', 'user.created')->count());
        $this->assertTrue(Hash::check('Rahasia123', User::where('nip', '800000')->value('password')));
    }

    public function test_super_admin_terakhir_tidak_bisa_diturunkan_dinonaktifkan_atau_dihapus(): void
    {
        $actor = $this->actAs('super_admin');
        $other = $this->user('super_admin');

        // Tidak ada yang bisa menurunkan, menonaktifkan, atau menghapus akunnya sendiri.
        $this->putJson("/api/admin/users/{$actor->id}", ['role' => 'admin'])->assertForbidden();
        $this->patchJson("/api/admin/users/{$actor->id}/status", ['is_active' => false])->assertForbidden();
        $this->deleteJson("/api/admin/users/{$actor->id}")->assertForbidden();

        // Masih ada dua Super Admin aktif → yang lain boleh diturunkan.
        $this->putJson("/api/admin/users/{$other->id}", ['role' => 'admin'])->assertOk();
        $this->assertSame(1, User::where('role', 'super_admin')->where('is_active', true)->count());

        // Super Admin nonaktif tidak bisa memakai API.
        Sanctum::actingAs($this->user('super_admin', ['is_active' => false]), ['*']);
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_penghapusan_super_admin_aktif_terakhir_ditolak(): void
    {
        $actor  = $this->actAs('super_admin');
        $target = $this->user('super_admin');

        // Simulasikan kondisi balapan: pelaku dinonaktifkan di database tepat setelah lolos autentikasi,
        // sehingga $target menjadi satu-satunya Super Admin aktif.
        User::whereKey($actor->id)->update(['is_active' => false]);

        $this->deleteJson("/api/admin/users/{$target->id}")->assertStatus(422)->assertJsonValidationErrors('role');
        $this->patchJson("/api/admin/users/{$target->id}/status", ['is_active' => false])->assertStatus(422);
        $this->putJson("/api/admin/users/{$target->id}", ['role' => 'user'])->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => 'super_admin', 'is_active' => true]);
    }

    public function test_super_admin_mengubah_permission_role(): void
    {
        $this->actAs('super_admin');

        $this->putJson('/api/admin/roles/support', ['permissions' => ['dashboard.view', 'edk.view']])
            ->assertOk()
            ->assertJsonPath('permissions', ['dashboard.view', 'edk.view']);

        $this->assertDatabaseHas('audit_logs', ['action' => 'role.permissions_updated']);

        // Permission khusus Super Admin tidak bisa diberikan ke role lain.
        $this->putJson('/api/admin/roles/admin', ['permissions' => ['dev.tools']])->assertStatus(422);
        $this->putJson('/api/admin/roles/admin', ['permissions' => ['roles.manage']])->assertStatus(422);
        // Permission Super Admin terkunci.
        $this->putJson('/api/admin/roles/super_admin', ['permissions' => []])->assertForbidden();

        // Perubahan langsung berlaku untuk role terkait.
        Sanctum::actingAs($this->user('support'), ['*']);
        $this->getJson('/api/edk/uploads')->assertOk();
        $this->getJson('/api/mom-support')->assertOk();          // masih lewat dashboard.view
        $this->postJson('/api/mom-support/reset')->assertForbidden();
    }

    public function test_admin_mengatur_permission_semua_role_kecuali_super_admin(): void
    {
        $this->actAs('admin');

        $this->putJson('/api/admin/roles/staff', ['permissions' => ['dashboard.view', 'mom.view']])
            ->assertOk()
            ->assertJsonPath('permissions', ['dashboard.view', 'mom.view']);
        $this->putJson('/api/admin/roles/support', ['permissions' => ['dashboard.view']])->assertOk();

        // Permission Sistem tetap khusus Super Admin, dan role Super Admin tidak bisa diubah.
        $this->putJson('/api/admin/roles/staff', ['permissions' => ['dev.tools']])->assertStatus(422);
        $this->putJson('/api/admin/roles/super_admin', ['permissions' => []])->assertForbidden();

        // Role Admin (termasuk miliknya sendiri) hanya bisa diubah Super Admin.
        $this->putJson('/api/admin/roles/admin', ['permissions' => ['dashboard.view']])->assertForbidden();
    }

    public function test_admin_membuka_kunci_dengan_password_sendiri(): void
    {
        $admin = $this->user('admin', ['password' => Hash::make('Lama12345')]);
        Sanctum::actingAs($admin, ['*']);

        $this->postJson('/api/admin/roles/verify-password', ['password' => 'salah'])->assertStatus(422);
        $this->postJson('/api/admin/roles/verify-password', ['password' => 'Lama12345'])
            ->assertOk()->assertJsonPath('verified', true);
    }

    // ===== Admin =====

    public function test_admin_mengelola_pengguna_biasa(): void
    {
        $this->actAs('admin');

        $id = $this->postJson('/api/admin/users', $this->newUser())->assertCreated()->json('id');

        $this->putJson("/api/admin/users/{$id}", ['name' => 'Nama Baru', 'role' => 'support'])
            ->assertOk()
            ->assertJsonPath('role', 'support');

        $this->patchJson("/api/admin/users/{$id}/status", ['is_active' => false])->assertOk();
        $this->putJson("/api/admin/users/{$id}/password", ['password' => 'PasswordBaru1'])->assertOk();

        $this->assertTrue(Hash::check('PasswordBaru1', User::find($id)->password));
        foreach (['user.created', 'user.role_changed', 'user.deactivated', 'user.password_reset'] as $action) {
            $this->assertDatabaseHas('audit_logs', ['action' => $action, 'subject_id' => $id]);
        }

        // Menghapus pengguna hanya untuk Super Admin.
        $this->deleteJson("/api/admin/users/{$id}")->assertForbidden();
    }

    public function test_admin_tidak_bisa_eskalasi_privilege(): void
    {
        $admin = $this->actAs('admin');
        $staff = $this->user('staff');
        $super = $this->user('super_admin');
        $peer  = $this->user('admin');

        // Tidak bisa membuat Admin / Super Admin.
        $this->postJson('/api/admin/users', $this->newUser(['role' => 'super_admin']))->assertStatus(422);
        $this->postJson('/api/admin/users', $this->newUser(['role' => 'admin']))->assertStatus(422);

        // Tidak bisa menaikkan role pengguna lain maupun dirinya sendiri.
        $this->putJson("/api/admin/users/{$staff->id}", ['role' => 'admin'])->assertForbidden();
        $this->putJson("/api/admin/users/{$staff->id}", ['role' => 'super_admin'])->assertForbidden();
        $this->putJson("/api/admin/users/{$admin->id}", ['role' => 'super_admin'])->assertForbidden();

        // Tidak bisa menyentuh Super Admin maupun Admin lain.
        foreach ([$super, $peer] as $target) {
            $this->putJson("/api/admin/users/{$target->id}", ['name' => 'Diretas'])->assertForbidden();
            $this->putJson("/api/admin/users/{$target->id}", ['role' => 'user'])->assertForbidden();
            $this->patchJson("/api/admin/users/{$target->id}/status", ['is_active' => false])->assertForbidden();
            $this->putJson("/api/admin/users/{$target->id}/password", ['password' => 'PasswordBaru1'])->assertForbidden();
            $this->deleteJson("/api/admin/users/{$target->id}")->assertForbidden();
        }

        $this->assertSame('super_admin', $super->fresh()->role);
        $this->assertTrue($super->fresh()->is_active);
        $this->assertSame('admin', $admin->fresh()->role);
        $this->assertSame('staff', $staff->fresh()->role);
    }

    public function test_audit_log_admin_terbatas(): void
    {
        $super = $this->user('super_admin');
        $staff = $this->user('staff');
        AuditLog::create(['user_id' => $super->id, 'action' => 'edk.upload', 'created_at' => now()]);
        AuditLog::create(['user_id' => $staff->id, 'action' => 'settings.updated', 'created_at' => now()]);
        AuditLog::create(['user_id' => $staff->id, 'action' => 'edk.export', 'created_at' => now()]);

        $this->actAs('admin');
        $this->getJson('/api/audit-logs')
            ->assertOk()
            ->assertJsonPath('scope', 'limited')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'edk.export');

        Sanctum::actingAs($super, ['*']);
        $this->getJson('/api/audit-logs')->assertOk()->assertJsonPath('scope', 'all')->assertJsonCount(3, 'data');
    }

    // ===== Validasi & sesi =====

    public function test_validasi_pembuatan_pengguna(): void
    {
        $this->actAs('super_admin');
        $this->user('user', ['nip' => '700123']);

        $this->postJson('/api/admin/users', $this->newUser())->assertStatus(422)->assertJsonValidationErrors('nip');
        $this->postJson('/api/admin/users', $this->newUser(['nip' => '700999', 'password' => 'pendek1']))
            ->assertStatus(422)->assertJsonValidationErrors('password');
        $this->postJson('/api/admin/users', $this->newUser(['nip' => '700999', 'role' => 'dewa']))
            ->assertStatus(422)->assertJsonValidationErrors('role');
    }

    public function test_reset_password_dan_nonaktif_mencabut_sesi(): void
    {
        $this->actAs('super_admin');
        $target = $this->user('staff');
        $target->createToken(User::SESSION_TOKEN);
        $target->createToken(User::SESSION_TOKEN);

        $this->putJson("/api/admin/users/{$target->id}/password", ['password' => 'PasswordBaru1'])->assertOk();
        $this->assertSame(0, $target->tokens()->count());

        $target->createToken(User::SESSION_TOKEN);
        $this->patchJson("/api/admin/users/{$target->id}/status", ['is_active' => false])->assertOk();
        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_ganti_password_sendiri_wajib_password_lama(): void
    {
        $user = $this->user('admin', ['password' => Hash::make('Lama12345')]);
        Sanctum::actingAs($user, ['*']);

        $body = ['password' => 'Baru12345', 'password_confirmation' => 'Baru12345'];

        $this->putJson('/api/profile/password', $body + ['current_password' => 'salah'])
            ->assertStatus(422)->assertJsonValidationErrors('current_password');
        $this->putJson('/api/profile/password', $body + ['current_password' => 'Lama12345'])->assertOk();

        $this->assertTrue(Hash::check('Baru12345', $user->fresh()->password));
        $this->assertDatabaseHas('audit_logs', ['action' => 'profile.password_changed']);
    }

    #[DataProvider('regularRoles')]
    public function test_pengguna_biasa_tidak_bisa_ganti_password_sendiri(string $role): void
    {
        $user = $this->user($role, ['password' => Hash::make('Lama12345')]);
        Sanctum::actingAs($user, ['*']);

        $this->putJson('/api/profile/password', [
            'current_password' => 'Lama12345', 'password' => 'Baru12345', 'password_confirmation' => 'Baru12345',
        ])->assertForbidden();
        $this->assertTrue(Hash::check('Lama12345', $user->fresh()->password));

        // Password tetap bisa diganti dari sisi Admin.
        Sanctum::actingAs($this->user('admin'), ['*']);
        $this->putJson("/api/admin/users/{$user->id}/password", ['password' => 'DariAdmin123'])->assertOk();
        $this->assertTrue(Hash::check('DariAdmin123', $user->fresh()->password));
    }

    public static function regularRoles(): array
    {
        return [['staff'], ['support'], ['user']];
    }
}
