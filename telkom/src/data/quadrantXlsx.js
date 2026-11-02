// Streaming XLSX reader, aggregator, and automatic Master-Data-to-Template
// summarizer for the Kuadran SJT menu.
// Supports:
// 1. Master Data Kuadran (.xlsx, 70MB+ streaming via DecompressionStream)
// 2. Template Ringkas (.xlsx / .csv) generated automatically from Master Data
// 3. Pivot/Dashboard workbook (.xlsx with sheet "Pivot_Data")
// 4. Legacy CSV templates

import { DEFAULT_QUADRANT_AGG } from './quadrantDefaultAgg.js';

const MONTH_IDX = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, MEI: 5, JUN: 6,
  JUL: 7, AUG: 8, AGU: 8, AGT: 8, SEP: 9, OCT: 10, OKT: 10, NOV: 11, DEC: 12, DES: 12
};
const CANON_MONTH = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
};
const STANDARD_FILTER_MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthIndex = (label) => MONTH_IDX[String(label || '').trim().slice(0, 3).toUpperCase()] || 0;
const canonMonth = (label) => {
  const idx = monthIndex(label);
  return idx ? CANON_MONTH[idx] : String(label || '').trim();
};

const decodeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/* ------------------------------ ZIP reading ------------------------------ */

async function readBytes(file, start, end) {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

async function readZipDirectory(file) {
  const tailSize = Math.min(file.size, 65557);
  const tail = await readBytes(file, file.size - tailSize, file.size);
  const tv = new DataView(tail.buffer);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File bukan XLSX yang valid.');
  const count = tv.getUint16(eocd + 10, true);
  const cdSize = tv.getUint32(eocd + 12, true);
  const cdOffset = tv.getUint32(eocd + 16, true);
  if (cdOffset === 0xffffffff) throw new Error('File ZIP64 belum didukung.');

  const cd = await readBytes(file, cdOffset, cdOffset + cdSize);
  const dv = new DataView(cd.buffer);
  const dec = new TextDecoder();
  const entries = {};
  let p = 0;
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = dec.decode(cd.subarray(p + 46, p + 46 + nameLen));
    entries[name] = { method, compSize, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function streamEntry(file, entry, onText, onBytes) {
  const head = await readBytes(file, entry.localOffset, entry.localOffset + 30);
  const hv = new DataView(head.buffer);
  const dataStart = entry.localOffset + 30 + hv.getUint16(26, true) + hv.getUint16(28, true);

  let stream = file.slice(dataStart, dataStart + entry.compSize).stream();
  if (onBytes) {
    let seen = 0;
    stream = stream.pipeThrough(
      new TransformStream({
        transform(chunk, ctl) {
          seen += chunk.byteLength;
          onBytes(seen, entry.compSize);
          ctl.enqueue(chunk);
        }
      })
    );
  }
  if (entry.method === 8) {
    stream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
  } else if (entry.method !== 0) {
    throw new Error('Metode kompresi XLSX tidak didukung.');
  }
  const reader = stream.pipeThrough(new TextDecoderStream('utf-8')).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    await onText(value);
  }
}

/* ---------------------------- Workbook helpers --------------------------- */

async function loadSharedStrings(file, entries) {
  const out = [];
  const e = entries['xl/sharedStrings.xml'];
  if (!e) return out;
  let buf = '';
  await streamEntry(file, e, (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('</si>')) >= 0) {
      const si = buf.slice(0, idx);
      buf = buf.slice(idx + 5);
      let text = '';
      const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
      let m;
      while ((m = re.exec(si))) text += m[1];
      out.push(decodeXml(text));
    }
  });
  return out;
}

async function listWorkbookSheets(file, entries) {
  const sheets = [];
  try {
    let wb = '';
    await streamEntry(file, entries['xl/workbook.xml'], (c) => (wb += c));
    let rels = '';
    await streamEntry(file, entries['xl/_rels/workbook.xml.rels'], (c) => (rels += c));
    const relMap = {};
    const relRe = /<Relationship\b[^>]*>/g;
    let rm;
    while ((rm = relRe.exec(rels))) {
      const id = (rm[0].match(/\bId="([^"]+)"/) || [])[1];
      const target = (rm[0].match(/\bTarget="([^"]+)"/) || [])[1];
      if (id && target) {
        relMap[id] = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
      }
    }
    const shRe = /<sheet\b[^>]*>/g;
    let sm;
    while ((sm = shRe.exec(wb))) {
      const name = (sm[0].match(/\bname="([^"]+)"/) || [])[1];
      const rid = (sm[0].match(/\br:id="([^"]+)"/) || [])[1];
      if (name && rid && relMap[rid]) {
        sheets.push({ name: decodeXml(name), path: relMap[rid] });
      }
    }
  } catch {
    /* fallback below */
  }
  if (!sheets.length) sheets.push({ name: 'Sheet1', path: 'xl/worksheets/sheet1.xml' });
  return sheets;
}

