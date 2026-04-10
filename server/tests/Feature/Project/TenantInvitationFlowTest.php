<?php

namespace Tests\Feature\Project;

use App\Mail\TenantInvitationMail;
use App\Models\TenantInvitation;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\BuildsTenantSyncFixtures;
use Tests\TestCase;

class TenantInvitationFlowTest extends TestCase
{
    use BuildsTenantSyncFixtures;

    public function test_manager_can_send_tenant_invitation_and_tenant_can_accept_it(): void
    {
        Mail::fake();

        $owner = $this->createUser('admin', [
            'email' => 'owner.invite@tenantsync.test',
        ]);
        $manager = $this->createUser('manager', [
            'email' => 'manager.invite@tenantsync.test',
        ]);
        $apartment = $this->createApartment($owner, $manager);
        $unit = $this->createUnit($apartment, [
            'unit_number' => 'A-3',
        ]);

        $response = $this->apiJsonAs($manager, 'POST', "/api/manager/units/{$unit->id}/assign-tenant", [
            'name' => 'Rahim Uddin',
            'email' => 'rahim@tenantsync.test',
            'move_in_date' => '2026-05-01',
            'lease_start' => '2026-05-01',
            'lease_end' => '2027-04-30',
        ])->assertCreated()
            ->assertJsonPath('message', 'Tenant invitation sent successfully');

        $this->assertDatabaseHas('users', [
            'email' => 'rahim@tenantsync.test',
            'role' => 'tenant',
            'status' => 'inactive',
        ]);

        $this->assertDatabaseHas('tenant_invitations', [
            'email' => 'rahim@tenantsync.test',
            'is_used' => false,
        ]);

        $invitationUrl = null;

        Mail::assertSent(TenantInvitationMail::class, function (TenantInvitationMail $mail) use (&$invitationUrl) {
            $invitationUrl = $mail->invitationUrl;

            return $mail->hasTo('rahim@tenantsync.test');
        });

        $this->assertIsString($invitationUrl);
        $this->assertNotSame('', $invitationUrl);

        $token = basename((string) $invitationUrl);

        $this->getJson("/api/tenant-invitations/{$token}")
            ->assertOk()
            ->assertJsonPath('data.email', 'rahim@tenantsync.test')
            ->assertJsonPath('data.unit_number', 'A-3');

        $acceptResponse = $this->postJson("/api/tenant-invitations/{$token}/accept", [
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertOk()
            ->assertJsonPath('message', 'Invitation accepted successfully')
            ->assertJsonPath('user.email', 'rahim@tenantsync.test')
            ->assertJsonPath('user.status', 'active');

        $this->assertIsString($acceptResponse->json('token'));

        $invitation = TenantInvitation::query()->firstOrFail();

        $this->assertTrue($invitation->is_used);
        $this->assertNotNull($invitation->used_at);
    }
}
