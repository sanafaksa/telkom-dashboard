<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Pengaturan sistem yang disimpan di tabel system_settings.
 * Nilai bertanda secret dienkripsi dan tidak pernah dikirim balik ke client.
 */
class Settings
{
    /** key => [grup, tipe, default, label, aturan validasi, secret?] */
    public const DEFS = [
        'announcement'        => ['general', 'string', '', 'Pengumuman (tampil di header semua pengguna)', 'nullable|string|max:300'],
        'maintenance_mode'    => ['general', 'bool', false, 'Mode pemeliharaan (hanya Super Admin yang bisa masuk)', 'boolean'],
        'maintenance_message' => ['general', 'string', 'Sistem sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.', 'Pesan pemeliharaan', 'nullable|string|max:300'],

        'maintenance_schedule_at'      => ['maintenance', 'string', '', 'Waktu pemeliharaan terjadwal (ISO 8601, kosong = tidak ada)', 'nullable|date'],
        'maintenance_lead_minutes'     => ['maintenance', 'int', 10, 'Pengingat tampil berapa menit sebelum mulai', 'sometimes|required|integer|min:1|max:1440'],
        'maintenance_reminder_message' => ['maintenance', 'string', 'Pemeliharaan sistem akan segera dimulai. Simpan pekerjaan Anda.', 'Pesan pengingat', 'nullable|string|max:300'],

        'session_idle_minutes' => ['auth', 'int', 15, 'Sesi berakhir jika tidak ada aktivitas (menit, berlaku untuk semua role)', 'required|integer|min:5|max:480'],
        'login_max_attempts'  => ['auth', 'int', 5, 'Maksimal percobaan login per menit', 'required|integer|min:3|max:30'],
        'password_min_length' => ['auth', 'int', 8, 'Panjang minimal password', 'required|integer|min:8|max:64'],
        'single_session'      => ['auth', 'bool', false, 'Satu sesi per pengguna (login baru mengakhiri sesi lama)', 'boolean'],

        'mail_mailer'         => ['mail', 'string', 'log', 'Mailer', 'required|in:log,smtp'],
        'mail_host'           => ['mail', 'string', '', 'SMTP host', 'nullable|string|max:150'],
        'mail_port'           => ['mail', 'int', 587, 'SMTP port', 'nullable|integer|min:1|max:65535'],
        'mail_username'       => ['mail', 'string', '', 'SMTP username', 'nullable|string|max:150'],
        'mail_password'       => ['mail', 'string', '', 'SMTP password', 'nullable|string|max:200', true],
        'mail_from_address'   => ['mail', 'string', '', 'Alamat pengirim', 'nullable|email|max:150'],
        'mail_from_name'      => ['mail', 'string', 'SOLARIS', 'Nama pengirim', 'nullable|string|max:100'],
    ];

    public const GROUP_PERMISSION = [
        'general' => 'system.config',
        'auth'    => 'auth.settings',
        'mail'    => 'email.config',
    ];

    private const CACHE_KEY = 'system.settings';

    public static function isSecret(string $key): bool
    {
        return (bool) (self::DEFS[$key][5] ?? false);
    }

    /** Nilai mentah dari database (string), di-cache. */
    private static function stored(): array
    {
        try {
            return Cache::rememberForever(
                self::CACHE_KEY,
                fn () => DB::table('system_settings')->pluck('value', 'key')->all()
            );
        } catch (Throwable) {
            return [];   // tabel belum dimigrasi → pakai default
        }
    }

    public static function get(string $key): mixed
    {
        [, $type, $default] = self::DEFS[$key];
        $raw = self::stored()[$key] ?? null;

        if ($raw === null) {
            return $default;
        }

        if (self::isSecret($key)) {
            try {
                return $raw === '' ? '' : Crypt::decryptString($raw);
            } catch (Throwable) {
                return '';
            }
        }

        return match ($type) {
            'int'   => (int) $raw,
            'bool'  => $raw === '1',
            default => (string) $raw,
        };
    }

    /** Nilai satu grup untuk ditampilkan di UI (secret disamarkan). */
    public static function group(string $group): array
    {
        $out = [];
        foreach (self::DEFS as $key => $def) {
            if ($def[0] !== $group) {
                continue;
            }
            $secret = self::isSecret($key);
            $out[] = [
                'key'    => $key,
                'label'  => $def[3],
                'type'   => $secret ? 'secret' : $def[1],
                'value'  => $secret ? '' : self::get($key),
                'is_set' => $secret ? self::get($key) !== '' : null,
            ];
        }

        return $out;
    }

    public static function rules(string $group): array
    {
        $rules = [];
        foreach (self::DEFS as $key => $def) {
            if ($def[0] === $group) {
                $rules[$key] = $def[4];
            }
        }

        return $rules;
    }

    /** Simpan nilai; secret kosong berarti "tidak diubah". Mengembalikan key yang berubah. */
    public static function put(array $values, ?int $userId = null): array
    {
        $changed = [];

        foreach ($values as $key => $value) {
            if (! isset(self::DEFS[$key])) {
                continue;
            }
            $secret = self::isSecret($key);
            if ($secret && ($value === null || $value === '')) {
                continue;
            }

            $type   = self::DEFS[$key][1];
            $normal = match ($type) {
                'bool'  => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0',
                'int'   => (string) (int) $value,
                default => (string) ($value ?? ''),
            };

            $before = self::get($key);
            $after  = $type === 'bool' ? $normal === '1' : ($type === 'int' ? (int) $normal : $normal);
            if ($before === $after) {
                continue;
            }

            DB::table('system_settings')->updateOrInsert(
                ['key' => $key],
                [
                    'value'      => $secret ? Crypt::encryptString($normal) : $normal,
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]
            );
            $changed[$key] = $secret ? '(diubah)' : ['dari' => $before, 'ke' => $after];
        }

        Cache::forget(self::CACHE_KEY);

        return $changed;
    }

    /** Terapkan konfigurasi email dari database ke config runtime. */
    public static function applyMail(): void
    {
        $mailer = self::get('mail_mailer');
        config(['mail.default' => $mailer]);

        if ($mailer === 'smtp') {
            config([
                'mail.mailers.smtp.host'     => self::get('mail_host'),
                'mail.mailers.smtp.port'     => self::get('mail_port'),
                'mail.mailers.smtp.username' => self::get('mail_username') ?: null,
                'mail.mailers.smtp.password' => self::get('mail_password') ?: null,
            ]);
        }

        if ($from = self::get('mail_from_address')) {
            config(['mail.from.address' => $from, 'mail.from.name' => self::get('mail_from_name')]);
        }
    }
}
