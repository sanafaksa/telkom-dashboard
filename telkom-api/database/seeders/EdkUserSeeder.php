<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\Rbac;
use Illuminate\Database\Seeder;

class EdkUserSeeder extends Seeder
{
    /**
     * Membuat akun awal dari .env:
     * - SUPER_ADMIN_NIP / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_NAME / SUPER_ADMIN_EMAIL
     * - ADMIN_NIP (atau ADMIN_NIK lama) / ADMIN_PASSWORD / ADMIN_NAME / ADMIN_EMAIL
     * Akun tanpa NIP atau password di .env dilewati (login memakai NIP).
     */
    public function run(): void
    {
        $this->seed(Rbac::SUPER_ADMIN, env('SUPER_ADMIN_NIP'), env('SUPER_ADMIN_PASSWORD'), env('SUPER_ADMIN_NAME', 'Super Admin'), env('SUPER_ADMIN_EMAIL'));
        $this->seed(Rbac::ADMIN, env('ADMIN_NIP', env('ADMIN_NIK')), env('ADMIN_PASSWORD'), env('ADMIN_NAME', 'Admin'), env('ADMIN_EMAIL'));
    }

    private function seed(string $role, ?string $nip, ?string $password, string $name, ?string $email): void
    {
        if (! $nip || ! $password) {
            $this->command?->warn("Lewati akun {$role}: NIP atau password belum diisi di .env.");

            return;
        }

        $user = User::where('nip', $nip)->first()
            ?? ($email ? User::where('email', $email)->first() : null)
            ?? new User();

        $user->fill(['nip' => $nip, 'name' => $name, 'email' => $email ?: $user->email, 'password' => $password]);
        $user->role      = $role;
        $user->is_active = true;
        $user->save();
    }
}
