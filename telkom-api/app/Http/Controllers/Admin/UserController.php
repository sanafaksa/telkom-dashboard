<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use App\Support\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'q'      => 'nullable|string|max:100',
            'role'   => ['nullable', Rule::in(Rbac::roleKeys())],
            'status' => 'nullable|in:active,inactive',
            'scope'  => 'nullable|in:admins,users',
        ]);

        $actor = $request->user();

        $page = User::query()
            ->with('passwordChangedBy:id,name,nip,email,role')
            // Admin tidak melihat akun Super Admin
            ->when(! $actor->isSuperAdmin(), fn ($q) => $q->where('role', '!=', Rbac::SUPER_ADMIN))
            ->when($data['q'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$v}%")
                ->orWhere('nip', 'like', "%{$v}%")
                ->orWhere('email', 'like', "%{$v}%")))
            ->when($data['role'] ?? null, fn ($q, $v) => $q->where('role', $v))
            ->when(($data['scope'] ?? null) === 'admins', fn ($q) => $q->whereIn('role', [Rbac::SUPER_ADMIN, Rbac::ADMIN]))
            ->when(($data['scope'] ?? null) === 'users', fn ($q) => $q->whereIn('role', Rbac::regularRoles()))
            ->when($data['status'] ?? null, fn ($q, $v) => $q->where('is_active', $v === 'active'))
            ->orderBy('name')
            ->paginate(20);

        $page->through(fn (User $u) => self::present($u, $actor));

        return response()->json([
            ...$page->toArray(),
            'assignable_roles' => array_map(
                fn ($r) => ['key' => $r, 'label' => Rbac::label($r)],
                Rbac::assignableRoles($actor)
            ),
            // Daftar role untuk filter (Super Admin tidak ditampilkan ke Admin)
            'roles' => collect(Rbac::roles())
                ->filter(fn ($info, $key) => $actor->isSuperAdmin() || $key !== Rbac::SUPER_ADMIN)
                ->map(fn ($info, $key) => ['key' => $key, 'label' => $info['label']])
                ->values(),
            'password_min_length' => Settings::get('password_min_length'),
        ]);
    }

    public function store(Request $request)
    {
        $actor = $request->user();

        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'nip'       => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:users,nip'],
            'email'     => 'nullable|email|max:255|unique:users,email',
            'role'      => ['required', Rule::in(Rbac::assignableRoles($actor))],
            'password'  => ['required', 'string', 'max:255', self::passwordRule()],
            'is_active' => 'boolean',
        ]);

        $user = new User([
            'name'     => $data['name'],
            'nip'      => $data['nip'],
            'email'    => $data['email'] ?? null,
            'password' => $data['password'],
        ]);
        $user->role      = $data['role'];
        $user->is_active = $data['is_active'] ?? true;
        $user->markPasswordChanged($actor->id);
        $user->save();

        Audit::log('user.created', $user, ['nip' => $user->nip, 'role' => $user->role]);

        return response()->json(self::present($user, $actor), 201);
    }

    public function update(Request $request, User $user)
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);

        $data = $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'nip'   => ['sometimes', 'required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9._-]+$/', Rule::unique('users', 'nip')->ignore($user->id)],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => ['sometimes', 'required', Rule::in(Rbac::roleKeys())],
        ]);

        $newRole     = $data['role'] ?? $user->role;
        $roleChanged = $newRole !== $user->role;

        if ($roleChanged) {
            abort_if($actor->id === $user->id, 403, 'Anda tidak dapat mengubah role akun sendiri.');
            abort_unless(
                in_array($newRole, Rbac::assignableRoles($actor), true),
                403,
                'Anda tidak berwenang memberikan role tersebut.'
            );
        }

        $before = $user->only(['name', 'nip', 'email', 'role']);

        DB::transaction(function () use ($user, $data, $newRole, $roleChanged) {
            if ($roleChanged) {
                Rbac::ensureNotLastSuperAdmin($user);
            }
            $user->fill(collect($data)->except('role')->all());
            $user->role = $newRole;
            $user->save();
        });

        $changes = [];
        foreach ($before as $key => $old) {
            if ($old !== $user->{$key}) {
                $changes[$key] = ['dari' => $old, 'ke' => $user->{$key}];
            }
        }

        if ($changes) {
            Audit::log($roleChanged ? 'user.role_changed' : 'user.updated', $user, $changes);
        }

        return response()->json(self::present($user, $actor));
    }

    public function setStatus(Request $request, User $user)
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);
        abort_if($actor->id === $user->id, 403, 'Anda tidak dapat menonaktifkan akun sendiri.');

        $active = $request->validate(['is_active' => 'required|boolean'])['is_active'];

        DB::transaction(function () use ($user, $active) {
            if (! $active) {
                Rbac::ensureNotLastSuperAdmin($user);
            }
            $user->is_active = $active;
            $user->save();

            if (! $active) {
                $user->tokens()->delete();   // sesi & API key langsung berakhir
            }
        });

        Audit::log($active ? 'user.activated' : 'user.deactivated', $user, ['nip' => $user->nip]);

        return response()->json(self::present($user, $actor));
    }

    public function resetPassword(Request $request, User $user)
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);
        abort_if($actor->id === $user->id, 403, 'Ganti password sendiri lewat menu Profil.');

        $data = $request->validate([
            'password' => ['required', 'string', 'max:255', self::passwordRule()],
        ]);

        $user->password = $data['password'];
        $user->markPasswordChanged($actor->id);
        $user->save();
        $user->tokens()->where('name', User::SESSION_TOKEN)->delete();   // paksa login ulang

        Audit::log('user.password_reset', $user, ['nip' => $user->nip]);

        return response()->json(['message' => 'Password berhasil direset. Pengguna harus login ulang.']);
    }

    public function destroy(Request $request, User $user)
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);
        abort_if($actor->id === $user->id, 403, 'Anda tidak dapat menghapus akun sendiri.');

        $meta = $user->only(['name', 'nip', 'role']);

        DB::transaction(function () use ($user) {
            Rbac::ensureNotLastSuperAdmin($user);
            $user->tokens()->delete();
            $user->delete();
        });

        Audit::log('user.deleted', null, $meta + ['deleted_id' => $user->id]);

        return response()->json(['message' => 'Pengguna dihapus.']);
    }

    public static function passwordRule(): Password
    {
        return Password::min((int) Settings::get('password_min_length'))->letters()->numbers();
    }

    private function authorizeManage(User $actor, User $target): void
    {
        abort_unless(
            Rbac::canManage($actor, $target),
            403,
            'Anda tidak berwenang mengubah akun dengan role ' . Rbac::label($target->role) . '.'
        );
    }

    public static function present(User $u, User $actor): array
    {
        return [
            ...$u->only(['id', 'name', 'nip', 'email', 'role', 'is_active', 'last_login_at', 'created_at', 'password_changed_at']),
            'role_label'         => Rbac::label($u->role),
            'is_self'            => $u->id === $actor->id,
            'can_manage'         => Rbac::canManage($actor, $u),
            'password_changed_by' => Rbac::displayActor($u->passwordChangedBy, $actor),
        ];
    }
}
