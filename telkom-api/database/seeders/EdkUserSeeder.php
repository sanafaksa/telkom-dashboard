<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class EdkUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@telkom.co.id')],
            [
                'name'     => env('ADMIN_NAME', 'Admin EDK'),
                'nik'      => env('ADMIN_NIK'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'ganti-password-ini')),
                'role'     => 'admin',
            ]
        );
    }
}
