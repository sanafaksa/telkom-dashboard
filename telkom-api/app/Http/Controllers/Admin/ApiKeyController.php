<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Rbac;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * API Management: API key untuk integrasi pihak lain.
 * Key hanya bisa membawa scope baca (Rbac::API_ABILITIES), tidak pernah akses administrasi.
 */
class ApiKeyController extends Controller
{
    private const PREFIX = 'api:';

    public function index()
    {
        $keys = PersonalAccessToken::query()
            ->where('name', 'like', self::PREFIX . '%')
            ->with('tokenable:id,name,nip')
            ->latest('id')
            ->get()
            ->map(fn (PersonalAccessToken $t) => [
                'id'           => $t->id,
                'label'        => substr($t->name, strlen(self::PREFIX)),
                'abilities'    => $t->abilities,
                'owner'        => $t->tokenable?->only(['id', 'name', 'nip']),
                'created_at'   => $t->created_at,
                'last_used_at' => $t->last_used_at,
                'expires_at'   => $t->expires_at,
                'expired'      => $t->expires_at !== null && $t->expires_at->isPast(),
            ]);

        return response()->json([
            'keys'      => $keys,
            'abilities' => array_map(
                fn ($a) => ['key' => $a, 'label' => Rbac::PERMISSIONS[$a][0]],
                Rbac::API_ABILITIES
            ),
            'integrations' => [
                ['name' => 'Cloudflare Turnstile (login)', 'configured' => filled(config('services.turnstile.secret'))],
                ['name' => 'CORS allowed origins', 'configured' => true, 'detail' => implode(', ', (array) config('cors.allowed_origins'))],
                ['name' => 'Base URL API', 'configured' => true, 'detail' => rtrim((string) config('app.url'), '/') . '/api'],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label'        => 'required|string|max:60|regex:/^[\w .-]+$/u',
            'abilities'    => 'required|array|min:1',
            'abilities.*'  => ['string', Rule::in(Rbac::API_ABILITIES)],
            'expires_days' => 'nullable|integer|min:1|max:365',
        ]);

        $expiresAt = isset($data['expires_days']) ? now()->addDays($data['expires_days']) : null;
        $token     = $request->user()->createToken(self::PREFIX . $data['label'], array_values(array_unique($data['abilities'])), $expiresAt);

        Audit::log('apikey.created', null, ['label' => $data['label'], 'abilities' => $data['abilities'], 'token_id' => $token->accessToken->id]);

        // Token asli hanya ditampilkan sekali di sini.
        return response()->json(['id' => $token->accessToken->id, 'token' => $token->plainTextToken], 201);
    }

    public function destroy(int $id)
    {
        $token = PersonalAccessToken::where('name', 'like', self::PREFIX . '%')->findOrFail($id);
        $label = substr($token->name, strlen(self::PREFIX));
        $token->delete();

        Audit::log('apikey.revoked', null, ['label' => $label, 'token_id' => $id]);

        return response()->json(['message' => 'API key dicabut.']);
    }
}
