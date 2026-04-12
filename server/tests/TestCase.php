<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useMySqlTestingDatabase();
        $this->ensureTestingSchema();
        $this->resetTestingData();
    }

    protected function useMySqlTestingDatabase(): void
    {
        config()->set('database.default', 'mysql');
        config()->set('database.connections.mysql.host', env('DB_HOST', '127.0.0.1'));
        config()->set('database.connections.mysql.port', env('DB_PORT', '3306'));
        config()->set('database.connections.mysql.database', env('DB_TEST_DATABASE', env('DB_DATABASE', 'tenantsync')));
        config()->set('database.connections.mysql.username', env('DB_USERNAME', 'root'));
        config()->set('database.connections.mysql.password', env('DB_PASSWORD', ''));

        DB::purge('mysql');
        DB::reconnect('mysql');
    }

    protected function ensureTestingSchema(): void
    {
        Schema::enableForeignKeyConstraints();

        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->date('date_of_birth')->nullable();
                $table->string('password');
                $table->string('role')->default('tenant');
                $table->string('status')->default('active');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('apartments')) {
            Schema::create('apartments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name');
                $table->string('address');
                $table->unsignedInteger('total_units');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('units')) {
            Schema::create('units', function (Blueprint $table) {
                $table->id();
                $table->foreignId('apartment_id')->constrained('apartments')->cascadeOnDelete();
                $table->string('unit_number');
                $table->string('floor')->nullable();
                $table->decimal('rent_amount', 10, 2);
                $table->string('status')->default('vacant');
                $table->timestamps();
                $table->unique(['apartment_id', 'unit_number']);
            });
        }

        if (! Schema::hasTable('tenants')) {
            Schema::create('tenants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
                $table->date('move_in_date')->nullable();
                $table->date('lease_start')->nullable();
                $table->date('lease_end')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('announcements')) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->string('title');
                $table->text('message');
                $table->string('target_role')->default('all');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('complaints')) {
            Schema::create('complaints', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
                $table->string('title');
                $table->text('description');
                $table->string('category')->nullable();
                $table->string('priority')->nullable();
                $table->string('status')->default('open');
                $table->text('manager_reply')->nullable();
                $table->timestamp('manager_reply_sent_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('rent_payments')) {
            Schema::create('rent_payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
                $table->decimal('amount', 10, 2);
                $table->string('payment_month', 7);
                $table->string('status')->default('pending');
                $table->date('payment_date')->nullable();
                $table->string('currency')->nullable();
                $table->string('payment_method')->nullable();
                $table->string('stripe_session_id')->nullable();
                $table->string('stripe_payment_intent_id')->nullable();
                $table->string('receipt_url')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->text('failure_reason')->nullable();
                $table->timestamps();
                $table->unique(['tenant_id', 'payment_month']);
            });
        }

        if (! Schema::hasTable('tenant_invitations')) {
            Schema::create('tenant_invitations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
                $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
                $table->string('email');
                $table->string('token_hash')->unique();
                $table->timestamp('expires_at');
                $table->boolean('is_used')->default(false);
                $table->timestamp('used_at')->nullable();
                $table->timestamp('last_sent_at')->nullable();
                $table->timestamps();
            });
        }
    }

    protected function resetTestingData(): void
    {
        Schema::disableForeignKeyConstraints();

        foreach ([
            'rent_payments',
            'complaints',
            'announcements',
            'tenant_invitations',
            'tenants',
            'units',
            'apartments',
            'users',
        ] as $table) {
            DB::table($table)->delete();
        }

        Schema::enableForeignKeyConstraints();
    }
}
