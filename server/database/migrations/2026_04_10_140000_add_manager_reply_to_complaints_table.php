<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'manager_reply')) {
                $table->text('manager_reply')->nullable()->after('status');
            }

            if (! Schema::hasColumn('complaints', 'manager_reply_sent_at')) {
                $table->timestamp('manager_reply_sent_at')->nullable()->after('manager_reply');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('complaints', 'manager_reply_sent_at')) {
                $columnsToDrop[] = 'manager_reply_sent_at';
            }

            if (Schema::hasColumn('complaints', 'manager_reply')) {
                $columnsToDrop[] = 'manager_reply';
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
