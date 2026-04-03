<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\ApartmentController;
use App\Http\Controllers\RentPaymentController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\OwnerController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware(['jwt.cookie']);


Route::middleware(['jwt.cookie', 'auth.api.user'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    Route::middleware('role:admin')->prefix('owner')->group(function () {
        Route::get('/managers', [OwnerController::class, 'managers']);
        Route::post('/managers', [OwnerController::class, 'storeManager']);
        Route::delete('/managers/{id}', [OwnerController::class, 'destroyManager']);

        Route::get('/properties', [OwnerController::class, 'properties']);
        Route::post('/properties', [OwnerController::class, 'storeProperty']);
        Route::delete('/properties/{id}', [OwnerController::class, 'destroyProperty']);
        Route::patch('/properties/{id}/manager', [OwnerController::class, 'assignManager']);
    });

    Route::apiResource('tenants', TenantController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('apartments', ApartmentController::class);
    Route::apiResource('rent-payments', RentPaymentController::class);
    Route::apiResource('complaints', ComplaintController::class);
    Route::apiResource('announcements', AnnouncementController::class);
});

Route::middleware(['jwt.cookie'])->get('/debug-cookie', function () {
    return response()->json([
        'cookie_token' => request()->cookie('jwt_token'),
        'auth_header' => request()->header('Authorization'),
        'bearer_token' => request()->bearerToken(),
    ]);
});

Route::middleware(['jwt.cookie'])->get('/debug-auth', function () {
    try {
        return response()->json([
            'auth_header' => request()->header('Authorization'),
            'bearer_token' => request()->bearerToken(),
            'user' => auth('api')->user(),
            'check' => auth('api')->check(),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::get('/ping', function () {
    return response()->json(['ok' => true]);
});
