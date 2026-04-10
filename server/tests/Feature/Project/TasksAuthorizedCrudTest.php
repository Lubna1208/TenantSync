<?php

namespace Tests\Feature\Project;

use Tests\Concerns\BuildsTenantSyncFixtures;
use Tests\TestCase;

class TasksAuthorizedCrudTest extends TestCase
{
    use BuildsTenantSyncFixtures;

    public function test_tenant_can_create_a_complaint_and_manager_can_review_and_update_it(): void
    {
        $owner = $this->createUser('admin', [
            'name' => 'Owner Admin',
            'email' => 'owner.crud@tenantsync.test',
        ]);

        $manager = $this->createUser('manager', [
            'name' => 'Manager CRUD',
            'email' => 'manager.crud@tenantsync.test',
        ]);

        $apartment = $this->createApartment($owner, $manager, [
            'name' => 'CRUD Tower',
        ]);

        $unit = $this->createUnit($apartment, [
            'unit_number' => 'B-202',
        ]);

        $assignTenantResponse = $this->apiJsonAs($manager, 'POST', "/api/manager/units/{$unit->id}/assign-tenant", [
            'name' => 'Tenant Flow User',
            'email' => 'tenant.flow@tenantsync.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'move_in_date' => '2026-04-01',
            'lease_start' => '2026-04-01',
            'lease_end' => '2027-03-31',
        ]);

        $assignTenantResponse->assertCreated();

        $tenantUser = \App\Models\User::query()
            ->where('email', 'tenant.flow@tenantsync.test')
            ->firstOrFail();

        $tenantProfile = \App\Models\Tenant::query()
            ->where('user_id', $tenantUser->id)
            ->firstOrFail();

        $complaintResponse = $this->apiJsonAs($tenantUser, 'POST', '/api/tenant/complaints', [
            'title' => 'Leaking faucet',
            'description' => 'Kitchen sink is leaking since last night.',
            'category' => 'maintenance',
            'priority' => 'high',
        ]);

        $complaintResponse->assertCreated()
            ->assertJsonPath('data.title', 'Leaking faucet')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.tenant_id', $tenantProfile->id);

        $complaintId = $complaintResponse->json('data.id');

        $this->apiJsonAs($manager, 'GET', '/api/manager/complaints')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $complaintId,
                'title' => 'Leaking faucet',
                'status' => 'open',
            ]);

        $this->apiJsonAs($manager, 'PATCH', "/api/manager/complaints/{$complaintId}", [
            'status' => 'resolved',
        ])->assertOk()
            ->assertJsonPath('data.id', $complaintId)
            ->assertJsonPath('data.status', 'resolved');

        $replyResponse = $this->apiJsonAs($manager, 'POST', "/api/manager/complaints/{$complaintId}/reply", [
            'manager_reply' => 'We have scheduled the repair and will keep you updated. The Management Team',
        ]);

        $replyResponse->assertOk()
            ->assertJsonPath('data.id', $complaintId)
            ->assertJsonPath('data.manager_reply', 'We have scheduled the repair and will keep you updated. The Management Team');
    }
}
