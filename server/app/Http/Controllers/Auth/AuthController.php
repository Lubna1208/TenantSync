<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function __construct()
    {
        $this->middleware('jwt.cookie', ['except' => ['register', 'login']]);
        $this->middleware('auth:api', ['except' => ['register', 'login']]);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'date_of_birth' => 'nullable|date',
            'password' => 'required|string|min:6|confirmed',
            'role' => 'nullable|in:admin,manager,tenant',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'date_of_birth' => $request->date_of_birth,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'tenant',
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (! $token = auth('api')->attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid email or password',
            ], 401);
        }

        $user = auth('api')->user();

        if ($user->status !== 'active') {
            auth('api')->logout();

            return response()->json([
                'message' => 'This account is inactive',
            ], 403);
        }

        $cookie = cookie(
            'jwt_token',
            $token,
            1440,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );

        return response()->json([
    'message' => 'Login successful',
    'token' => $token,
    'user' => $user,
    ])->withCookie($cookie);
    }

    public function me()
    {
        return response()->json(auth('api')->user());
    }

    public function logout()
    {
        auth('api')->logout();

        return response()->json([
            'message' => 'Logout successful',
        ])->withCookie(cookie()->forget('jwt_token'));
    }

    public function refresh()
{
    $token = auth('api')->refresh();

    $cookie = cookie(
        'jwt_token',
        $token,
        1440,
        '/',
        null,
        false,
        true,
        false,
        'Lax'
    );

    return response()->json([
        'message' => 'Token refreshed',
        'token' => $token,
        'user' => auth('api')->user(),
    ])->withCookie($cookie);
}
}