<?php

use App\Http\Controllers\Api\KuadranController;
use App\Http\Controllers\Api\MomSupportController;
use Illuminate\Support\Facades\Route;

Route::prefix('kuadran')->group(function () {
    Route::get('/', [KuadranController::class, 'index']);
    Route::post('/sync', [KuadranController::class, 'sync']);
    Route::delete('/{bulan}', [KuadranController::class, 'destroyMonth']);
});

Route::prefix('mom-support')->group(function () {
    Route::get('/', [MomSupportController::class, 'index']);
    Route::post('/sync', [MomSupportController::class, 'sync']);
    Route::put('/{id}', [MomSupportController::class, 'update']);
    Route::post('/reset', [MomSupportController::class, 'reset']);
});
