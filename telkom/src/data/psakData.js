// =========================================================================
// Koreksi & Jurbal PSAK — Witel Solo JT
// Sumber: rekap Excel "Reverse Q2-26 / Correction Q3-26 / PSAK Type" (Rupiah).
// Nilai per segmen disimpan persis seperti sumber (sudah dibulatkan di Excel,
// jadi bisa selisih Rp 1 terhadap hasil penjumlahan ulang). Baris total
// WITEL SOLO JT dihitung dari jumlah per kolom.
// Belum ada backend: ganti data di file ini sampai endpoint tersedia.
// =========================================================================

export const PSAK_PERIOD = {
  reverse: 'Q2-26',
  correction: 'Q3-26'
};

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

export const PSAK_ROWS = [
  {
    segmen: 'DGS',
    reverse: 1307883209,
    correction: -925265279,
    net: 382617930,
    psak: {
      agent: 0,
      amortisasi: -26440545,
      edk: -16083580,
      populasi: -75316464,
      splitbill: -294123661,
      timing: -514114244,
      lowCr: 813215
    }
  },
  {
    segmen: 'DPS',
    reverse: 3136331978,
    correction: -3055496765,
    net: 80835213,
    psak: {
      agent: -240104838,
      amortisasi: 15500000,
      edk: -153254953,
      populasi: -22582242,
      splitbill: -2818431231,
      timing: 163376499,
      lowCr: 0
    }
  },
  {
    segmen: 'DSS',
    reverse: 555895411,
    correction: -392843373,
    net: 163052039,
    psak: {
      agent: 3750000,
      amortisasi: -246115205,
      edk: 0,
      populasi: -700000,
      splitbill: -406653235,
      timing: 256875068,
      lowCr: 0
    }
  },
  {
    segmen: 'RBS',
    reverse: 1044546688,
    correction: -1170182599,
    net: -125635911,
    psak: {
      agent: -15820646,
      amortisasi: 8554377,
      edk: -53928985,
      populasi: -97146300,
      splitbill: -1046073998,
      timing: 34232953,
      lowCr: 0
    }
  }
];

// =========================================================================
// Data aktif: hasil upload Excel disimpan di browser (localStorage), belum ke backend
// =========================================================================
const STORAGE_KEY = 'psak_koreksi_jurbal_v1';

export const DEFAULT_PSAK_DATA = {
  period: PSAK_PERIOD,
  rows: PSAK_ROWS,
  source: null // null = data contoh bawaan
};

export function loadPsakData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved.rows) && saved.rows.length) return saved;
  } catch {
    // abaikan data rusak, pakai data contoh
  }
  return DEFAULT_PSAK_DATA;
}

export function savePsakData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage penuh / diblokir: data tetap tampil sampai halaman ditutup
  }
}

export function resetPsakData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
  return DEFAULT_PSAK_DATA;
}

// "1,307,883,209" | "(925,265,279)" | "1.307.883.209" | "-" | 123 -> number
function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/ /g, ' ').trim();
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

    const periodOf = (c, fallback) => {
      const m = labels[c].join(' ').match(/(Q\d[-\s]?\d{2,4})/i);
      return m ? m[1].toUpperCase().replace(/\s/, '-') : fallback;
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
          reverse: periodOf(col.reverse, PSAK_PERIOD.reverse),
          correction: periodOf(col.correction, PSAK_PERIOD.correction)
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

export function computePsakTotal(rows = PSAK_ROWS, label = 'WITEL SOLO JT') {
  const sum = (pick) => rows.reduce((acc, r) => acc + (pick(r) || 0), 0);
  return {
    segmen: label,
    reverse: sum((r) => r.reverse),
    correction: sum((r) => r.correction),
    net: sum((r) => r.net),
    psak: Object.fromEntries(PSAK_TYPES.map(({ key }) => [key, sum((r) => r.psak[key])]))
  };
}