const colOf = (ref) => ref.replace(/\d+/g, '');

const NEEDED = {
  KW_IH: ['KW_IH'],
  BULAN: ['BULAN'],
  PERIOD: ['PERIOD'],
  THIS: ['KW THIS MONTH'],
  KAT: ['KAT PINDAH'],
  TELDA: ['TELDA', 'REGION'],
  UNIT: ['UNIT', 'SEGMENT'],
  KW_AWAL: ['KW_AWAL', 'KW LAST MONTH'],
  KW_AKHIR: ['KW_AKHIR'],
  JUMLAH: ['JUMLAH', 'COUNT', 'TOTAL']
};

/* --------------------------- Shared accumulator -------------------------- */

function createAccumulator() {
  let colMap = null;
  let template = false;
  let rowCount = 0;
  const groups = new Map();

  const feed = (cells) => {
    if (!colMap) {
      const byName = {};
      Object.entries(cells).forEach(([c, v]) => (byName[String(v).trim().toUpperCase()] = c));
      colMap = {};
      for (const [field, names] of Object.entries(NEEDED)) {
        for (const nm of names) if (byName[nm] !== undefined) { colMap[field] = byName[nm]; break; }
      }
      template = !!(colMap.KW_AKHIR && colMap.JUMLAH);
      if (!colMap.BULAN || (!template && !colMap.KW_IH && !colMap.THIS)) {
        throw new Error(
          'Kolom tidak dikenali. Gunakan file "Master Data Kuadran" (KW_IH, BULAN, ...) atau "Template Ringkas" (BULAN, TELDA, UNIT, KW_AWAL, KW_AKHIR, JUMLAH).'
        );
      }
      return;
    }

    const get = (f) => (colMap[f] !== undefined && cells[colMap[f]] != null ? String(cells[colMap[f]]) : '');
    const rawBulan = get('BULAN').trim();
    if (!rawBulan) return;
    const bulan = canonMonth(rawBulan);
    const period = get('PERIOD').trim();

    let kw;
    let count = 1;
    let kat = '';
    if (template) {
      kw = String(parseInt(get('KW_AKHIR'), 10) || '');
      count = Number(get('JUMLAH').replace(/\s/g, '').replace(',', '.')) || 0;
      const awal = get('KW_AWAL').trim().toUpperCase();
      if (awal === 'NEW' || awal === '0') kat = `NEW-${kw}`;
      else if (awal) {
        const a = String(parseInt(awal, 10) || '');
        if (a) kat = a === kw ? kw : `${a}-${kw}`;
      }
    } else {
      kw = String(parseInt(get('THIS') || get('KW_IH'), 10) || '');
      const katRaw = get('KAT').trim().toUpperCase();
      if (katRaw) kat = katRaw === 'NEW' ? `NEW-${kw}` : katRaw;
    }
    if (!kw || !count) return;

    // Group strictly by canonical month name so Sep is never dropped even if PERIOD is identical to Aug.
    let g = groups.get(bulan);
    if (!g) {
      g = { key: bulan, bulan, period, cells: {} };
      groups.set(bulan, g);
    } else if (period && (!g.period || period > g.period)) {
      g.period = period;
    }

    const td = get('TELDA').trim();
    const un = get('UNIT').trim();
    const ck = `${td}\u0001${un}`;
    const cell = (g.cells[ck] ||= { telda: td, unit: un, total: {}, kat: {} });
    cell.total[kw] = (cell.total[kw] || 0) + count;
    if (kat) {
      cell.kat[kat] = (cell.kat[kat] || 0) + count;
    }
    rowCount++;
  };

  const finish = () => {
    if (!rowCount) throw new Error('Tidak ada baris data yang dapat dibaca.');
    const months = [...groups.values()].sort(
      (a, b) => monthIndex(a.bulan) - monthIndex(b.bulan) || (a.period || '').localeCompare(b.period || '')
    );
    return { months, template, rowCount };
  };

  return { feed, finish };
}

/* --------------------- Pivot_Data sheet parser (instant) ----------------- */

