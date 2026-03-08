<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rent_payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();

            $table->decimal('amount', 10, 2);
            $table->string('payment_month', 7); // YYYY-MM

            $table->enum('status', ['paid', 'unpaid', 'pending'])->default('pending');
            $table->date('payment_date')->nullable();

            $table->timestamps();

            $table->unique(['tenant_id', 'payment_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_payments');
    }
};