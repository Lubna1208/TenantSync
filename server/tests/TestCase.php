<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected static bool $testingDatabasePrepared = false;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useSqliteTestingDatabase();
        $this->ensureTestingSchema();
        $this->resetTestingData();
    }

    protected function useSqliteTestingDatabase(): void
    {
        $databasePath = database_path('testing-' . getmypid() . '.sqlite');

        if (! self::$testingDatabasePrepared) {
            if (! file_exists($databasePath)) {
                touch($databasePath);
            }

            self::$testingDatabasePrepared = true;
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', $databasePath);
        config()->set('database.connections.sqlite.foreign_key_constraints', true);

        DB::purge('sqlite');
        DB::reconnect('sqlite');
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
                $table->timestamps();
                $table->unique(['tenant_id', 'payment_month']);
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
