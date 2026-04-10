<?php

namespace Tests\Feature\Smoke;

use Tests\TestCase;

class WebRootResponseTest extends TestCase
{
    public function test_web_root_serves_the_frontend_shell(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<div id="root"></div>', false);
    }
}
