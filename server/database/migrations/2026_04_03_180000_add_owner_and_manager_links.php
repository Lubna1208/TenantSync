<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('created_by')
                ->nullable()
                ->after('status')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('apartments', function (Blueprint $table) {
            $table->foreignId('manager_id')
                ->nullable()
                ->after('owner_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('manager_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
