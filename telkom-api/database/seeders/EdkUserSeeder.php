<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\Rbac;
use Illuminate\Database\Seeder;

class EdkUserSeeder extends Seeder
{
    /** Membuat atau memperbarui akun awal (login memakai NIP). */
    public function run(): void
    {
        $this->seed(Rbac::SUPER_ADMIN, '900001', 'Solaris12345', 'Super Admin', null);
        $this->seed(Rbac::ADMIN, '900002', 'Solaris12345', 'Admin', null);
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
