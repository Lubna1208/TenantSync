<?php

namespace App\Http\Controllers;

use App\Models\RentPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RentPaymentController extends Controller
{
    public function index()
    {
        $payments = RentPayment::with(['tenant', 'unit'])->latest()->get();

        return response()->json([
            'message' => 'Rent payments fetched successfully',
            'data' => $payments
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|exists:tenants,id',
            'unit_id' => 'required|exists:units,id',
            'amount' => 'required|numeric|min:0',
            'payment_month' => 'required|string',
            'status' => 'nullable|in:paid,unpaid,pending',
            'payment_date' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $payment = RentPayment::create([
            'tenant_id' => $request->tenant_id,
            'unit_id' => $request->unit_id,
            'amount' => $request->amount,
            'payment_month' => $request->payment_month,
            'status' => $request->status ?? 'pending',
            'payment_date' => $request->payment_date,
        ]);

        // relation load
        $payment->load(['tenant', 'unit']);

        return response()->json([
            'message' => 'Rent payment created successfully',
            'data' => $payment
        ], 201);
    }

    public function show($id)
    {
        $payment = RentPayment::with(['tenant', 'unit'])->find($id);

        if (!$payment) {
            return response()->json([
                'message' => 'Payment not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Payment fetched successfully',
            'data' => $payment
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $payment = RentPayment::find($id);

        if (!$payment) {
            return response()->json([
                'message' => 'Payment not found'
            ], 404);
        }

        $payment->update($request->only([
            'tenant_id',
            'unit_id',
            'amount',
            'payment_month',
            'status',
            'payment_date'
        ]));

        // relation load
        $payment->load(['tenant', 'unit']);

        return response()->json([
            'message' => 'Payment updated successfully',
            'data' => $payment
        ], 200);
    }

    public function destroy($id)
    {
        $payment = RentPayment::find($id);

        if (!$payment) {
            return response()->json([
                'message' => 'Payment not found'
            ], 404);
        }

        $payment->delete();

        return response()->json([
            'message' => 'Payment deleted successfully'
        ], 200);
    }
}