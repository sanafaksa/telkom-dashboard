<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'login'    => 'required|string|max:255',   // email atau NIK
            'password' => 'required|string',
            'remember' => 'boolean',
        ]);

        $field = filter_var($data['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'nik';
        $user  = User::where($field, trim($data['login']))->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'login' => 'Email/NIK atau kata sandi salah.',
            ]);
        }

        $expiresAt = ($data['remember'] ?? false) ? now()->addDays(30) : now()->addHours(12);
        $token     = $user->createToken('dashboard', ['*'], $expiresAt)->plainTextToken;

        return response()->json([
            'token'      => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'user'       => $this->payload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->payload($request->user()));
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    private function payload(User $user): array
    {
        return $user->only(['id', 'name', 'email', 'nik', 'role']);
    }
}
