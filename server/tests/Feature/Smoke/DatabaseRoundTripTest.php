<?php

namespace Tests\Feature\Smoke;

use Tests\Concerns\BuildsTenantSyncFixtures;
use Tests\TestCase;

class DatabaseRoundTripTest extends TestCase
{
    use BuildsTenantSyncFixtures;

    public function test_owner_can_create_and_read_back_property_data(): void
    {
        $owner = $this->createUser('admin', [
            'name' => 'Owner Admin',
            'email' => 'owner.roundtrip@tenantsync.test',
        ]);

        $managerResponse = $this->apiJsonAs($owner, 'POST', '/api/owner/managers', [
            'name' => 'Round Trip Manager',
            'email' => 'manager.roundtrip@tenantsync.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'date_of_birth' => '1994-05-10',
        ]);

        $managerResponse->assertCreated()
            ->assertJsonPath('data.role', 'manager')
            ->assertJsonPath('data.created_by', $owner->id);

        $managerId = $managerResponse->json('data.id');

        $this->assertDatabaseHas('users', [
            'id' => $managerId,
            'email' => 'manager.roundtrip@tenantsync.test',
            'role' => 'manager',
        ]);

        $propertyResponse = $this->apiJsonAs($owner, 'POST', '/api/owner/properties', [
            'name' => 'Lakeside Residency',
            'address' => '44 Banani Avenue',
            'total_units' => 12,
        ]);

        $propertyResponse->assertCreated()
            ->assertJsonPath('data.name', 'Lakeside Residency');

        $this->apiJsonAs($owner, 'GET', '/api/owner/properties')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Lakeside Residency');
    }
}
