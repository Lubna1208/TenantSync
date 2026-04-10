<?php

namespace App\Http\Controllers;

use App\Mail\TenantInvitationMail;
use App\Models\Announcement;
use App\Models\Apartment;
use App\Models\Complaint;
use App\Models\RentPayment;
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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ManagerController extends Controller
{
    public function dashboard()
    {
        $manager = auth('api')->user();

        $property = Apartment::query()
            ->where('manager_id', $manager->id)
            ->with([
                'units.tenants.user',
            ])
            ->first();

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
                'data' => null,
            ]);
        }

        $units = $property->units;
        $payments = RentPayment::query()
            ->whereHas('unit', function ($query) use ($property) {
                $query->where('apartment_id', $property->id);
            })
            ->with([
                'tenant.user',
                'unit.apartment',
            ])
            ->orderByRaw("case when status = 'paid' then 0 else 1 end")
            ->orderByDesc('paid_at')
            ->orderByDesc('payment_date')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'message' => 'Manager dashboard fetched successfully',
            'data' => [
                'property' => $property,
                'summary' => [
                    'unit_limit' => $property->total_units,
                    'units_created' => $units->count(),
                    'vacant_units' => $units->where('status', 'vacant')->count(),
                    'occupied_units' => $units->where('status', 'occupied')->count(),
                ],
                'payments' => $payments,
            ],
        ]);
    }

    public function storeUnit(Request $request)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
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

        if ($property->units()->count() >= $property->total_units) {
            return response()->json([
                'message' => 'Unit limit reached for this property.',
            ], 422);
        }

        $duplicateUnit = Unit::query()
            ->where('apartment_id', $property->id)
            ->where('unit_number', $request->unit_number)
            ->exists();

        if ($duplicateUnit) {
            return response()->json([
                'message' => 'This unit number already exists in the assigned property.',
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

    public function updateUnit(Request $request, $id)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $unit = Unit::query()
            ->where('apartment_id', $property->id)
            ->find($id);

        if (! $unit) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'unit_number' => 'sometimes|required|string|max:255',
            'floor' => 'nullable|string|max:255',
            'rent_amount' => 'sometimes|required|numeric|min:0',
            'status' => 'nullable|in:vacant,occupied',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $nextUnitNumber = $request->unit_number ?? $unit->unit_number;

        $duplicateUnit = Unit::query()
            ->where('apartment_id', $property->id)
            ->where('unit_number', $nextUnitNumber)
            ->where('id', '!=', $unit->id)
            ->exists();

        if ($duplicateUnit) {
            return response()->json([
                'message' => 'This unit number already exists in the assigned property.',
            ], 422);
        }

        DB::transaction(function () use ($request, $unit) {
            $newStatus = $request->status ?? $unit->status;

            $unit->update([
                'unit_number' => $request->unit_number ?? $unit->unit_number,
                'floor' => $request->floor ?? $unit->floor,
                'rent_amount' => $request->rent_amount ?? $unit->rent_amount,
                'status' => $newStatus,
            ]);

            if ($newStatus === 'vacant') {
                Tenant::query()
                    ->where('unit_id', $unit->id)
                    ->update(['unit_id' => null]);
            }
        });

        $unit->load('tenants.user');

        return response()->json([
            'message' => 'Unit updated successfully',
            'data' => $unit,
        ]);
    }

    public function assignTenant(Request $request, $id)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $unit = Unit::query()
            ->where('apartment_id', $property->id)
            ->find($id);

        if (! $unit) {
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

            DB::transaction(function () use ($request, $unit, $manager) {
                $tenantUser = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'date_of_birth' => $request->date_of_birth,
                    'password' => Hash::make($request->password),
                    'role' => 'tenant',
                    'status' => 'active',
                    'created_by' => $manager->id,
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
            $manager,
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

    public function vacateUnit($id)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $unit = Unit::query()
            ->where('apartment_id', $property->id)
            ->find($id);

        if (! $unit) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        DB::transaction(function () use ($unit) {
            Tenant::query()
                ->where('unit_id', $unit->id)
                ->update(['unit_id' => null]);

            $unit->update([
                'status' => 'vacant',
            ]);
        });

        $unit->load('tenants.user');

        return response()->json([
            'message' => 'Unit marked as vacant successfully',
            'data' => $unit,
        ]);
    }

    public function removeTenant($id)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $unit = Unit::query()
            ->where('apartment_id', $property->id)
            ->with('tenants.user')
            ->find($id);

        if (! $unit) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        $tenant = $unit->tenants()
            ->whereNotNull('unit_id')
            ->with('user')
            ->first();

        if (! $tenant) {
            return response()->json([
                'message' => 'No tenant is assigned to this unit.',
            ], 422);
        }

        DB::transaction(function () use ($tenant, $unit) {
            $tenantUser = $tenant->user;

            $tenant->delete();

            if ($tenantUser) {
                $tenantUser->delete();
            }

            $unit->update([
                'status' => 'vacant',
            ]);
        });

        $unit->load('tenants.user');

        return response()->json([
            'message' => 'Tenant removed and unit marked vacant successfully',
            'data' => $unit,
        ]);
    }

    public function complaints()
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
                'data' => [],
            ]);
        }

        $complaints = Complaint::query()
            ->whereHas('unit', function ($query) use ($property) {
                $query->where('apartment_id', $property->id);
            })
            ->with([
                'tenant.user',
                'unit',
            ])
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Complaints fetched successfully',
            'data' => $complaints,
        ]);
    }

    public function updateComplaint(Request $request, $id)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $complaint = Complaint::query()
            ->whereHas('unit', function ($query) use ($property) {
                $query->where('apartment_id', $property->id);
            })
            ->with(['tenant.user', 'unit'])
            ->find($id);

        if (! $complaint) {
            return response()->json([
                'message' => 'Complaint not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $complaint->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'message' => 'Complaint updated successfully',
            'data' => $complaint->fresh(['tenant.user', 'unit']),
        ]);
    }

    public function sendComplaintReply(Request $request, $id)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $complaint = Complaint::query()
            ->whereHas('unit', function ($query) use ($property) {
                $query->where('apartment_id', $property->id);
            })
            ->with(['tenant.user', 'unit'])
            ->find($id);

        if (! $complaint) {
            return response()->json([
                'message' => 'Complaint not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'manager_reply' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $complaint->update([
            'manager_reply' => trim($request->manager_reply),
            'manager_reply_sent_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'Reply sent to tenant successfully',
            'data' => $complaint->fresh(['tenant.user', 'unit']),
        ]);
    }

    public function storeRentPayment(Request $request)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|integer',
            'amount' => 'required|numeric|min:0',
            'payment_month' => 'required|date_format:Y-m',
            'payment_date' => 'nullable|date',
            'status' => 'nullable|in:paid,unpaid,pending',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenant = Tenant::query()
            ->where('id', $request->tenant_id)
            ->whereHas('unit', function ($query) use ($property) {
                $query->where('apartment_id', $property->id);
            })
            ->with('unit')
            ->first();

        if (! $tenant || ! $tenant->unit) {
            return response()->json([
                'message' => 'Tenant not found in your assigned property.',
            ], 404);
        }

        $paymentDate = $request->payment_date;
        $status = $request->status ?? ($paymentDate ? 'paid' : 'pending');

        $payment = RentPayment::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'payment_month' => $request->payment_month,
            ],
            [
                'unit_id' => $tenant->unit->id,
                'amount' => $request->amount,
                'currency' => strtolower((string) config('services.stripe.currency', 'bdt')),
                'payment_method' => $status === 'paid' ? 'manager_entry' : null,
                'payment_date' => $paymentDate,
                'paid_at' => $status === 'paid' && $paymentDate ? Carbon::parse($paymentDate)->endOfDay() : null,
                'failure_reason' => null,
                'status' => $status,
            ]
        );

        return response()->json([
            'message' => 'Rent payment saved successfully',
            'data' => $payment->fresh(['tenant.user', 'unit']),
        ], 201);
    }

    public function storeAnnouncement(Request $request)
    {
        $manager = auth('api')->user();
        $property = $this->assignedProperty($manager->id);

        if (! $property) {
            return response()->json([
                'message' => 'No property is assigned to this manager yet.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_role' => 'nullable|in:tenant,manager,all',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $announcement = Announcement::create([
            'created_by' => $manager->id,
            'title' => $request->title,
            'message' => $request->message,
            'target_role' => $request->target_role ?? 'tenant',
        ]);

        return response()->json([
            'message' => 'Announcement created successfully',
            'data' => $announcement->load('creator'),
        ], 201);
    }

    private function assignedProperty(int $managerId): ?Apartment
    {
        return Apartment::query()
            ->where('manager_id', $managerId)
            ->first();
    }

    private function createOrRefreshTenantInvitation(Request $request, Unit $unit, User $manager, ?Tenant $existingTenant = null): array
    {
        $plainToken = Str::random(64);
        $hashedToken = hash('sha256', $plainToken);
        $expiresAt = Carbon::now()->addDay();
        $placeholderPassword = Hash::make(Str::random(40));

        $invitation = DB::transaction(function () use (
            $request,
            $unit,
            $manager,
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
                    'created_by' => $manager->id,
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
                    'created_by' => $manager->id,
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
                'invited_by' => $manager->id,
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
