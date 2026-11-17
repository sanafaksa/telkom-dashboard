<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Notulensi (rapat) dipisah dari action plan.
 *
 * - mom_meetings: satu baris per notulensi (NO, tgl, agenda, topik, unit, peserta, pembahasan, notulen).
 * - mom_action_plans: milik satu notulensi (mom_meeting_id); hanya menyimpan data action.
 * - support_clear: kotak centang "support sudah clear" per action plan.
 *
 * Data lama dikelompokkan per (NO, tgl, agenda, topik) agar dua rapat berbeda dengan NO yang sama tidak tergabung.
 */
return new class extends Migration
{
    private const MEETING_COLUMNS = [
        'no', 'tgl', 'agenda', 'main_topic', 'unit_telda', 'peserta', 'pembahasan', 'pembahasan_notulen',
    ];

    public function up(): void
    {
        Schema::create('mom_meetings', function (Blueprint $t) {
            $t->id();
            $t->string('no', 50)->default('');
            $t->string('tgl', 100)->default('');
            $t->string('agenda', 120)->default('FORUM WITEL');
            $t->string('main_topic', 255)->default('');
            $t->string('unit_telda', 500)->default('PRQ');
            $t->text('peserta')->nullable();
            $t->longText('pembahasan')->nullable();
            $t->longText('pembahasan_notulen')->nullable();
            $t->timestamps();

            $t->index('no');
        });

        Schema::table('mom_action_plans', function (Blueprint $t) {
            $t->foreignId('mom_meeting_id')->nullable()->after('id')
                ->constrained('mom_meetings')->cascadeOnDelete();
            $t->boolean('support_clear')->default(false)->after('status');
        });

        // Pindahkan data notulensi ke mom_meetings dan kaitkan setiap action plan.
        $meetingIds = [];
        DB::table('mom_action_plans')->orderBy('id')->chunkById(200, function ($rows) use (&$meetingIds) {
            foreach ($rows as $row) {
                $key = implode('|', [$row->no, $row->tgl, $row->agenda, $row->main_topic]);

                if (! isset($meetingIds[$key])) {
                    $meetingIds[$key] = DB::table('mom_meetings')->insertGetId([
                        'no'                 => (string) $row->no,
                        'tgl'                => (string) $row->tgl,
                        'agenda'             => (string) $row->agenda,
                        'main_topic'         => (string) $row->main_topic,
                        'unit_telda'         => (string) $row->unit_telda,
                        'peserta'            => $row->peserta,
                        'pembahasan'         => $row->pembahasan,
                        'pembahasan_notulen' => $row->pembahasan_notulen,
                        'created_at'         => now(),
                        'updated_at'         => now(),
                    ]);
                }

                DB::table('mom_action_plans')->where('id', $row->id)->update(['mom_meeting_id' => $meetingIds[$key]]);
            }
        });

        Schema::table('mom_action_plans', function (Blueprint $t) {
            $t->dropIndex('idx_mom_agenda');
            $t->dropColumn(self::MEETING_COLUMNS);
        });
    }

    public function down(): void
    {
        Schema::table('mom_action_plans', function (Blueprint $t) {
            $t->string('no', 50)->default('')->after('id');
            $t->string('tgl', 100)->default('')->after('no');
            $t->string('agenda', 120)->default('FORUM WITEL')->after('tgl');
            $t->string('main_topic', 255)->default('')->after('agenda');
            $t->string('unit_telda', 500)->default('PRQ')->after('main_topic');
            $t->text('peserta')->nullable()->after('unit_telda');
            $t->longText('pembahasan')->nullable()->after('peserta');
            $t->longText('pembahasan_notulen')->nullable()->after('pembahasan');
        });

        DB::table('mom_action_plans')->orderBy('id')->chunkById(200, function ($rows) {
            foreach ($rows as $row) {
                $meeting = DB::table('mom_meetings')->where('id', $row->mom_meeting_id)->first();
                if ($meeting) {
                    DB::table('mom_action_plans')->where('id', $row->id)->update([
                        'no'                 => $meeting->no,
                        'tgl'                => $meeting->tgl,
                        'agenda'             => $meeting->agenda,
                        'main_topic'         => $meeting->main_topic,
                        'unit_telda'         => $meeting->unit_telda,
                        'peserta'            => $meeting->peserta,
                        'pembahasan'         => $meeting->pembahasan,
                        'pembahasan_notulen' => $meeting->pembahasan_notulen,
                    ]);
                }
            }
        });

        Schema::table('mom_action_plans', function (Blueprint $t) {
            $t->index('agenda', 'idx_mom_agenda');
            $t->dropConstrainedForeignId('mom_meeting_id');
            $t->dropColumn('support_clear');
        });

        Schema::dropIfExists('mom_meetings');
    }
};
