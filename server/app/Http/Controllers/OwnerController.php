<?php

namespace App\Http\Controllers;

use App\Models\Apartment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

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
            'total_units' => 'required|integer|min:1',
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
}
