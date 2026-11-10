<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\KuadranController;
use App\Http\Controllers\Api\MomSupportController;
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
    Route::get('populations', [EdkUploadController::class, 'populations']);
    Route::get('uploads', [EdkUploadController::class, 'index']);
    Route::post('uploads', [EdkUploadController::class, 'store'])->middleware('role:admin');
    Route::post('uploads/{upload}/activate', [EdkUploadController::class, 'activate'])->middleware('role:admin');
    Route::get('template', [EdkUploadController::class, 'template']);

    // Query layer
    Route::get('summary/{by}', [EdkSummaryController::class, 'summary'])
        ->whereIn('by', ['segmen', 'periode', 'am', 'cc']);
    Route::get('cards', [EdkSummaryController::class, 'cards']);
    Route::get('options', [EdkSummaryController::class, 'options']);
    Route::get('top-customers/detail', [EdkSummaryController::class, 'customerDetails']);
    Route::get('top-customers', [EdkSummaryController::class, 'topCustomers']);

    // Export
    Route::get('export', [EdkExportController::class, 'export']);
});

// ===== Kuadran =====
Route::prefix('kuadran')->group(function () {
    Route::get('/', [KuadranController::class, 'index']);
    Route::post('/sync', [KuadranController::class, 'sync']);
    Route::delete('/{bulan}', [KuadranController::class, 'destroyMonth']);
});

// ===== MoM Support =====
Route::prefix('mom-support')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [MomSupportController::class, 'index']);
    Route::post('/sync', [MomSupportController::class, 'sync']);
    Route::put('/{id}', [MomSupportController::class, 'update']);
    Route::post('/reset', [MomSupportController::class, 'reset']);
});

// ===== Audit log (khusus admin) =====
Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware(['auth:sanctum', 'role:admin']);
