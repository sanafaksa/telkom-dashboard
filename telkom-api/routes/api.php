<?php

use App\Http\Controllers\Admin\ApiKeyController;
use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\DatabaseController;
use App\Http\Controllers\Admin\DevToolsController;
use App\Http\Controllers\Admin\MonitoringController;
use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SecurityController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Api\KuadranController;
use App\Http\Controllers\Api\MomSupportController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Edk\EdkExportController;
use App\Http\Controllers\Edk\EdkSummaryController;
use App\Http\Controllers\Edk\EdkUploadController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

/*
 * Otorisasi seluruhnya di backend:
 *   auth:sanctum  → token valid & belum kedaluwarsa
 *   active        → akun aktif (+ mode pemeliharaan)
 *   permission:x  → role (dibaca dari database) memiliki permission x
 */

// ===== Auth (NIP + password) =====
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Aduan lupa kata sandi dari halaman login (publik, dibatasi throttle)
Route::post('auth/help-request', [\App\Http\Controllers\HelpRequestController::class, 'store'])->middleware('throttle:5,1');

// Status sistem publik untuk notifikasi pemeliharaan (polling dari frontend, tanpa login)
Route::get('system/status', [\App\Http\Controllers\SystemStatusController::class, 'show'])->middleware('throttle:120,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // ===== Profile Settings (semua role, hanya akun sendiri) =====
    Route::prefix('profile')->middleware('session')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        // Aturan tetap (bukan permission yang bisa diubah): hanya Super Admin, Admin, dan Support
        // yang boleh mengganti password. Password Staff/User dikelola Admin & Support lewat User Management.
        Route::put('password', [ProfileController::class, 'password'])->middleware(['role:admin,support', 'throttle:10,1']);
        Route::post('sessions/revoke-others', [ProfileController::class, 'revokeOtherSessions']);
        Route::delete('sessions/{id}', [ProfileController::class, 'revokeSession'])->whereNumber('id');
    });

    // ===== EDK =====
    Route::prefix('edk')->group(function () {
        Route::middleware('permission:edk.view')->group(function () {
            Route::get('populations', [EdkUploadController::class, 'populations']);
            Route::get('uploads', [EdkUploadController::class, 'index']);
            Route::get('template', [EdkUploadController::class, 'template']);
            Route::get('summary/{by}', [EdkSummaryController::class, 'summary'])
                ->whereIn('by', ['segmen', 'periode', 'am', 'cc']);
            Route::get('cards', [EdkSummaryController::class, 'cards']);
            Route::get('options', [EdkSummaryController::class, 'options']);
            Route::get('top-customers/detail', [EdkSummaryController::class, 'customerDetails']);
            Route::get('top-customers', [EdkSummaryController::class, 'topCustomers']);
        });

        Route::middleware('permission:edk.upload')->group(function () {
            Route::post('uploads', [EdkUploadController::class, 'store']);
            Route::post('uploads/{upload}/activate', [EdkUploadController::class, 'activate']);
        });

        Route::get('export', [EdkExportController::class, 'export'])->middleware('permission:edk.export');
    });

    // ===== Kuadran =====
    Route::prefix('kuadran')->group(function () {
        Route::get('/', [KuadranController::class, 'index'])->middleware('permission:kuadran.view');
        Route::middleware('permission:kuadran.manage')->group(function () {
            Route::post('sync', [KuadranController::class, 'sync']);
            Route::delete('{bulan}', [KuadranController::class, 'destroyMonth']);
        });
    });

    // ===== MoM Support =====
    Route::prefix('mom-support')->group(function () {
        // Executive Overview juga membaca data MoM.
        Route::get('/', [MomSupportController::class, 'index'])->middleware('permission:mom.view,dashboard.view');
        Route::middleware('permission:mom.manage')->group(function () {
            Route::post('/', [MomSupportController::class, 'store']);
            Route::post('batch', [MomSupportController::class, 'batch']);
            Route::post('sync', [MomSupportController::class, 'sync']);
            Route::put('{id}', [MomSupportController::class, 'update']);
            Route::delete('{id}', [MomSupportController::class, 'destroy']);
            Route::post('reset', [MomSupportController::class, 'reset']);
            // Notulensi (rapat) dan action plan-nya
            Route::put('meetings/{meeting}', [MomSupportController::class, 'updateMeeting']);
            Route::delete('meetings/{meeting}', [MomSupportController::class, 'destroyMeeting']);
            Route::post('meetings/{meeting}/actions', [MomSupportController::class, 'addAction']);
            Route::patch('{id}/support-clear', [MomSupportController::class, 'toggleSupportClear'])->whereNumber('id');
        });
    });

    // ===== Audit log (Admin: terbatas, Super Admin: seluruhnya) =====
    Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view,audit.view_all');

    // ===== Administrasi =====
    Route::prefix('admin')->middleware('throttle:admin')->group(function () {
        // Mode pemeliharaan (Admin & Support)
        Route::middleware('permission:maintenance.manage')->group(function () {
            Route::get('maintenance', [\App\Http\Controllers\Admin\MaintenanceController::class, 'show']);
            Route::put('maintenance', [\App\Http\Controllers\Admin\MaintenanceController::class, 'update']);
        });

        // Kotak masuk aduan lupa kata sandi (Admin & Support)
        Route::middleware('permission:inbox.manage')->group(function () {
            Route::get('help-requests', [\App\Http\Controllers\Admin\HelpRequestController::class, 'index']);
            Route::patch('help-requests/{helpRequest}', [\App\Http\Controllers\Admin\HelpRequestController::class, 'update']);
        });

        Route::get('overview', [OverviewController::class, 'index'])->middleware('permission:admin.dashboard');

        // User Management & Admin Management
        Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::patch('users/{user}/status', [UserController::class, 'setStatus'])->middleware('permission:users.toggle_active');
        Route::put('users/{user}/password', [UserController::class, 'resetPassword'])->middleware('permission:users.reset_password');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        // Role & Permission
        // Lihat & atur role: Super Admin (roles.manage) atau Admin (roles.custom, untuk role buatan).
        // Pengecekan role bawaan dilakukan di RoleController::update.
        Route::middleware('permission:roles.manage,roles.custom')->group(function () {
            Route::get('roles', [RoleController::class, 'index']);
            Route::put('roles/{role}', [RoleController::class, 'update']);
        });
        Route::post('roles', [RoleController::class, 'store'])->middleware('permission:roles.custom');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.custom');
        Route::post('roles/verify-password', [RoleController::class, 'verifyPassword'])
            ->middleware(['permission:roles.manage,roles.custom', 'throttle:10,1']);

        // System Configuration / Authentication Settings / Email Configuration
        // (permission per grup dicek di SettingController)
        Route::post('settings/mail/test', [SettingController::class, 'testMail'])->middleware('throttle:5,1');
        Route::get('settings/{group}', [SettingController::class, 'show'])->whereIn('group', ['general', 'auth', 'mail']);
        Route::put('settings/{group}', [SettingController::class, 'update'])->whereIn('group', ['general', 'auth', 'mail']);

        // Security Center
        Route::prefix('security')->middleware('permission:security.center')->group(function () {
            Route::get('overview', [SecurityController::class, 'overview']);
            Route::get('sessions', [SecurityController::class, 'sessions']);
            Route::delete('sessions/{id}', [SecurityController::class, 'revokeSession'])->whereNumber('id');
            Route::post('users/{user}/revoke-sessions', [SecurityController::class, 'revokeUserSessions']);
        });

        // Database Management
        Route::prefix('database')->middleware('permission:database.manage')->group(function () {
            Route::get('/', [DatabaseController::class, 'index']);
            Route::get('tables/{table}', [DatabaseController::class, 'table']);
        });

        // API Management
        Route::prefix('api-keys')->middleware('permission:api.manage')->group(function () {
            Route::get('/', [ApiKeyController::class, 'index']);
            Route::post('/', [ApiKeyController::class, 'store']);
            Route::delete('{id}', [ApiKeyController::class, 'destroy'])->whereNumber('id');
        });

        // Backup & Restore
        Route::prefix('backups')->middleware('permission:backup.manage')->group(function () {
            Route::get('/', [BackupController::class, 'index']);
            Route::post('/', [BackupController::class, 'store']);
            Route::get('{name}/download', [BackupController::class, 'download']);
            Route::post('{name}/restore', [BackupController::class, 'restore']);
            Route::delete('{name}', [BackupController::class, 'destroy']);
        });

        // System Monitoring
        Route::get('monitoring', [MonitoringController::class, 'index'])->middleware('permission:system.monitor');

        // Developer Tools
        Route::prefix('dev')->middleware('permission:dev.tools')->group(function () {
            Route::get('/', [DevToolsController::class, 'index']);
            Route::post('actions/{action}', [DevToolsController::class, 'run']);
        });
    });
});
