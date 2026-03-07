<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ComplaintController extends Controller
{
    public function index()
    {
        $complaints = Complaint::with(['tenant', 'unit'])->latest()->get();

        return response()->json([
            'message' => 'Complaints fetched successfully',
            'data' => $complaints,
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|exists:tenants,id',
            'unit_id' => 'required|exists:units,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
            'status' => 'nullable|in:open,in_progress,resolved',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $complaint = Complaint::create([
            'tenant_id' => $request->tenant_id,
            'unit_id' => $request->unit_id,
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'priority' => $request->priority,
            'status' => $request->status ?? 'open',
        ]);

        $complaint->load(['tenant', 'unit']);

        return response()->json([
            'message' => 'Complaint created successfully',
            'data' => $complaint,
        ], 201);
    }

    public function show($id)
    {
        $complaint = Complaint::with(['tenant', 'unit'])->find($id);

        if (! $complaint) {
            return response()->json([
                'message' => 'Complaint not found',
            ], 404);
        }

        return response()->json([
            'message' => 'Complaint fetched successfully',
            'data' => $complaint,
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $complaint = Complaint::find($id);

        if (! $complaint) {
            return response()->json([
                'message' => 'Complaint not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'tenant_id' => 'sometimes|required|exists:tenants,id',
            'unit_id' => 'sometimes|required|exists:units,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'category' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
            'status' => 'nullable|in:open,in_progress,resolved',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $complaint->update($request->only([
            'tenant_id',
            'unit_id',
            'title',
            'description',
            'category',
            'priority',
            'status',
        ]));

        $complaint->load(['tenant', 'unit']);

        return response()->json([
            'message' => 'Complaint updated successfully',
            'data' => $complaint,
        ], 200);
    }

    public function destroy($id)
    {
        $complaint = Complaint::find($id);

        if (! $complaint) {
            return response()->json([
                'message' => 'Complaint not found',
            ], 404);
        }

        $complaint->delete();

        return response()->json([
            'message' => 'Complaint deleted successfully',
        ], 200);
    }
}