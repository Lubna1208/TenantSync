<?php

namespace App\Http\Controllers;

use App\Models\TenantInvitation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class TenantInvitationController extends Controller
{
    public function show(string $token)
    {
        $invitation = $this->findValidInvitation($token);

        if (! $invitation) {
            return response()->json([
                'message' => 'Invalid or expired link',
            ], 410);
        }

        return response()->json([
            'message' => 'Invitation fetched successfully',
            'data' => [
                'tenant_name' => $invitation->user?->name,
                'email' => $invitation->email,
                'unit_number' => $invitation->unit?->unit_number,
                'property_name' => $invitation->unit?->apartment?->name,
                'property_address' => $invitation->unit?->apartment?->address,
                'lease_start' => optional($invitation->tenant?->lease_start)->toDateString(),
                'lease_end' => optional($invitation->tenant?->lease_end)->toDateString(),
                'move_in_date' => optional($invitation->tenant?->move_in_date)->toDateString(),
                'expires_at' => optional($invitation->expires_at)->toIso8601String(),
                'invited_by' => $invitation->inviter?->name,
            ],
        ]);
    }

    public function accept(Request $request, string $token)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $invitation = $this->findValidInvitation($token);

        if (! $invitation) {
            return response()->json([
                'message' => 'Invalid or expired link',
            ], 410);
        }

        $user = DB::transaction(function () use ($request, $invitation) {
            $freshInvitation = TenantInvitation::query()
                ->with('user')
                ->lockForUpdate()
                ->find($invitation->id);

            if (! $freshInvitation || $freshInvitation->is_used || $freshInvitation->expires_at?->isPast()) {
                return null;
            }

            $user = $freshInvitation->user;

            $user->update([
                'password' => Hash::make($request->password),
                'status' => 'active',
            ]);

            $freshInvitation->update([
                'is_used' => true,
                'used_at' => Carbon::now(),
            ]);

            return $user->fresh();
        });

        if (! $user) {
            return response()->json([
                'message' => 'Invalid or expired link',
            ], 410);
        }

        $jwtToken = auth('api')->login($user);

        $cookie = cookie(
            'jwt_token',
            $jwtToken,
            1440,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );

        return response()->json([
            'message' => 'Invitation accepted successfully',
            'token' => $jwtToken,
            'user' => $user,
        ])->withCookie($cookie);
    }

    private function findValidInvitation(string $token): ?TenantInvitation
    {
        return TenantInvitation::query()
            ->with(['user', 'tenant', 'unit.apartment', 'inviter'])
            ->where('token_hash', hash('sha256', $token))
            ->where('is_used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();
    }
}
