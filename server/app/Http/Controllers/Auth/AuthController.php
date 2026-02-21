<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
{
    try {
        $data = $request->validate([
            'name' => ['required','string','max:255'],
            'email' => ['required','email','max:255'],
            'date_of_birth' => ['nullable','date'],
            'password' => ['required','string','min:6'],
        ]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors'  => $e->errors(),
        ], 422);
    }

    $exists = DB::table('users')->where('email', $data['email'])->exists();
    if ($exists) {
        return response()->json(['success' => false, 'message' => 'Email already registered'], 409);
    }

    $id = DB::table('users')->insertGetId([
        'name' => $data['name'],
        'email' => $data['email'],
        'date_of_birth' => $data['date_of_birth'] ?? null,
        'password_hash' => Hash::make($data['password']),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Registered successfully',
        'user' => [
            'id' => $id,
            'name' => $data['name'],
            'email' => $data['email'],
            'date_of_birth' => $data['date_of_birth'] ?? null,
        ]
    ], 201);
}

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required','email'],
            'password' => ['required','string'],
        ]);

        $user = DB::table('users')->where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // CSR test login: return user only (no session/JWT yet)
        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'date_of_birth' => $user->date_of_birth,
            ]
        ]);
    }
}