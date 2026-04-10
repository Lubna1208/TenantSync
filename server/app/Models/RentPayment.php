<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'unit_id',
        'amount',
        'currency',
        'payment_month',
        'stripe_session_id',
        'stripe_payment_intent_id',
        'payment_method',
        'status',
        'payment_date',
        'paid_at',
        'failure_reason',
        'receipt_url',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'paid_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }
}