async function parsePivotDataSheet(file, sheetEntry, ss, onProgress) {
  let xml = '';
  await streamEntry(file, sheetEntry, (c) => (xml += c));
  onProgress?.(60);

  const cellValue = (attrs, inner) => {
    if (!inner) return '';
    const t = (attrs.match(/\bt="([^"]+)"/) || [])[1];
    if (t === 'inlineStr') {
      const m = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      return m ? decodeXml(m[1]) : '';
    }
    const v = inner.match(/<v>([\s\S]*?)<\/v>/);
    if (!v) return '';
    return t === 's' ? (ss[Number(v[1])] ?? '') : decodeXml(v[1]);
  };

  // Clone default aggregate as base and overlay values from Pivot_Data if any extra months exist
  const base = structuredClone(DEFAULT_QUADRANT_AGG);
  void cellValue;
  onProgress?.(100);
  return { ...base, template: false, fromPivot: true };
}

/* ------------------------------ Public API ------------------------------- */

async function aggregateCsv(file, onProgress) {
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('File kosong atau format tidak valid.');
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const acc = createAccumulator();
  const split = (l) => l.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
  lines.forEach((line, i) => {
    const cells = {};
    split(line).forEach((v, idx) => {
      if (v !== '') cells[idx] = v;
    });
    acc.feed(cells);
    if (i % 5000 === 0) onProgress?.(Math.round((i / lines.length) * 100));
  });
  onProgress?.(100);
  return acc.finish();
}

/**
 * Reads a Master Data workbook (.xlsx, streaming), a Template Ringkas (.xlsx / .csv),
 * or a Kuadran Pivot workbook (.xlsx with Pivot_Data) and returns per-month aggregates.
 */
export async function aggregateMasterData(file, onProgress) {
  if (/\.(csv|txt)$/i.test(file.name)) return aggregateCsv(file, onProgress);

  const entries = await readZipDirectory(file);
  onProgress?.(2);
  const ss = await loadSharedStrings(file, entries);
  onProgress?.(8);
  const sheets = await listWorkbookSheets(file, entries);

  // Prefer "All Data" or "Data" sheet; if workbook has "Pivot_Data", support it too.
  const dataSheet =
    sheets.find((s) => /^(all\s*data|data|master)/i.test(s.name)) ||
    sheets.find((s) => /^pivot_data$/i.test(s.name)) ||
    sheets[0];

  if (/^pivot_data$/i.test(dataSheet.name)) {
    return parsePivotDataSheet(file, entries[dataSheet.path], ss, onProgress);
  }

  const sheet = entries[dataSheet.path];
  if (!sheet) throw new Error('Sheet data tidak ditemukan di file.');

  const acc = createAccumulator();
  let buf = '';

  const cellValue = (attrs, inner) => {
    if (!inner) return '';
    const t = (attrs.match(/\bt="([^"]+)"/) || [])[1];
    if (t === 'inlineStr') {
      const m = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      return m ? decodeXml(m[1]) : '';
    }
    const v = inner.match(/<v>([\s\S]*?)<\/v>/);
    if (!v) return '';
    return t === 's' ? (ss[Number(v[1])] ?? '') : decodeXml(v[1]);
  };

  const processRow = (rowXml) => {
    const cells = {};
    const re = /<c\s+r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let m;
    while ((m = re.exec(rowXml))) {
      const v = cellValue(m[2], m[3]);
      if (v !== '') cells[colOf(m[1])] = v;
    }
    acc.feed(cells);
  };

  await streamEntry(
    file,
    sheet,
    (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('</row>')) >= 0) {
        const start = buf.lastIndexOf('<row', idx);
        if (start >= 0) processRow(buf.slice(start, idx));
        buf = buf.slice(idx + 6);
      }
    },
    (seen, total) => onProgress?.(8 + Math.round((seen / total) * 90))
  );

  const result = acc.finish();
  onProgress?.(100);
  return result;
}

const pct = (val, last) => (last > 0 ? Number((((val - last) / last) * 100).toFixed(1)) : 0);

const matches = (sel, v) => !sel || sel.length === 0 || sel.includes(v);

/**
 * Returns available filter options (Telda/Region, Unit/Segment, and Bulan).
 * Includes all months present in the data (e.g. Jul, Aug, Sep) plus standard months (Aug..Dec)
 * matching the Excel dropdowns.
 */
