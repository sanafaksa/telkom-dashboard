<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EdkImportController;
use App\Http\Controllers\Edk\EdkExportController;
use App\Http\Controllers\Edk\EdkSummaryController;
use App\Http\Controllers\Edk\EdkUploadController;

// ===== LAMA (hapus setelah frontend pindah ke /edk/uploads) =====
Route::post('/edk/import/preview', [EdkImportController::class, 'preview']);
Route::post('/edk/import/store', [EdkImportController::class, 'store']);
Route::get('/edk/monthly', [EdkImportController::class, 'monthlyData']);

// ===== BARU =====
Route::prefix('edk')->middleware('auth:sanctum')->group(function () {
    // Fase 1: upload snapshot
    Route::get('uploads', [EdkUploadController::class, 'index']);
    Route::post('uploads', [EdkUploadController::class, 'store']);
    Route::post('uploads/{upload}/activate', [EdkUploadController::class, 'activate']);
    Route::get('template', [EdkUploadController::class, 'template']);

    // Fase 2: query layer
    Route::get('summary/{by}', [EdkSummaryController::class, 'summary'])
        ->whereIn('by', ['segmen', 'periode', 'am', 'cc']);
    Route::get('cards', [EdkSummaryController::class, 'cards']);
    Route::get('options', [EdkSummaryController::class, 'options']);
    Route::get('top-customers', [EdkSummaryController::class, 'topCustomers']);

    // Fase 3: export
    Route::get('export', [EdkExportController::class, 'export']);
});
