<?php

use App\Http\Controllers\Api\KuadranController;
use Illuminate\Support\Facades\Route;

Route::prefix('kuadran')->group(function () {
    Route::get('/', [KuadranController::class, 'index']);
    Route::post('/sync', [KuadranController::class, 'sync']);
    Route::delete('/{bulan}', [KuadranController::class, 'destroyMonth']);
});

