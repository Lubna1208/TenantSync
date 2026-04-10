<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rent_payments', function (Blueprint $table) {
            $table->string('stripe_session_id')->nullable()->unique()->after('payment_month');
            $table->string('stripe_payment_intent_id')->nullable()->after('stripe_session_id');
            $table->string('currency', 10)->default('bdt')->after('amount');
            $table->string('payment_method')->nullable()->after('currency');
            $table->timestamp('paid_at')->nullable()->after('payment_date');
            $table->text('failure_reason')->nullable()->after('paid_at');
            $table->text('receipt_url')->nullable()->after('failure_reason');
        });
    }

    public function down(): void
    {
        Schema::table('rent_payments', function (Blueprint $table) {
            $table->dropUnique(['stripe_session_id']);
            $table->dropColumn([
                'stripe_session_id',
                'stripe_payment_intent_id',
                'currency',
                'payment_method',
                'paid_at',
                'failure_reason',
                'receipt_url',
            ]);
        });
    }
};
