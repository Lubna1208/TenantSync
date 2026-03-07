<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'title',
        'message',
        'target_role'
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}