<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $isSuper = $request->user()->isSuperAdmin();
        $counts  = User::query()->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role');

        $roles = [];
        foreach (Rbac::roles() as $key => $info) {
            // Admin tidak melihat role Super Admin
            if (! $isSuper && $key === Rbac::SUPER_ADMIN) {
                continue;
            }
            $roles[] = [
                'key'         => $key,
                'label'       => $info['label'],
                'description' => $info['description'],
                'is_system'   => $info['is_system'],
                'users'       => (int) ($counts[$key] ?? 0),
                'locked'      => $key === Rbac::SUPER_ADMIN,
                'permissions' => Rbac::permissionsFor($key),
            ];
        }

        $permissions = [];
        foreach (Rbac::PERMISSIONS as $key => [$label, $group, $superOnly]) {
            // Permission khusus Super Admin disembunyikan dari Admin
            if (! $isSuper && $superOnly) {
                continue;
            }
            $permissions[] = ['key' => $key, 'label' => $label, 'group' => $group, 'super_only' => $superOnly];
        }

        return response()->json(['roles' => $roles, 'permissions' => $permissions]);
    }

    /** Buat role baru (buatan Admin) dengan permission pilihan. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'label'         => 'required|string|max:60',
            'description'   => 'nullable|string|max:255',
            'permissions'   => 'present|array',
            'permissions.*' => ['string', Rule::in(Rbac::grantableFor('custom'))],
        ]);

        $key = Rbac::createRole($data['label'], $data['description'] ?? null, $data['permissions']);

        Audit::log('role.created', null, [
            'role'       => $key,
            'label'      => $data['label'],
            'permissions' => Rbac::permissionsFor($key),
        ]);

        return response()->json(['role' => $key, 'permissions' => Rbac::permissionsFor($key)], 201);
    }

    public function update(Request $request, string $role)
    {
        abort_unless(isset(Rbac::roles()[$role]), 404);
        abort_if($role === Rbac::SUPER_ADMIN, 403, 'Permission Super Admin tidak dapat diubah.');
        // Admin mengatur role selain Super Admin dan Admin. Role Admin hanya dapat diubah Super Admin.
        $actor = $request->user();
        abort_if($role === Rbac::ADMIN && ! $actor->isSuperAdmin(), 403, 'Role Admin hanya dapat diubah Super Admin.');
        abort_if(Rbac::isSystem($role) && ! $actor->isSuperAdmin() && $actor->role !== Rbac::ADMIN, 403, 'Role bawaan hanya dapat diubah Admin atau Super Admin.');

        // Permission yang valid mengikuti batas per role (termasuk backup.manage untuk Support).
        $data = $request->validate([
            'permissions'   => 'present|array',
            'permissions.*' => ['string', Rule::in(Rbac::grantableFor($role))],
        ]);

        $before = Rbac::permissionsFor($role);
        Rbac::setPermissions($role, $data['permissions']);
        $after = Rbac::permissionsFor($role);

        $added   = array_values(array_diff($after, $before));
        $removed = array_values(array_diff($before, $after));

        if ($added || $removed) {
            Audit::log('role.permissions_updated', null, ['role' => $role, 'ditambah' => $added, 'dicabut' => $removed]);
        }

        return response()->json(['role' => $role, 'permissions' => $after]);
    }

    /** Hapus role buatan. Akun yang memakainya dipindahkan ke role User. Role bawaan tidak bisa dihapus. */
    public function destroy(Request $request, string $role)
    {
        abort_unless(isset(Rbac::roles()[$role]), 404);
        abort_if(Rbac::isSystem($role), 403, 'Role bawaan sistem tidak dapat dihapus.');

        $label = Rbac::label($role);
        $moved = Rbac::deleteRole($role);

        Audit::log('role.deleted', null, ['role' => $role, 'label' => $label, 'akun_dipindahkan_ke_user' => $moved]);

        return response()->json(['message' => "Role {$label} dihapus. {$moved} akun dipindahkan ke role User."]);
    }

    /** Verifikasi password akun Super Admin / Admin yang sedang login sebelum role bawaan boleh diubah. */
    public function verifyPassword(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->isSuperAdmin() || $actor->role === Rbac::ADMIN, 403, 'Hanya Super Admin dan Admin yang dapat membuka kunci.');

        $data = $request->validate(['password' => 'required|string|max:255']);

        if (! Hash::check($data['password'], $actor->password)) {
            throw ValidationException::withMessages(['password' => 'Kata sandi Anda salah.']);
        }

        return response()->json(['verified' => true]);
    }
}
