<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EdkImportController;

Route::post('/edk/import/preview', [EdkImportController::class, 'preview']);
Route::post('/edk/import/store', [EdkImportController::class, 'store']);
Route::get('/edk/monthly', [EdkImportController::class, 'monthlyData']);
