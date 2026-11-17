<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\UserController;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Profile Settings: setiap pengguna mengelola akunnya sendiri (tanpa bisa mengubah role/NIP). */
class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user      = $request->user();
        $currentId = $user->currentAccessToken()?->id;

        $sessions = $user->tokens()
            ->where('name', User::SESSION_TOKEN)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->latest('last_used_at')
            ->get()
            ->map(fn ($t) => [
                'id'           => $t->id,
                'created_at'   => $t->created_at,
                'last_used_at' => $t->last_used_at,
                'expires_at'   => $t->expires_at,
                'is_current'   => $t->id === $currentId,
            ]);

        return response()->json([
            'user'     => AuthController::payload($user) + ['last_login_at' => $user->last_login_at, 'created_at' => $user->created_at],
            'sessions' => $sessions,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->fill($data)->save();
        Audit::log('profile.updated', $user);

        return response()->json(AuthController::payload($user));
    }

    public function password(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'string', 'max:255', 'confirmed', 'different:current_password', UserController::passwordRule()],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Password saat ini salah.']);
        }

        $user->password = $data['password'];
        $user->markPasswordChanged($user->id);
        $user->save();

        // Sesi di perangkat lain diakhiri; sesi ini tetap.
        $this->revokeOthers($request);
        Audit::log('profile.password_changed', $user);

        return response()->json(['message' => 'Password berhasil diganti. Sesi di perangkat lain telah diakhiri.']);
    }

    public function revokeSession(Request $request, int $id)
    {
        $request->user()->tokens()->where('name', User::SESSION_TOKEN)->findOrFail($id)->delete();

        return response()->json(['message' => 'Sesi diakhiri.']);
    }

    public function revokeOtherSessions(Request $request)
    {
        return response()->json(['message' => $this->revokeOthers($request) . ' sesi lain diakhiri.']);
    }

    private function revokeOthers(Request $request): int
    {
        $user = $request->user();

        return $user->tokens()
            ->where('name', User::SESSION_TOKEN)
            ->where('id', '!=', $user->currentAccessToken()?->id ?? 0)
            ->delete();
    }
}
