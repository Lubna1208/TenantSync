<?php

namespace App\Http\Controllers;

use App\Models\Apartment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ApartmentController extends Controller
{
    public function index()
    {
        $apartments = Apartment::with(['owner', 'units'])->latest()->get();

        return response()->json([
            'message' => 'Apartments fetched successfully',
            'data' => $apartments
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'owner_id' => 'required|exists:users,id',
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'total_units' => 'required|integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $apartment = Apartment::create([
            'owner_id' => $request->owner_id,
            'name' => $request->name,
            'address' => $request->address,
            'total_units' => $request->total_units
        ]);

        return response()->json([
            'message' => 'Apartment created successfully',
            'data' => $apartment
        ], 201);
    }

    public function show($id)
    {
        $apartments = Apartment::with(['owner', 'units'])->latest()->get();

        if (!$apartment) {
            return response()->json([
                'message' => 'Apartment not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Apartment fetched successfully',
            'data' => $apartment
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $apartment = Apartment::find($id);

        if (!$apartment) {
            return response()->json([
                'message' => 'Apartment not found'
            ], 404);
        }

        $apartment->update($request->only([
            'owner_id',
            'name',
            'address',
            'total_units'
        ]));

        return response()->json([
            'message' => 'Apartment updated successfully',
            'data' => $apartment
        ], 200);
    }

    public function destroy($id)
    {
        $apartment = Apartment::find($id);

        if (!$apartment) {
            return response()->json([
                'message' => 'Apartment not found'
            ], 404);
        }

        $apartment->delete();

        return response()->json([
            'message' => 'Apartment deleted successfully'
        ], 200);
    }
}