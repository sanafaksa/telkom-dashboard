<?php

return [
    // Interpreter Python yang punya paket openpyxl (di VPS Ubuntu biasanya: python3)
    'python' => env('PSAK_PYTHON', 'python3'),

    // Script ekstraksi 4 file mentah rekap PSAK
    'script' => base_path('scripts/psak_extract.py'),

    // Batas waktu proses (detik). File 100MB+ bisa butuh beberapa menit.
    'timeout' => (int) env('PSAK_TIMEOUT', 900),
];