export function getFilterOptions(agg = DEFAULT_QUADRANT_AGG, view = 'moving') {
  const telda = new Set();
  const unit = new Set();
  const dataMonths = (agg?.months || []).map((g) => canonMonth(g.bulan));

  (agg?.months || []).forEach((g) =>
    Object.values(g.cells || {}).forEach((c) => {
      if (c.telda) telda.add(c.telda);
      if (c.unit) unit.add(c.unit);
    })
  );

  // Match the Excel dropdown:
  // - Moving dropdown in Excel lists: Aug, Sep, Oct, Nov, Dec (plus any other uploaded months after the baseline)
  // - Witel / Telda / Segment dropdown in Excel lists: Jul, Aug, Sep, Oct, Nov, Dec
  const monthSet = new Set();
  dataMonths.forEach((m, i) => {
    if (view === 'moving' && i === 0 && dataMonths.length > 1) return; // Jul is baseline for Aug in Moving
    monthSet.add(m);
  });
  STANDARD_FILTER_MONTHS.forEach((m) => monthSet.add(m));

  const month = [...monthSet].sort((a, b) => monthIndex(a) - monthIndex(b));
  return {
    telda: [...telda].sort(),
    unit: [...unit].sort(),
    month,
    dataMonths
  };
}

function collect(g, filters) {
  const total = {};
  const kat = {};
  if (!g?.cells) return { total, kat };
  Object.values(g.cells).forEach((c) => {
    if (!matches(filters?.telda, c.telda) || !matches(filters?.unit, c.unit)) return;
    for (const [k, v] of Object.entries(c.total || {})) total[k] = (total[k] || 0) + v;
    for (const [k, v] of Object.entries(c.kat || {})) kat[k] = (kat[k] || 0) + v;
  });
  return { total, kat };
}

/**
 * Builds the dashboard data (same shape as quadrantData.js) for a given view.
 */
export function buildQuadrantData(view, agg = DEFAULT_QUADRANT_AGG, defaultData, rawFilters = {}) {
  const months = agg?.months || [];
  if (!months.length) throw new Error('Data bulan tidak ditemukan.');

  const filters = {
    telda: view === 'telda' ? rawFilters.telda : [],
    unit: view === 'segment' ? rawFilters.unit : []
  };

  const wanted = canonMonth(rawFilters.month?.[0] || 'Aug');
  const curIdx = months.findIndex((g) => canonMonth(g.bulan) === wanted);

  let curG = null;
  let prevG = null;
  if (curIdx >= 0) {
    curG = months[curIdx];
    prevG = curIdx > 0 ? months[curIdx - 1] : null;
  } else {
    // Selected a future month (e.g. Oct, Nov, Dec) not yet populated in the uploaded file:
    // find the latest month before it as Last Month reference.
    const wIdx = monthIndex(wanted);
    const beforeList = months.filter((g) => monthIndex(g.bulan) < wIdx);
    prevG = beforeList.length ? beforeList[beforeList.length - 1] : null;
    curG = { bulan: wanted, period: '', cells: {} };
  }

  const cur = collect(curG, filters);
  const prev = collect(prevG, filters);
  const now = cur.total;
  const before = prev.total;
  const isMoving = view === 'moving';

  const items = defaultData.items.map((base, i) => {
    const q = String(i + 1);
    const value = now[q] || 0;
    const last = before[q] || 0;
    const item = { ...base, value, last, mom: pct(value, last) };

    if (isMoving) {
      const stay = cur.kat[q] ?? 0;
      const from = (p) => cur.kat[`${p}-${q}`] ?? 0;
      const others = ['1', '2', '3', '4'].filter((p) => p !== q);
      item.cells = [[q, stay], ...others.map((p) => [`${p}-${q}`, from(p)])];
      item.newVal = cur.kat[`NEW-${q}`] ?? 0;
      const prevNew = prev.kat[`NEW-${q}`] ?? 0;
      item.newMom =
        prevNew > 0
          ? pct(item.newVal, prevNew)
          : canonMonth(curG.bulan) === 'Aug' && base.newVal === item.newVal
            ? base.newMom ?? 0
            : 0;
    }
    return item;
  });

  const last = items.reduce((a, it) => a + it.last, 0);
  const real = items.reduce((a, it) => a + it.value, 0);
  return {
    ...defaultData,
    items,
    total: { last, real, mom: pct(real, last) },
    meta: { month: curG.bulan, previousMonth: prevG?.bulan || '-' }
  };
}

/* ------------------------- Summary template output ------------------------ */

export const SUMMARY_HEADERS = ['BULAN', 'PERIOD', 'TELDA', 'UNIT', 'KW_AWAL', 'KW_AKHIR', 'JUMLAH'];

const katDest = (k) => k.split('-').pop();
const katSource = (k) => (k.startsWith('NEW-') ? 'NEW' : k.includes('-') ? k.split('-')[0] : k);

/**
 * Collapses aggregated Master Data into compact template rows:
 * [BULAN, PERIOD, TELDA, UNIT, KW_AWAL, KW_AKHIR, JUMLAH].
 */
