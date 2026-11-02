<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Edk\EdkExportController;
use App\Http\Controllers\Edk\EdkSummaryController;
use App\Http\Controllers\Edk\EdkUploadController;

Route::prefix('edk')->group(function () {
    // Upload snapshot
    Route::get('uploads', [EdkUploadController::class, 'index']);
    Route::post('uploads', [EdkUploadController::class, 'store']);
    Route::post('uploads/{upload}/activate', [EdkUploadController::class, 'activate']);
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
