<?php

namespace Tests\Feature\Smoke;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_ping_endpoint_reports_the_api_is_up(): void
    {
        $this->getJson('/api/ping')
            ->assertOk()
            ->assertExactJson([
                'ok' => true,
            ]);
    }
}
