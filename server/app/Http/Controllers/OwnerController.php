<?php

namespace App\Http\Controllers;

use App\Mail\TenantInvitationMail;
use App\Models\Apartment;
use App\Models\Tenant;
use App\Models\TenantInvitation;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class OwnerController extends Controller
{
    public function managers()
    {
        $owner = auth('api')->user();

        $managers = User::query()
            ->where('role', 'manager')
            ->where('created_by', $owner->id)
            ->withCount('managedApartments')
            ->with(['managedApartments:id,owner_id,manager_id,name,total_units'])
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Managers fetched successfully',
            'data' => $managers,
        ]);
    }

    public function storeManager(Request $request)
    {
        $owner = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'date_of_birth' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $manager = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'date_of_birth' => $request->date_of_birth,
            'password' => Hash::make($request->password),
            'role' => 'manager',
            'status' => 'active',
            'created_by' => $owner->id,
        ]);

        return response()->json([
            'message' => 'Manager created successfully',
            'data' => $manager,
        ], 201);
    }

    public function destroyManager($id)
    {
        $owner = auth('api')->user();

        $manager = User::query()
            ->where('role', 'manager')
            ->where('created_by', $owner->id)
            ->find($id);

        if (! $manager) {
            return response()->json([
                'message' => 'Manager not found',
            ], 404);
        }

        DB::transaction(function () use ($manager, $owner) {
            Apartment::query()
                ->where('owner_id', $owner->id)
                ->where('manager_id', $manager->id)
                ->update(['manager_id' => null]);

            $manager->delete();
        });

        return response()->json([
            'message' => 'Manager removed successfully',
        ]);
    }

    public function properties()
    {
        $owner = auth('api')->user();

        $properties = Apartment::query()
            ->where('owner_id', $owner->id)
            ->with([
                'manager:id,name,email,created_by',
                'units:id,apartment_id,unit_number,floor,rent_amount,status',
            ])
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Properties fetched successfully',
            'data' => $properties,
        ]);
    }

    public function storeProperty(Request $request)
    {
        $owner = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'total_units' => 'required|integer|min:1|max:4294967295',
            'manager_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) use ($owner) {
                    $query->where('role', 'manager')
                        ->where('created_by', $owner->id);
                }),
            ],
        ], [
            'total_units.max' => 'Total units is too large. Please enter a smaller value.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->manager_id && $this->managerAlreadyAssigned((int) $request->manager_id)) {
            return response()->json([
                'message' => 'A manager can only handle one property.',
            ], 422);
        }

        $property = Apartment::create([
            'owner_id' => $owner->id,
            'manager_id' => $request->manager_id,
            'name' => $request->name,
            'address' => $request->address,
            'total_units' => $request->total_units,
        ]);

        $property->load('manager:id,name,email');

        return response()->json([
            'message' => 'Property created successfully',
            'data' => $property,
        ], 201);
    }

    public function destroyProperty($id)
    {
        $owner = auth('api')->user();

        $property = Apartment::query()
            ->where('owner_id', $owner->id)
            ->find($id);

        if (! $property) {
            return response()->json([
                'message' => 'Property not found',
            ], 404);
        }

        $property->delete();

        return response()->json([
            'message' => 'Property deleted successfully',
        ]);
    }

    public function assignManager(Request $request, $id)
    {
        $owner = auth('api')->user();

        $property = Apartment::query()
            ->where('owner_id', $owner->id)
            ->find($id);

        if (! $property) {
            return response()->json([
                'message' => 'Property not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'manager_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) use ($owner) {
                    $query->where('role', 'manager')
                        ->where('created_by', $owner->id);
                }),
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (
            $request->manager_id &&
            $this->managerAlreadyAssigned((int) $request->manager_id, $property->id)
        ) {
            return response()->json([
                'message' => 'A manager can only handle one property.',
            ], 422);
        }

        $property->update([
            'manager_id' => $request->manager_id,
        ]);

        $property->load([
            'manager:id,name,email,created_by',
            'units:id,apartment_id,unit_number,floor,rent_amount,status',
        ]);

        return response()->json([
            'message' => 'Manager assignment updated successfully',
            'data' => $property,
        ]);
    }

    private function managerAlreadyAssigned(int $managerId, ?int $ignorePropertyId = null): bool
    {
        return Apartment::query()
            ->where('manager_id', $managerId)
            ->when($ignorePropertyId, function ($query) use ($ignorePropertyId) {
                $query->where('id', '!=', $ignorePropertyId);
            })
            ->exists();
    }

    public function storeUnit(Request $request, $id)
    {
        $owner = auth('api')->user();

        $property = Apartment::query()
            ->where('owner_id', $owner->id)
            ->find($id);

        if (! $property) {
            return response()->json([
                'message' => 'Property not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'unit_number' => 'required|string|max:255',
            'floor' => 'nullable|string|max:255',
            'rent_amount' => 'required|numeric|min:0',
            'status' => 'nullable|in:vacant,occupied',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $existingUnit = Unit::query()
            ->where('apartment_id', $property->id)
            ->where('unit_number', $request->unit_number)
            ->first();

        if ($existingUnit) {
            return response()->json([
                'message' => 'This unit number already exists in the selected apartment',
            ], 422);
        }

        if ($property->units()->count() >= $property->total_units) {
            return response()->json([
                'message' => 'Unit limit reached for this property.',
            ], 422);
        }

        $unit = Unit::create([
            'apartment_id' => $property->id,
            'unit_number' => $request->unit_number,
            'floor' => $request->floor,
            'rent_amount' => $request->rent_amount,
            'status' => $request->status ?? 'vacant',
        ]);

        return response()->json([
            'message' => 'Unit created successfully',
            'data' => $unit,
        ], 201);
    }

    public function assignTenant(Request $request, $id)
    {
        $owner = auth('api')->user();

        $unit = Unit::query()
            ->with('apartment')
            ->find($id);

        if (! $unit || ! $unit->apartment || $unit->apartment->owner_id !== $owner->id) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        $assignedTenant = $unit->tenants()
            ->whereNotNull('unit_id')
            ->with('user')
            ->first();

        $reusableInvitationUserId = null;

        if (
            $assignedTenant &&
            $assignedTenant->user &&
            $assignedTenant->user->status === 'inactive' &&
            strcasecmp($assignedTenant->user->email, (string) $request->email) === 0
        ) {
            $reusableInvitationUserId = $assignedTenant->user->id;
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($reusableInvitationUserId),
            ],
            'password' => 'nullable|string|min:6|confirmed',
            'date_of_birth' => 'nullable|date',
            'move_in_date' => 'nullable|date',
            'lease_start' => 'nullable|date',
            'lease_end' => 'nullable|date|after_or_equal:lease_start',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->filled('password')) {
            if ($assignedTenant) {
                return response()->json([
                    'message' => 'This unit already has a tenant assigned.',
                ], 422);
            }

            DB::transaction(function () use ($request, $unit, $owner) {
                $tenantUser = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'date_of_birth' => $request->date_of_birth,
                    'password' => Hash::make($request->password),
                    'role' => 'tenant',
                    'status' => 'active',
                    'created_by' => $owner->id,
                ]);

                Tenant::create([
                    'user_id' => $tenantUser->id,
                    'unit_id' => $unit->id,
                    'move_in_date' => $request->move_in_date,
                    'lease_start' => $request->lease_start,
                    'lease_end' => $request->lease_end,
                ]);

                $unit->update([
                    'status' => 'occupied',
                ]);
            });

            $unit->load('tenants.user');

            return response()->json([
                'message' => 'Tenant assigned successfully',
                'data' => $unit,
            ], 201);
        }

        if (
            $assignedTenant &&
            (
                ! $assignedTenant->user ||
                $assignedTenant->user->status !== 'inactive' ||
                strcasecmp($assignedTenant->user->email, $request->email) !== 0
            )
        ) {
            return response()->json([
                'message' => 'This unit already has a tenant assigned.',
            ], 422);
        }

        [$invitation, $invitationUrl, $mailDelivered] = $this->createOrRefreshTenantInvitation(
            $request,
            $unit,
            $owner,
            $assignedTenant
        );

        $unit->load('tenants.user');

        return response()->json([
            'message' => $assignedTenant
                ? 'Tenant invitation resent successfully'
                : 'Tenant invitation sent successfully',
            'data' => $unit,
            'invitation' => [
                'email' => $invitation->email,
                'expires_at' => optional($invitation->expires_at)->toIso8601String(),
                'invitation_url' => ! $mailDelivered && config('app.debug') ? $invitationUrl : null,
                'mail_delivered' => $mailDelivered,
            ],
        ], 201);
    }

    private function createOrRefreshTenantInvitation(Request $request, Unit $unit, User $owner, ?Tenant $existingTenant = null): array
    {
        $plainToken = Str::random(64);
        $hashedToken = hash('sha256', $plainToken);
        $expiresAt = Carbon::now()->addDay();
        $placeholderPassword = Hash::make(Str::random(40));

        $invitation = DB::transaction(function () use (
            $request,
            $unit,
            $owner,
            $existingTenant,
            $placeholderPassword,
            $hashedToken,
            $expiresAt
        ) {
            if ($existingTenant && $existingTenant->user) {
                $tenantUser = $existingTenant->user;

                $tenantUser->update([
                    'name' => $request->name,
                    'email' => $request->email,
                    'date_of_birth' => $request->date_of_birth,
                    'password' => $placeholderPassword,
                    'status' => 'inactive',
                    'created_by' => $owner->id,
                ]);

                $existingTenant->update([
                    'unit_id' => $unit->id,
                    'move_in_date' => $request->move_in_date,
                    'lease_start' => $request->lease_start,
                    'lease_end' => $request->lease_end,
                ]);

                TenantInvitation::query()
                    ->where('user_id', $tenantUser->id)
                    ->where('is_used', false)
                    ->update([
                        'is_used' => true,
                        'used_at' => Carbon::now(),
                    ]);

                $tenant = $existingTenant;
            } else {
                $tenantUser = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'date_of_birth' => $request->date_of_birth,
                    'password' => $placeholderPassword,
                    'role' => 'tenant',
                    'status' => 'inactive',
                    'created_by' => $owner->id,
                ]);

                $tenant = Tenant::create([
                    'user_id' => $tenantUser->id,
                    'unit_id' => $unit->id,
                    'move_in_date' => $request->move_in_date,
                    'lease_start' => $request->lease_start,
                    'lease_end' => $request->lease_end,
                ]);
            }

            $unit->update([
                'status' => 'occupied',
            ]);

            return TenantInvitation::create([
                'user_id' => $tenantUser->id,
                'tenant_id' => $tenant->id,
                'unit_id' => $unit->id,
                'invited_by' => $owner->id,
                'email' => $request->email,
                'token_hash' => $hashedToken,
                'expires_at' => $expiresAt,
                'is_used' => false,
                'last_sent_at' => Carbon::now(),
            ])->fresh(['user', 'unit.apartment', 'inviter']);
        });

        $invitationUrl = rtrim((string) config('app.frontend_url'), '/') . '/invite/' . $plainToken;

        $mailDelivered = true;

        try {
            Mail::to($invitation->email)->send(new TenantInvitationMail($invitation, $invitationUrl));
        } catch (\Throwable $exception) {
            $mailDelivered = false;

            Log::warning('Tenant invitation email delivery failed.', [
                'email' => $invitation->email,
                'invitation_id' => $invitation->id,
                'error' => $exception->getMessage(),
            ]);
        }

        return [$invitation, $invitationUrl, $mailDelivered];
    }
}
