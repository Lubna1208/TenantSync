<?php

namespace Tests\Concerns;

use App\Models\Apartment;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;

trait BuildsTenantSyncFixtures
{
    protected function createUser(string $role, array $overrides = []): User
    {
        $password = $overrides['plain_password'] ?? 'secret123';

        unset($overrides['plain_password']);

        return User::query()->create(array_merge([
            'name' => ucfirst($role) . ' User',
            'email' => strtolower($role) . '.' . uniqid() . '@tenantsync.test',
            'password' => Hash::make($password),
            'role' => $role,
            'status' => 'active',
        ], $overrides));
    }

    protected function createApartment(User $owner, ?User $manager = null, array $overrides = []): Apartment
    {
        return Apartment::query()->create(array_merge([
            'owner_id' => $owner->id,
            'manager_id' => $manager?->id,
            'name' => 'North Tower',
            'address' => '12 Lake View Road',
            'total_units' => 20,
        ], $overrides));
    }

    protected function createUnit(Apartment $apartment, array $overrides = []): Unit
    {
        return Unit::query()->create(array_merge([
            'apartment_id' => $apartment->id,
            'unit_number' => 'A-101',
            'floor' => '1',
            'rent_amount' => 18000,
            'status' => 'vacant',
        ], $overrides));
    }

    protected function createTenantProfile(User $tenantUser, ?Unit $unit = null, array $overrides = []): Tenant
    {
        return Tenant::query()->create(array_merge([
            'user_id' => $tenantUser->id,
            'unit_id' => $unit?->id,
            'move_in_date' => '2026-04-01',
            'lease_start' => '2026-04-01',
            'lease_end' => '2027-03-31',
        ], $overrides));
    }

    protected function provisionManagedUnitWithTenant(): array
    {
        $owner = $this->createUser('admin', [
            'name' => 'Owner Admin',
            'email' => 'owner.' . uniqid() . '@tenantsync.test',
        ]);

        $manager = $this->createUser('manager', [
            'name' => 'Tenant Manager',
            'email' => 'manager.' . uniqid() . '@tenantsync.test',
        ]);

        $apartment = $this->createApartment($owner, $manager);
        $unit = $this->createUnit($apartment, ['status' => 'occupied']);

        $tenantUser = $this->createUser('tenant', [
            'name' => 'Tenant User',
            'email' => 'tenant.' . uniqid() . '@tenantsync.test',
        ]);

        $tenant = $this->createTenantProfile($tenantUser, $unit);

        return compact('owner', 'manager', 'apartment', 'unit', 'tenantUser', 'tenant');
    }

    protected function loginAndGetToken(User $user, string $password = 'secret123'): string
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => $password,
        ]);

        $response->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role', $user->role);

        $token = $response->json('token');

        $this->assertIsString($token);
        $this->assertNotSame('', $token);

        return $token;
    }

    protected function apiJsonAs(User $user, string $method, string $uri, array $payload = []): TestResponse
    {
        $token = $this->loginAndGetToken($user);

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->json($method, $uri, $payload);
    }
}
