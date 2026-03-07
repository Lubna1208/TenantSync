<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\ApartmentController;
use App\Http\Controllers\RentPaymentController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\AnnouncementController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);


Route::middleware(['jwt.cookie', 'auth:api'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

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

Route::get('/debug-auth', function () {
    try {
        return response()->json([
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