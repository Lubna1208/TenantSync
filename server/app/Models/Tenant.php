<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = [
        'user_id',
        'unit_id',
        'move_in_date',
        'lease_start',
        'lease_end',
    ];

    protected $casts = [
        'move_in_date' => 'date',
        'lease_start' => 'date',
        'lease_end' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
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