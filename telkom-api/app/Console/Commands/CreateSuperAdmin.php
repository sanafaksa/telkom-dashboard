<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use Illuminate\Console\Command;

class CreateSuperAdmin extends Command
{
    protected $signature = 'solaris:super-admin {nip : NIP untuk login} {--name= : Nama lengkap} {--email=}';

    protected $description = 'Membuat Super Admin baru, atau menaikkan akun dengan NIP tersebut menjadi Super Admin';

    public function handle(): int
    {
        $nip  = trim((string) $this->argument('nip'));
        $user = User::where('nip', $nip)->first();

        if ($user && ! $this->confirm("Akun {$user->name} (NIP {$nip}) sudah ada. Jadikan Super Admin dan ganti password?", true)) {
            return self::FAILURE;
        }

        $password = (string) $this->secret('Password (minimal 8 karakter)');
        if (strlen($password) < 8 || $password !== (string) $this->secret('Ulangi password')) {
            $this->error('Password kurang dari 8 karakter atau tidak sama.');

            return self::FAILURE;
        }

        $user ??= new User(['nip' => $nip, 'name' => $this->option('name') ?: 'Super Admin']);
        if ($this->option('name')) {
            $user->name = $this->option('name');
        }
        if ($this->option('email')) {
            $user->email = $this->option('email');
        }
        $user->password  = $password;
        $user->role      = Rbac::SUPER_ADMIN;
        $user->is_active = true;
        $user->save();

        Audit::log('user.super_admin_cli', $user, ['nip' => $nip]);
        $this->info("Super Admin siap: {$user->name} (NIP {$nip}).");

        return self::SUCCESS;
    }
}
