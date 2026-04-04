<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\RentPayment;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TenantController extends Controller
{
    public function dashboard()
    {
        $user = auth('api')->user();

        $tenant = Tenant::query()
            ->where('user_id', $user->id)
            ->with([
                'user',
                'unit.apartment',
                'complaints.unit',
                'rentPayments' => function ($query) {
                    $query->latest('payment_month');
                },
            ])
            ->first();

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant profile is not assigned yet.',
                'data' => null,
            ]);
        }

        $unit = $tenant->unit;
        $property = $unit?->apartment;
        $latestPayment = $tenant->rentPayments->sortByDesc('payment_month')->first();
        $nextDueDate = $this->nextDueDate($latestPayment);

        $announcements = Announcement::query()
            ->where(function ($query) use ($property) {
                $query->whereIn('target_role', ['tenant', 'all']);

                if ($property?->manager_id) {
                    $query->where(function ($nested) use ($property) {
                        $nested->where('created_by', $property->manager_id)
                            ->orWhere('target_role', 'all');
                    });
                }
            })
            ->with('creator')
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Tenant dashboard fetched successfully',
            'data' => [
                'tenant' => $tenant,
                'property' => $property,
                'unit' => $unit,
                'latest_payment' => $latestPayment,
                'next_due_date' => $nextDueDate?->toDateString(),
                'complaints' => $tenant->complaints
                    ->sortByDesc('created_at')
                    ->values(),
                'announcements' => $announcements,
            ],
        ]);
    }

    public function storeComplaint(Request $request)
    {
        $user = auth('api')->user();
        $tenant = Tenant::query()
            ->where('user_id', $user->id)
            ->with('unit')
            ->first();

        if (! $tenant || ! $tenant->unit_id) {
            return response()->json([
                'message' => 'Tenant profile is not assigned to a unit yet.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $complaint = Complaint::create([
            'tenant_id' => $tenant->id,
            'unit_id' => $tenant->unit_id,
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'priority' => $request->priority ?? 'medium',
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Complaint created successfully',
            'data' => $complaint->fresh(['tenant.user', 'unit']),
        ], 201);
    }

    public function storeRentPayment(Request $request)
    {
        $user = auth('api')->user();
        $tenant = Tenant::query()
            ->where('user_id', $user->id)
            ->with('unit')
            ->first();

        if (! $tenant || ! $tenant->unit_id || ! $tenant->unit) {
            return response()->json([
                'message' => 'Tenant profile is not assigned to a unit yet.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $latestPayment = RentPayment::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('payment_month')
            ->first();

        $dueDate = $this->nextDueDate($latestPayment);
        $paymentMonth = $dueDate?->format('Y-m') ?? Carbon::now()->format('Y-m');

        $payment = RentPayment::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'payment_month' => $paymentMonth,
            ],
            [
                'unit_id' => $tenant->unit_id,
                'amount' => $request->amount ?? $tenant->unit->rent_amount,
                'status' => 'paid',
                'payment_date' => Carbon::now()->toDateString(),
            ]
        );

        return response()->json([
            'message' => 'Rent payment submitted successfully',
            'data' => $payment->fresh(['tenant.user', 'unit']),
        ], 201);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $tenants = Tenant::with(['user', 'unit'])->latest()->get();
        return response()->json([
            'message' => 'Tenants fetched successfully',
            'data' => $tenants,
        ], 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id|unique:tenants,user_id',
            'unit_id' => 'nullable|exists:units,id',
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

        $tenant = Tenant::create([
            'user_id' => $request->user_id,
            'unit_id' => $request->unit_id,
            'move_in_date' => $request->move_in_date,
            'lease_start' => $request->lease_start,
            'lease_end' => $request->lease_end,
        ]);

        $tenant->load(['user', 'unit']);

        return response()->json([
            'message' => 'Tenant created successfully',
            'data' => $tenant,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $tenant = Tenant::with(['user', 'unit'])->find($id);

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        return response()->json([
            'message' => 'Tenant fetched successfully',
            'data' => $tenant,
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $tenant = Tenant::find($id);

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|required|exists:users,id|unique:tenants,user_id,' . $tenant->id,
            'unit_id' => 'nullable|exists:units,id',
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

        $tenant->update($request->only([
            'user_id',
            'unit_id',
            'move_in_date',
            'lease_start',
            'lease_end',
        ]));

        $tenant->load(['user', 'unit']);

        return response()->json([
            'message' => 'Tenant updated successfully',
            'data' => $tenant,
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $tenant = Tenant::find($id);

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        $tenant->delete();

        return response()->json([
            'message' => 'Tenant deleted successfully',
        ], 200);
    }

    private function nextDueDate(?RentPayment $latestPayment): ?Carbon
    {
        if (! $latestPayment) {
            return Carbon::now()->startOfMonth();
        }

        if ($latestPayment->status !== 'paid') {
            return Carbon::createFromFormat('Y-m', $latestPayment->payment_month)->startOfMonth();
        }

        return Carbon::createFromFormat('Y-m', $latestPayment->payment_month)
            ->addMonth()
            ->startOfMonth();
    }
}
