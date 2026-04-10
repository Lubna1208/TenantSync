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
use App\Http\Controllers\ManagerController;
use App\Http\Controllers\StripePaymentController;
use App\Http\Controllers\TenantInvitationController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware(['jwt.cookie']);
Route::post('/auth/refresh', [AuthController::class, 'refresh'])->middleware(['jwt.cookie']);
Route::get('/tenant-invitations/{token}', [TenantInvitationController::class, 'show']);
Route::post('/tenant-invitations/{token}/accept', [TenantInvitationController::class, 'accept']);


Route::middleware(['jwt.cookie', 'auth.api.user'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    Route::middleware('role:admin')->prefix('owner')->group(function () {
        Route::get('/managers', [OwnerController::class, 'managers']);
        Route::post('/managers', [OwnerController::class, 'storeManager']);
        Route::delete('/managers/{id}', [OwnerController::class, 'destroyManager']);

        Route::get('/properties', [OwnerController::class, 'properties']);
        Route::post('/properties', [OwnerController::class, 'storeProperty']);
        Route::delete('/properties/{id}', [OwnerController::class, 'destroyProperty']);
        Route::patch('/properties/{id}/manager', [OwnerController::class, 'assignManager']);
    });

    Route::middleware('role:manager')->prefix('manager')->group(function () {
        Route::get('/dashboard', [ManagerController::class, 'dashboard']);
        Route::post('/units', [ManagerController::class, 'storeUnit']);
        Route::patch('/units/{id}', [ManagerController::class, 'updateUnit']);
        Route::post('/units/{id}/assign-tenant', [ManagerController::class, 'assignTenant']);
        Route::patch('/units/{id}/vacate', [ManagerController::class, 'vacateUnit']);
        Route::delete('/units/{id}/tenant', [ManagerController::class, 'removeTenant']);
        Route::get('/complaints', [ManagerController::class, 'complaints']);
        Route::patch('/complaints/{id}', [ManagerController::class, 'updateComplaint']);
        Route::post('/complaints/{id}/reply', [ManagerController::class, 'sendComplaintReply']);
        Route::post('/rent-payments', [ManagerController::class, 'storeRentPayment']);
        Route::post('/announcements', [ManagerController::class, 'storeAnnouncement']);
    });

    Route::middleware('role:tenant')->prefix('tenant')->group(function () {
        Route::get('/dashboard', [TenantController::class, 'dashboard']);
        Route::post('/complaints', [TenantController::class, 'storeComplaint']);
        Route::post('/payments/checkout-session', [StripePaymentController::class, 'createCheckoutSession']);
        Route::get('/payments/verify', [StripePaymentController::class, 'verifySession']);
        Route::post('/rent-payments', [TenantController::class, 'storeRentPayment']);
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

Route::post('/stripe/webhook', [StripePaymentController::class, 'handleWebhook']);

Route::get('/ping', function () {
    return response()->json(['ok' => true]);
});
