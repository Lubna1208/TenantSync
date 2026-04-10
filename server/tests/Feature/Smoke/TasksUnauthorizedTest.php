<?php

namespace Tests\Feature\Smoke;

use Tests\Concerns\BuildsTenantSyncFixtures;
use Tests\TestCase;

class TasksUnauthorizedTest extends TestCase
{
    use BuildsTenantSyncFixtures;

    public function test_protected_role_dashboards_reject_unauthenticated_requests(): void
    {
        $this->getJson('/api/owner/properties')->assertUnauthorized();
        $this->getJson('/api/manager/dashboard')->assertUnauthorized();
        $this->getJson('/api/tenant/dashboard')->assertUnauthorized();
    }

    public function test_users_cannot_access_another_roles_protected_routes(): void
    {
        $fixtures = $this->provisionManagedUnitWithTenant();

        $this->apiJsonAs($fixtures['tenantUser'], 'GET', '/api/owner/properties')
            ->assertForbidden()
            ->assertJsonPath('message', 'You are not allowed to perform this action');

        $this->apiJsonAs($fixtures['owner'], 'GET', '/api/manager/dashboard')
            ->assertForbidden()
            ->assertJsonPath('message', 'You are not allowed to perform this action');

        $this->apiJsonAs($fixtures['manager'], 'GET', '/api/tenant/dashboard')
            ->assertForbidden()
            ->assertJsonPath('message', 'You are not allowed to perform this action');
    }
}
