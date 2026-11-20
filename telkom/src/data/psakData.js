// =========================================================================
// Koreksi & Jurbal PSAK, Witel Solo JT
// Sumber: rekap Excel "Reverse / Correction / PSAK Type" (Rupiah). File dibaca di browser,
// lalu hasilnya disimpan ke database lewat /api/koreksi-psak. Data aktif = upload terakhir.
// =========================================================================

import { apiGet, apiPost } from '../lib/api';

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

/** Simpan hasil parse upload ke database. Mengembalikan data aktif yang baru. */
export async function savePsakData({ period, rows, source }) {
  const res = await apiPost('/koreksi-psak', {
    filename: source?.filename ?? null,
    period,
    rows
  });
  return res?.data;
}

// "1,307,883,209" | "(925,265,279)" | "1.307.883.209" | "-" | 123 -> number
function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/ /g, ' ').trim();
  if (!s || /^[-–—]$/.test(s)) return 0;
  const neg = /^\(.*\)$/.test(s) || /^[-–]/.test(s);
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot > -1 && lastComma > -1) {
    // Pemisah yang muncul terakhir = desimal
    const dec = lastDot > lastComma ? '.' : ',';
    s = s.replace(dec === '.' ? /,/g : /\./g, '').replace(dec, '.');
  } else {
    const sep = lastDot > -1 ? '.' : lastComma > -1 ? ',' : null;
    if (sep) {
      const parts = s.split(sep);
      const isThousands = parts.length > 2 || parts[parts.length - 1].length === 3;
      s = isThousands ? parts.join('') : parts.join('.');
    }
  }
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

// Baca workbook Excel/CSV rekap PSAK -> { period, rows }
export async function parsePsakFile(file) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });

  for (const sheetName of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' });
    const headerIdx = aoa.findIndex((row) => row.some((c) => norm(c) === 'SEGMEN'));
    if (headerIdx === -1) continue;

    // Header bisa 2 baris (PSAK Type di-merge di atas sub-kolom): gabungkan keduanya
    const width = Math.max(...aoa.slice(headerIdx, headerIdx + 2).map((r) => r.length));
    const labels = Array.from({ length: width }, (_, c) =>
      [aoa[headerIdx]?.[c], aoa[headerIdx + 1]?.[c]].map(norm).filter(Boolean)
    );
    const findCol = (test) => labels.findIndex((ls) => ls.some(test));

    const col = {
      segmen: findCol((l) => l === 'SEGMEN'),
      reverse: findCol((l) => l.startsWith('REVERSE')),
      correction: findCol((l) => l.startsWith('CORRECTION')),
      net: findCol((l) => l === 'NET'),
      psak: Object.fromEntries(
        PSAK_TYPES.map(({ key, label }) => [key, findCol((l) => l === label || l.replace(/\s/g, '') === label.replace(/\s/g, ''))])
      )
    };
    if (col.segmen === -1 || col.reverse === -1 || col.correction === -1) continue;

    const periodOf = (c) => {
      const m = labels[c].join(' ').match(/(Q\d[-\s]?\d{2,4})/i);
      return m ? m[1].toUpperCase().replace(/\s/, '-') : '';
    };

    const rows = [];
    for (let r = headerIdx + 1; r < aoa.length; r++) {
      const row = aoa[r];
      const segmen = String(row[col.segmen] ?? '').trim();
      if (!segmen) {
        if (rows.length) break; // akhir tabel
        continue; // masih baris header ke-2
      }
      if (/^(SEGMEN|PSAK)/i.test(segmen)) continue;
      if (/TOTAL|WITEL/i.test(segmen)) continue; // baris total dihitung ulang otomatis
      const reverse = toNumber(row[col.reverse]);
      const correction = toNumber(row[col.correction]);
      rows.push({
        segmen,
        reverse,
        correction,
        net: col.net > -1 ? toNumber(row[col.net]) : reverse + correction,
        psak: Object.fromEntries(
          PSAK_TYPES.map(({ key }) => [key, col.psak[key] > -1 ? toNumber(row[col.psak[key]]) : 0])
        )
      });
    }

    if (rows.length) {
      return {
        period: {
          reverse: periodOf(col.reverse),
          correction: periodOf(col.correction)
        },
        rows,
        sheetName,
        missing: [
          col.net === -1 && 'Net (dihitung otomatis)',
          ...PSAK_TYPES.filter(({ key }) => col.psak[key] === -1).map(({ label }) => label)
        ].filter(Boolean)
      };
    }
  }

  throw new Error('Tabel tidak ditemukan. Pastikan ada kolom "Segmen", "Reverse …" dan "Correction …".');
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
