<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Master UIC bertingkat (TELKOM > TR3 > unit > sub-unit, TIF, TELKOMSEL, dll.). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uic_units', function (Blueprint $t) {
            $t->unsignedInteger('id')->primary();
            $t->unsignedInteger('parent_id')->nullable()->index();
            $t->unsignedTinyInteger('level');
            $t->string('name', 120);
            $t->boolean('is_custom_input')->default(false);
            $t->foreign('parent_id')->references('id')->on('uic_units')->cascadeOnDelete();
        });

        $path = database_path('seeders/uic_units.json');
        $rows = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('uic_units')->insert($chunk);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('uic_units');
    }
};
