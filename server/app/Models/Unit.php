<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = [
        'apartment_id',
        'unit_number',
        'floor',
        'rent_amount',
        'status',
    ];

    public function apartment()
    {
        return $this->belongsTo(Apartment::class);
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }

    public function rentPayments()
    {
        return $this->hasMany(RentPayment::class);
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class);
    }
}