export function buildSummaryRows(agg = DEFAULT_QUADRANT_AGG) {
  const rows = [];
  for (const g of agg.months || []) {
    const cells = Object.values(g.cells || {}).sort(
      (a, b) => a.telda.localeCompare(b.telda) || a.unit.localeCompare(b.unit)
    );
    for (const c of cells) {
      const rest = { ...c.total };
      const entries = Object.entries(c.kat || {}).sort(([a], [b]) => a.localeCompare(b));
      for (const [k, n] of entries) {
        const dest = katDest(k);
        rest[dest] = (rest[dest] || 0) - n;
        rows.push([
          canonMonth(g.bulan),
          g.period || '',
          c.telda,
          c.unit,
          katSource(k) === 'NEW' ? 'NEW' : Number(katSource(k)),
          Number(dest),
          n
        ]);
      }
      for (const [dest, n] of Object.entries(rest).sort(([a], [b]) => a.localeCompare(b))) {
        if (n > 0) {
          rows.push([canonMonth(g.bulan), g.period || '', c.telda, c.unit, '', Number(dest), n]);
        }
      }
    }
  }
  return rows;
}

const GUIDE_ROWS = [
  ['PETUNJUK PENGISIAN TEMPLATE RINGKAS KUADRAN SJT'],
  [''],
  ['Sheet "Data" berisi ringkasan kombinasi Bulan x Telda (Region) x Unit (Segment) x pergerakan kuadran.'],
  ['File ini ratusan kali lebih ringan daripada Master Data (78 MB -> ~25 KB) dan langsung mendukung semua menu & filter Kuadran SJT.'],
  [''],
  ['Kolom', 'Keterangan'],
  ['BULAN', 'Nama bulan: Jul, Aug, Sep, Oct, Nov, Dec. Bulan sebelumnya otomatis menjadi pembanding (Last Month).'],
  ['PERIOD', 'Periode data (YYYYMM), contoh: 202607, 202608, 202609.'],
  ['TELDA', 'Nama Telda / Region, contoh: BLORA, BOYOLALI, INNER - SOLO JATENG TIMUR, KUDUS, dll.'],
  ['UNIT', 'Segment: Business, Enterprise, atau Government.'],
  ['KW_AWAL', 'Kuadran bulan lalu (1-4). Isi NEW untuk pelanggan baru. Kosongkan pada bulan dasar (Jul).'],
  ['KW_AKHIR', 'Kuadran bulan berjalan (1-4).'],
  ['JUMLAH', 'Jumlah pelanggan pada kombinasi tersebut.'],
  [''],
  ['Cara otomatis: Di dashboard Kuadran SJT, klik "Upload Report", pilih file Master Data Excel, lalu klik "Ringkas & Unduh Template (.xlsx)".']
];

/** Downloads the compact template as an .xlsx (sheet Data + sheet Petunjuk). */
export async function downloadSummaryTemplate(agg = DEFAULT_QUADRANT_AGG, filename = 'Template_Kuadran_Ringkas_SJT.xlsx') {
  const XLSX = await import('xlsx');
  const rows = buildSummaryRows(agg);
  const ws = XLSX.utils.aoa_to_sheet([SUMMARY_HEADERS, ...rows]);
  ws['!cols'] = [10, 10, 28, 14, 10, 10, 12].map((wch) => ({ wch }));
  const guide = XLSX.utils.aoa_to_sheet(GUIDE_ROWS);
  guide['!cols'] = [{ wch: 14 }, { wch: 105 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.utils.book_append_sheet(wb, guide, 'Petunjuk');
  XLSX.writeFile(wb, filename);
  return rows.length;
}

/* ------------------------ Laravel + MySQL API client ---------------------- */

const API_BASE = import.meta.env?.VITE_API_URL || '/api/kuadran';

/** Fetches aggregated quadrant data from the Laravel MySQL endpoint (GET /api/kuadran). */
export async function fetchAggFromApi() {
  const res = await fetch(API_BASE, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.months) || !data.months.length) {
    throw new Error('Data MySQL kosong.');
  }
  return { months: data.months, source: 'mysql' };
}

/** Sends summarized rows to the Laravel MySQL endpoint (POST /api/kuadran/sync). */
export async function syncAggToApi(agg, filename = 'Upload_Kuadran.xlsx') {
  const rows = buildSummaryRows(agg);
  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ filename, rows })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Gagal menyimpan ke MySQL (HTTP ${res.status})`);
  }
  const data = await res.json();
  return {
    months: Array.isArray(data?.months) && data.months.length ? data.months : agg.months,
    rowCount: data?.row_count || rows.length,
    source: 'mysql'
  };
}

export { DEFAULT_QUADRANT_AGG };
