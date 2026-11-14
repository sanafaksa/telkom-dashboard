<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index()
    {
        $counts = User::query()->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role');

        $roles = [];
        foreach (Rbac::ROLES as $key => $info) {
            $roles[] = [
                'key'         => $key,
                'label'       => $info['label'],
                'description' => $info['description'],
                'users'       => (int) ($counts[$key] ?? 0),
                'locked'      => $key === Rbac::SUPER_ADMIN,
                'permissions' => Rbac::permissionsFor($key),
            ];
        }

        $permissions = [];
        foreach (Rbac::PERMISSIONS as $key => [$label, $group, $superOnly]) {
            $permissions[] = ['key' => $key, 'label' => $label, 'group' => $group, 'super_only' => $superOnly];
        }

        return response()->json(['roles' => $roles, 'permissions' => $permissions]);
    }

    public function update(Request $request, string $role)
    {
        abort_unless(isset(Rbac::ROLES[$role]), 404);
        abort_if($role === Rbac::SUPER_ADMIN, 403, 'Permission Super Admin tidak dapat diubah.');

        $data = $request->validate([
            'permissions'   => 'present|array',
            'permissions.*' => ['string', Rule::in(Rbac::grantable())],
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
}
