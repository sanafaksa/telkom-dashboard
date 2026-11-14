<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\BackupService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Throwable;

class BackupController extends Controller
{
    public function __construct(private BackupService $backups) {}

    public function index()
    {
        return response()->json(['backups' => $this->backups->list(), 'tables' => $this->backups->tables()]);
    }

    public function store(Request $request)
    {
        $note = $request->validate(['note' => 'nullable|string|max:120'])['note'] ?? null;
        @set_time_limit(300);

        $name = $this->backups->create($note);
        Audit::log('backup.created', null, ['file' => $name, 'note' => $note]);

        return response()->json(['name' => $name, 'backups' => $this->backups->list()], 201);
    }

    public function download(string $name)
    {
        $path = $this->backups->path($name);
        Audit::log('backup.downloaded', null, ['file' => $name]);

        return response()->download($path, $name, ['Content-Type' => 'application/gzip']);
    }

    public function restore(Request $request, string $name)
    {
        $data = $request->validate([
            'password' => 'required|string',
            'confirm'  => 'required|string',
        ]);

        // Aksi destruktif: wajib password sendiri + ketik ulang nama file.
        if (! Hash::check($data['password'], $request->user()->password)) {
            throw ValidationException::withMessages(['password' => 'Password Anda salah.']);
        }
        if ($data['confirm'] !== $name) {
            throw ValidationException::withMessages(['confirm' => 'Nama file konfirmasi tidak cocok.']);
        }

        $this->backups->path($name);
        $actor = $request->user();
        @set_time_limit(600);

        // Pengaman: simpan kondisi saat ini sebelum ditimpa.
        $safety = $this->backups->create('Otomatis sebelum restore ' . $name, '-prerestore');

        try {
            $counts = $this->backups->restore($name);
        } catch (Throwable $e) {
            Audit::log('backup.restore_failed', null, ['file' => $name, 'error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Akun pelaku bisa saja tidak ada di data hasil restore → relasi user hanya diisi bila masih cocok.
        AuditLog::create([
            'user_id'    => User::whereKey($actor->id)->where('nip', $actor->nip)->value('id'),
            'action'     => 'backup.restored',
            'meta'       => ['file' => $name, 'safety_backup' => $safety, 'rows' => array_sum($counts), 'oleh' => $actor->nip],
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message'       => 'Restore berhasil. ' . array_sum($counts) . ' baris dipulihkan. Semua sesi diakhiri, silakan login ulang.',
            'safety_backup' => $safety,
            'backups'       => $this->backups->list(),
        ]);
    }

    public function destroy(string $name)
    {
        $this->backups->delete($name);
        Audit::log('backup.deleted', null, ['file' => $name]);

        return response()->json(['backups' => $this->backups->list()]);
    }
}
