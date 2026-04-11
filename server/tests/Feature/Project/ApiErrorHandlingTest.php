<?php

namespace Tests\Feature\Project;

use Tests\Concerns\BuildsTenantSyncFixtures;
use Tests\TestCase;

class ApiErrorHandlingTest extends TestCase
{
    use BuildsTenantSyncFixtures;

    public function test_manager_cannot_create_unit_with_out_of_range_rent_amount(): void
    {
        $owner = $this->createUser('admin');
        $manager = $this->createUser('manager');
        $apartment = $this->createApartment($owner, $manager);

        $this->apiJsonAs($manager, 'POST', '/api/manager/units', [
            'unit_number' => 'A-7',
            'floor' => '3',
            'rent_amount' => '4555555555555',
            'status' => 'vacant',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Validation failed')
            ->assertJsonPath('errors.rent_amount.0', 'Rent amount must be between 0 and 99,999,999.99.');

        $this->assertDatabaseMissing('units', [
            'apartment_id' => $apartment->id,
            'unit_number' => 'A-7',
        ]);
    }

    public function test_missing_api_route_returns_sanitized_json_message(): void
    {
        $this->getJson('/api/this-route-does-not-exist')
            ->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Endpoint not found.');
    }
}
