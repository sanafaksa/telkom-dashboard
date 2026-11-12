<?php

/*
 * Koreksi & Jurbal PSAK.
 *
 * Setiap segmen punya file Excel sumber dengan format berbeda. Jenis file
 * dikenali otomatis dari header kolom (bukan nama file). Nama header di bawah
 * diambil persis dari file sumber di data/jurbal (hasil inspeksi), bukan dikarang:
 *
 *   DGS  pmsdgs ytd 202609, closing 4.xlsx           sheet "Flagging Tipe Koreksi" (header baris 3)
 *   DPS  20261028 PMS DPS Ytd September 2026 ...xlsx  sheet H1, H2 (header baris 1)
 *   RBS  SME Ytd 05 Nov Koreksi - Witel Solo ...xlsx  sheet detail_bges_2026_Solo_Jateng_Ti (header baris 1)
 *   DSS  PMS WITEL HO_SHIP 202609.xlsx                cache pivot (file hanya berisi pivot; raw ada di pivotCacheRecords)
 *
 * Aturan hitung (sesuai catatan "Logic" di masing-masing file):
 *   Reverse    = jurbal/reverse pada periode terbaru
 *   Correction = koreksi pada periode terbaru
 *   Net        = Reverse + Correction
 *   Tipe PSAK  = Correction dipecah per jenis koreksi
 */
return [
    // Witel yang dihitung (nilai kolom witel di file sumber, dibandingkan tanpa beda huruf besar/kecil)
    'witel' => ['SOLO JATENG TIMUR', 'JATENG TIMUR', 'SOLO JT'],

    // Label witel yang disimpan
    'witel_label' => 'SOLO JATENG TIMUR',

    // Header dicari di N baris pertama setiap sheet
    'header_scan_rows' => 10,

    // Jumlah baris per INSERT
    'chunk_rows' => 1000,

    // Upload berstatus processing lebih lama dari ini (tanpa progres) dianggap mati (menit)
    'stale_minutes' => 60,

    // Batas ukuran file (KB)
    'max_kb' => 204800,

    // Header wajib per jenis file. Key = nama internal, value = teks header di Excel.
    'formats' => [
        'DGS' => [
            'label'   => 'DGS (pmsdgs - Flagging Tipe Koreksi)',
            'headers' => [
                'year'       => 'YEAR',
                'month'      => 'MONTH',
                'witel'      => 'WITEL_BILL',
                'source'     => 'SOURCE_DATA',
                'desc'       => 'DESC2',
                'amount'     => 'REVENUE',
            ],
            'optional' => [
                'tipe'       => 'F_TIPE KOREKSI PSAK',
            ],
        ],
        'DPS' => [
            'label'   => 'DPS (PMS DPS - REV_BILL)',
            'headers' => [
                'periode'    => 'PERIODE',
                'witel'      => 'WITEL',
                'source'     => 'SOURCE_DATA',
                'desc'       => 'KETERANGAN',
                'amount'     => 'REV_BILL',
            ],
            'optional' => [
                'desc_alt'   => 'DESC2',
            ],
        ],
        'DSS' => [
            'label'   => 'DSS (PMS WITEL HO_SHIP - REV_SUBTYPE)',
            'headers' => [
                'year'       => 'YEAR',
                'month'      => 'MONTH',
                'witel'      => 'WITEL_BILL',
                'source'     => 'SOURCE_DATA',
                'desc'       => 'DESC2',
                'amount'     => 'REVENUE',
                'subtype'    => 'REV_SUBTYPE',
            ],
        ],
        'RBS' => [
            'label'   => 'RBS (SME detail_bges - LOCAL_AMOUNT)',
            'headers' => [
                'periode'    => 'PERIODE',
                'witel'      => 'WITEL_BILL',
                'source'     => 'SOURCE_DATA',
                'desc'       => 'DESC2',
                'amount'     => 'LOCAL_AMOUNT',
            ],
        ],
    ],

    // Jenis koreksi dari teks DESC2 / KETERANGAN (dicek berurutan, pertama yang cocok dipakai)
    'tipe_patterns' => [
        'agent'      => '/\bagent\b(?!\s*fee)/i',
        'amortisasi' => '/amortisasi/i',
        'edk'        => '/\bedk\b|end\s*date/i',
        'populasi'   => '/populasi/i',
        'splitbill'  => '/split\s*bill|kriteria\s*kb/i',
        'timing'     => '/timing|revenue\s*recognition/i',
        'lowCr'      => '/low\s*cr/i',
    ],

    // DSS: hanya baris dengan REV_SUBTYPE ini yang merupakan koreksi/jurbal PSAK
    'dss_subtype' => 'ADJUSTMENT - PSAK',

    // Nilai kolom F_TIPE KOREKSI PSAK (file DGS) → tipe PSAK
    'tipe_flag' => [
        'AGENT' => 'agent', 'AMORTISASI' => 'amortisasi', 'EDK' => 'edk', 'EDK K2' => 'edk',
        'POPULASI' => 'populasi', 'SPLITBILL' => 'splitbill', 'KRITERIA KB' => 'splitbill',
        'TIMING' => 'timing', 'LOW CR' => 'lowCr',
    ],
];
