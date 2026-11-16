<?php

namespace App\Models;

use App\Support\Rbac;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** Nama token sesi login dashboard (API key integrasi memakai prefiks "api:"). */
    public const SESSION_TOKEN = 'dashboard';

    // "role" dan "is_active" sengaja tidak mass-assignable: hanya diubah
    // lewat UserController setelah pengecekan kewenangan.
    protected $fillable = [
        'name',
        'email',
        'nip',
        'password',
    ];

    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'is_active'         => 'boolean',
            'password'          => 'hashed',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === Rbac::SUPER_ADMIN;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [Rbac::ADMIN, Rbac::SUPER_ADMIN], true);
    }

    /** @return string[] */
    public function permissions(): array
    {
        return Rbac::permissionsFor($this->role);
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }
}
