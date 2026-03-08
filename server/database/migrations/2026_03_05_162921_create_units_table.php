<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();

            $table->foreignId('apartment_id')->constrained('apartments')->cascadeOnDelete();

            $table->string('unit_number');
            $table->string('floor')->nullable();
            $table->decimal('rent_amount', 10, 2);

            $table->enum('status', ['vacant', 'occupied'])->default('vacant');

            $table->timestamps();

            $table->unique(['apartment_id', 'unit_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};