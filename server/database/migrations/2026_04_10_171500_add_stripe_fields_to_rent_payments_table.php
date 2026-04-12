<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rent_payments', function (Blueprint $table) {
            if (! Schema::hasColumn('rent_payments', 'stripe_session_id')) {
                $table->string('stripe_session_id')->nullable()->unique()->after('payment_month');
            }

            if (! Schema::hasColumn('rent_payments', 'stripe_payment_intent_id')) {
                $table->string('stripe_payment_intent_id')->nullable()->after('stripe_session_id');
            }

            if (! Schema::hasColumn('rent_payments', 'currency')) {
                $table->string('currency', 10)->default('bdt')->after('amount');
            }

            if (! Schema::hasColumn('rent_payments', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('currency');
            }

            if (! Schema::hasColumn('rent_payments', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('payment_date');
            }

            if (! Schema::hasColumn('rent_payments', 'failure_reason')) {
                $table->text('failure_reason')->nullable()->after('paid_at');
            }

            if (! Schema::hasColumn('rent_payments', 'receipt_url')) {
                $table->text('receipt_url')->nullable()->after('failure_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('rent_payments', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('rent_payments', 'stripe_session_id')) {
                try {
                    $table->dropUnique(['stripe_session_id']);
                } catch (\Throwable $exception) {
                    // Ignore missing index errors so rollback remains safe.
                }

                $columnsToDrop[] = 'stripe_session_id';
            }

            foreach ([
                'stripe_payment_intent_id',
                'currency',
                'payment_method',
                'paid_at',
                'failure_reason',
                'receipt_url',
            ] as $column) {
                if (Schema::hasColumn('rent_payments', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
