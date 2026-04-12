<?php

namespace Tests\Feature\Project;

use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    public function test_public_registration_creates_an_active_tenant_account(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'New Tenant',
            'email' => 'new.tenant@tenantsync.test',
            'date_of_birth' => '2000-01-15',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'tenant')
            ->assertJsonPath('user.status', 'active')
            ->assertJsonPath('user.email', 'new.tenant@tenantsync.test');
    }
}
