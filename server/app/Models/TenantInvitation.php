<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantInvitation extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'unit_id',
        'invited_by',
        'email',
        'token_hash',
        'expires_at',
        'is_used',
        'used_at',
        'last_sent_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_used' => 'boolean',
        'used_at' => 'datetime',
        'last_sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
