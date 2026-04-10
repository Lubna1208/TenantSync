<?php

namespace Tests\Feature\Project;

use Tests\Concerns\BuildsTenantSyncFixtures;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use BuildsTenantSyncFixtures;

    public function test_admin_manager_and_tenant_can_log_in_and_load_their_identity(): void
    {
        $users = [
            $this->createUser('admin', ['email' => 'owner.login@tenantsync.test']),
            $this->createUser('manager', ['email' => 'manager.login@tenantsync.test']),
            $this->createUser('tenant', ['email' => 'tenant.login@tenantsync.test']),
        ];

        foreach ($users as $user) {
            $token = $this->loginAndGetToken($user);

            $this->withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'Accept' => 'application/json',
            ])->getJson('/api/auth/me')
                ->assertOk()
                ->assertJsonPath('id', $user->id)
                ->assertJsonPath('email', $user->email)
                ->assertJsonPath('role', $user->role);
        }
    }
}
