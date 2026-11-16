<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SettingController extends Controller
{
    /** Tiap grup pengaturan dijaga permission-nya sendiri (system.config / auth.settings / email.config). */
    private function authorizeGroup(Request $request, string $group): void
    {
        $permission = Settings::GROUP_PERMISSION[$group] ?? abort(404);
        $user       = $request->user();

        abort_unless(
            $user->hasPermission($permission) && $user->tokenCan($permission),
            403,
            'Anda tidak punya akses untuk aksi ini.'
        );
    }

    public function show(Request $request, string $group)
    {
        $this->authorizeGroup($request, $group);

        return response()->json(['group' => $group, 'settings' => Settings::group($group)]);
    }

    public function update(Request $request, string $group)
    {
        $this->authorizeGroup($request, $group);

        $data    = $request->validate(Settings::rules($group));
        $changed = Settings::put($data, $request->user()->id);

        if ($changed) {
            Audit::log('settings.updated', null, ['group' => $group, 'perubahan' => $changed]);
        }

        return response()->json(['group' => $group, 'settings' => Settings::group($group)]);
    }

    public function testMail(Request $request)
    {
        $this->authorizeGroup($request, 'mail');

        $to = $request->validate(['to' => 'required|email|max:150'])['to'];

        try {
            Settings::applyMail();
            Mail::purge();
            Mail::raw(
                'Ini email uji dari SOLARIS. Jika Anda menerimanya, konfigurasi email sudah benar.',
                fn ($m) => $m->to($to)->subject('SOLARIS - Uji konfigurasi email')
            );
        } catch (Throwable $e) {
            Audit::log('settings.mail_test_failed', null, ['to' => $to]);

            return response()->json(['message' => 'Gagal mengirim email: ' . $e->getMessage()], 422);
        }

        Audit::log('settings.mail_test', null, ['to' => $to, 'mailer' => Settings::get('mail_mailer')]);

        return response()->json([
            'message' => Settings::get('mail_mailer') === 'log'
                ? 'Mailer "log" aktif: email ditulis ke storage/logs, tidak benar-benar dikirim.'
                : "Email uji terkirim ke {$to}.",
        ]);
    }
}
