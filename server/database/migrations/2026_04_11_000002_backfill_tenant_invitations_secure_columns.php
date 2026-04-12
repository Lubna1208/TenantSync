<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tenant_invitations')) {
            return;
        }

        Schema::table('tenant_invitations', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_invitations', 'is_used')) {
                $table->boolean('is_used')->default(false)->after('expires_at');
            }

            if (! Schema::hasColumn('tenant_invitations', 'used_at')) {
                $table->timestamp('used_at')->nullable()->after('is_used');
            }

            if (! Schema::hasColumn('tenant_invitations', 'last_sent_at')) {
                $table->timestamp('last_sent_at')->nullable()->after('used_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tenant_invitations')) {
            return;
        }

        Schema::table('tenant_invitations', function (Blueprint $table) {
            if (Schema::hasColumn('tenant_invitations', 'last_sent_at')) {
                $table->dropColumn('last_sent_at');
            }

            if (Schema::hasColumn('tenant_invitations', 'used_at')) {
                $table->dropColumn('used_at');
            }

            if (Schema::hasColumn('tenant_invitations', 'is_used')) {
                $table->dropColumn('is_used');
            }
        });
    }
};
