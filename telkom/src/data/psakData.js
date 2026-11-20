// =========================================================================
// Koreksi & Jurbal PSAK, Witel Solo JT
// Upload 4 file mentah (DGS, DPS, DSS, RBS) dikirim ke /api/koreksi-psak/upload.
// Server yang menghitung tabel (telkom-api/scripts/psak_extract.py) dan menyimpannya sebagai
// data aktif. Browser tidak membaca isi Excel, jadi file 100MB+ tidak membebani browser.
// =========================================================================

import { apiGet, apiPost, apiPostRaw } from '../lib/api';

// Harus sama dengan CHUNK_SIZE di telkom-api/app/Http/Controllers/Api/PsakKoreksiController.php
const CHUNK_SIZE = 1000000;

// Urutan kolom PSAK Type sesuai laporan
export const PSAK_TYPES = [
  { key: 'agent', label: 'AGENT' },
  { key: 'amortisasi', label: 'AMORTISASI' },
  { key: 'edk', label: 'EDK' },
  { key: 'populasi', label: 'POPULASI' },
  { key: 'splitbill', label: 'SPLITBILL' },
  { key: 'timing', label: 'TIMING' },
  { key: 'lowCr', label: 'LOW CR' }
];

/** Data aktif dari database. Mengembalikan null jika belum pernah diupload. */
export async function fetchPsakData() {
  const res = await apiGet('/koreksi-psak');
  return res?.data ?? null;
}

function newUploadId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Fallback untuk konteks tidak aman (http non-localhost) yang tidak punya randomUUID
  const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/**
 * Kirim 4 file mentah ke server per potongan (chunk ~1MB), lalu minta server menghitung dan menyimpannya.
 * onProgress(0..1) dipanggil setiap potongan terkirim. Mengembalikan data aktif: { period, rows, source }.
 */
export async function uploadPsakFiles(files, onProgress) {
  if (files.length !== 4) throw new Error('Pilih tepat 4 file: DGS, DPS, DSS, RBS.');

  const uploadId = newUploadId();
  const total = files.reduce((sum, f) => sum + f.size, 0) || 1;
  let sent = 0;

  for (let slot = 0; slot < files.length; slot++) {
    const file = files[slot];
    const chunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    for (let index = 0; index < chunks; index++) {
      const blob = file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      await apiPostRaw('/koreksi-psak/upload/chunk', blob, {
        'X-Upload-Id': uploadId,
        'X-File-Slot': String(slot),
        'X-Chunk-Index': String(index),
      });
      sent += blob.size;
      onProgress?.(sent / total);
    }
  }

  const res = await apiPost('/koreksi-psak/upload/finish', { upload_id: uploadId });
  return res?.data;
}

export function computePsakTotal(rows = [], label = 'WITEL SOLO JT') {
  const sum = (pick) => rows.reduce((acc, r) => acc + (pick(r) || 0), 0);
  return {
    segmen: label,
    reverse: sum((r) => r.reverse),
    correction: sum((r) => r.correction),
    net: sum((r) => r.net),
    psak: Object.fromEntries(PSAK_TYPES.map(({ key }) => [key, sum((r) => r.psak[key])]))
  };
}
