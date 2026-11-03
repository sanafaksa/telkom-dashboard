<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Edk\EdkExportController;
use App\Http\Controllers\Edk\EdkSummaryController;
use App\Http\Controllers\Edk\EdkUploadController;

// ===== Auth =====
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

// ===== EDK =====
Route::prefix('edk')->middleware('auth:sanctum')->group(function () {
    // Upload snapshot (upload & rollback khusus admin)
    Route::get('uploads', [EdkUploadController::class, 'index']);
    Route::post('uploads', [EdkUploadController::class, 'store'])->middleware('role:admin');
    Route::post('uploads/{upload}/activate', [EdkUploadController::class, 'activate'])->middleware('role:admin');
    Route::get('template', [EdkUploadController::class, 'template']);

    // Query layer
    Route::get('summary/{by}', [EdkSummaryController::class, 'summary'])
        ->whereIn('by', ['segmen', 'periode', 'am', 'cc']);
    Route::get('cards', [EdkSummaryController::class, 'cards']);
    Route::get('options', [EdkSummaryController::class, 'options']);
    Route::get('top-customers', [EdkSummaryController::class, 'topCustomers']);

    // Export
    Route::get('export', [EdkExportController::class, 'export']);
});

// ===== Audit log (khusus admin) =====
Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware(['auth:sanctum', 'role:admin']);
