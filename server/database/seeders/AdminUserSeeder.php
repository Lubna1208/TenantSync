<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Owner Admin',
            'email' => 'admin@tenantsync.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'status' => 'active'
        ]);
    }
}