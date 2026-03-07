<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UnitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $units = Unit::with(['apartment', 'tenants'])->latest()->get();

        return response()->json([
            'message' => 'Units fetched successfully',
            'data' => $units,
        ], 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'apartment_id' => 'required|exists:apartments,id',
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

        $existingUnit = Unit::where('apartment_id', $request->apartment_id)
            ->where('unit_number', $request->unit_number)
            ->first();

        if ($existingUnit) {
            return response()->json([
                'message' => 'This unit number already exists in the selected apartment',
            ], 422);
        }

        $unit = Unit::create([
            'apartment_id' => $request->apartment_id,
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

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $unit = Unit::with(['apartment', 'tenants'])->find($id);

        if (! $unit) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        return response()->json([
            'message' => 'Unit fetched successfully',
            'data' => $unit,
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $unit = Unit::find($id);

        if (! $unit) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'apartment_id' => 'sometimes|required|exists:apartments,id',
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

        $apartmentId = $request->apartment_id ?? $unit->apartment_id;
        $unitNumber = $request->unit_number ?? $unit->unit_number;

        $duplicateUnit = Unit::where('apartment_id', $apartmentId)
            ->where('unit_number', $unitNumber)
            ->where('id', '!=', $unit->id)
            ->first();

        if ($duplicateUnit) {
            return response()->json([
                'message' => 'This unit number already exists in the selected apartment',
            ], 422);
        }

        $unit->update([
            'apartment_id' => $request->apartment_id ?? $unit->apartment_id,
            'unit_number' => $request->unit_number ?? $unit->unit_number,
            'floor' => $request->floor ?? $unit->floor,
            'rent_amount' => $request->rent_amount ?? $unit->rent_amount,
            'status' => $request->status ?? $unit->status,
        ]);

        return response()->json([
            'message' => 'Unit updated successfully',
            'data' => $unit,
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $unit = Unit::find($id);

        if (! $unit) {
            return response()->json([
                'message' => 'Unit not found',
            ], 404);
        }

        $unit->delete();

        return response()->json([
            'message' => 'Unit deleted successfully',
        ], 200);
    }
}