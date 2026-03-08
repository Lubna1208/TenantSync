<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TenantController extends Controller
{
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
}