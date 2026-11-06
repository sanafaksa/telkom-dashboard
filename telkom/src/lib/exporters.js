// =========================================================================
// Export helpers (XLSX / CSV / DOCX / PDF) dipakai bersama oleh <ExportButton>.
//
// Sumber data:
//   - tables : elemen <table> yang tampil di halaman (diambil dari DOM apa adanya)
//   - sheets : data mentah [{ name, rows: [{kolom: nilai}] }] untuk halaman tanpa <table>
// =========================================================================
import { captureElementToBlob } from '../components/ShareDropdown';

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const cleanText = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim();

export const exportStamp = () =>
  new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Tabel di DOM
// ---------------------------------------------------------------------------

// Judul tabel = heading (h3/h2) terdekat di kotak pembungkusnya yang muncul sebelum tabel
export function findTableTitle(table) {
  let el = table.parentElement;
  while (el && el !== document.body) {
    const heading = Array.from(el.querySelectorAll('h3, h2'))
      .filter((h) => !h.contains(table) && h.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING)
      .pop();
    if (heading) return cleanText(heading);
    el = el.parentElement;
  }
  return '';
}

// Semua tabel yang sedang tampil (tabel tersembunyi / kosong dilewati)
export function getVisibleTables(selector = 'table') {
  const tables = Array.from(document.querySelectorAll(selector)).filter(
    (t) => t.offsetParent !== null && t.rows.length > 0
  );
  return tables.map((el, i) => ({
    el,
    title: (tables.length > 1 ? findTableTitle(el) : '') || ''
  }));
}

// Gaya visual sel dari web (warna latar/teks, tebal, perataan) untuk Excel/Word
function cellStyleOf(cell, toHex) {
  const cs = getComputedStyle(cell);
  const trBg = cell.parentElement ? toHex(getComputedStyle(cell.parentElement).backgroundColor) : null;
  return {
    bg: toHex(cs.backgroundColor) || trBg || null,
    color: toHex(cs.color) || '#0f172a',
    bold: parseInt(cs.fontWeight, 10) >= 600,
    align: ['right', 'end'].includes(cs.textAlign) ? 'right' : cs.textAlign === 'center' ? 'center' : 'left',
    header: cell.tagName === 'TH'
  };
}

// <table> -> grid 2D dengan rowSpan/colSpan diurai; sel gabungan berisi null.
// styles[r][c] = gaya sel asal (sel gabungan memakai gaya sel induknya).
export function tableToGrid(table) {
  const toHex = createHexColor();
  const grid = [];
  const styleGrid = [];
  const merges = [];
  Array.from(table.rows).forEach((tr, r) => {
    grid[r] = grid[r] || [];
    styleGrid[r] = styleGrid[r] || [];
    let c = 0;
    Array.from(tr.cells).forEach((cell) => {
      while (grid[r][c] !== undefined) c++;
      const rs = Math.max(1, cell.rowSpan || 1);
      const cs = Math.max(1, cell.colSpan || 1);
      const style = cellStyleOf(cell, toHex);
      for (let i = 0; i < rs; i++) {
        grid[r + i] = grid[r + i] || [];
        styleGrid[r + i] = styleGrid[r + i] || [];
        for (let j = 0; j < cs; j++) {
          grid[r + i][c + j] = i === 0 && j === 0 ? cleanText(cell) : null;
          styleGrid[r + i][c + j] = style;
        }
      }
      if (rs > 1 || cs > 1) merges.push({ s: { r, c }, e: { r: r + rs - 1, c: c + cs - 1 } });
      c += cs;
    });
  });
  const width = Math.max(1, ...grid.map((row) => row.length));
  const rows = grid.map((row) => Array.from({ length: width }, (_, c) => (row[c] == null ? '' : row[c])));
  const styles = styleGrid.map((row) => Array.from({ length: width }, (_, c) => row[c] || null));
  return { rows, styles, merges, width };
}

// Angka format Indonesia -> { value, z } untuk Excel; null kalau bukan angka.
//   "1.958.186.571" "- 12.081.550" "2.333,5" "4,3" "Rp 7.737.000" "61,8%"
// Kode/periode tanpa pemisah ribuan (mis. "202611", "2026") sengaja tetap teks.
export function parseIdNumber(text) {
  const t = String(text ?? '').replace(/ /g, ' ').trim();
  const m = t.match(/^([-−])?\s*(?:Rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?\s*(%)?$/);
  if (!m) return null;
  const [, neg, intPart, dec, pct] = m;
  if (!intPart.includes('.') && !dec && !pct && intPart.length >= 4) return null;
  let value = Number(intPart.replace(/\./g, '') + (dec ? `.${dec}` : ''));
  if (Number.isNaN(value)) return null;
  if (neg) value = -value;
  if (pct) return { value: value / 100, z: dec ? '0.0%' : '0%' };
  return { value, z: dec ? `#,##0.${'0'.repeat(Math.min(dec.length, 3))}` : '#,##0' };
}

// ---------------------------------------------------------------------------
// Normalisasi sumber -> daftar "lembar" seragam { title, rows(2D), merges }
// ---------------------------------------------------------------------------
function sheetsFromRows(sheets) {
  return sheets.map(({ name, rows }) => {
    const list = rows || [];
    const keys = list.length ? Object.keys(list[0]) : [];
    return {
      title: name || '',
      rows: [keys, ...list.map((r) => keys.map((k) => r[k] ?? ''))],
      merges: [],
      raw: true // nilai sudah bertipe (number/string), bukan teks tampilan
    };
  });
}

function sheetsFromTables(tables) {
  return tables.map(({ el, title }) => ({ title, ...tableToGrid(el), raw: false }));
}

export function collectSheets({ sheets, tableSelector }) {
  if (sheets?.length) return sheetsFromRows(sheets);
  return sheetsFromTables(getVisibleTables(tableSelector));
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------
// Satu sheet "Laporan": judul dokumen, lalu semua tabel bertumpuk dengan judul masing-masing.
// Warna header, warna teks, tebal & perataan mengikuti tampilan web; angka jadi angka asli.
const argb = (hex) => (hex ? `FF${hex.replace('#', '').toUpperCase()}` : undefined);
const BORDER = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const ALL_BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
const RAW_HEADER_STYLE = { bg: '#0f172a', color: '#ffffff', bold: true, align: 'center', header: true };

export async function exportXlsx(sheetList, filename, docTitle) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('Laporan', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }]
  });

  const totalWidth = Math.max(1, ...sheetList.map((s) => Math.max(1, ...s.rows.map((r) => r.length))));
  const colChars = Array(totalWidth).fill(8);

  // Judul dokumen
  let row = 1;
  if (totalWidth > 1) ws.mergeCells(row, 1, row, totalWidth);
  Object.assign(ws.getCell(row, 1), {
    value: docTitle,
    font: { bold: true, size: 14, color: { argb: 'FF0F172A' } }
  });
  ws.getRow(row).height = 22;
  row++;
  if (totalWidth > 1) ws.mergeCells(row, 1, row, totalWidth);
  Object.assign(ws.getCell(row, 1), {
    value: `Diekspor ${exportStamp()}`,
    font: { italic: true, size: 9, color: { argb: 'FF64748B' } }
  });
  row += 2;

  sheetList.forEach((sheet, idx) => {
    const width = Math.max(1, ...sheet.rows.map((r) => r.length));

    // Judul tabel
    if (sheetList.length > 1 || sheet.title) {
      if (width > 1) ws.mergeCells(row, 1, row, width);
      Object.assign(ws.getCell(row, 1), {
        value: (sheet.title || `Tabel ${idx + 1}`).toUpperCase(),
        font: { bold: true, size: 11, color: { argb: 'FF1D4ED8' } }
      });
      ws.getRow(row).height = 18;
      row++;
    }

    const startRow = row;
    sheet.rows.forEach((values, r) => {
      const isRawHeader = sheet.raw && r === 0;
      values.forEach((v, c) => {
        const cell = ws.getCell(startRow + r, c + 1);
        const st = isRawHeader ? RAW_HEADER_STYLE : sheet.styles?.[r]?.[c] || null;

        // Nilai: angka asli kalau bisa, selain itu teks
        let numFmt;
        if (typeof v === 'number') {
          cell.value = v;
          numFmt = Number.isInteger(v) ? '#,##0' : '#,##0.0##';
        } else {
          const p = !sheet.raw && !st?.header ? parseIdNumber(v) : null;
          if (p) {
            cell.value = p.value;
            numFmt = p.z;
          } else {
            cell.value = v === '' ? null : v;
          }
        }
        if (numFmt) cell.numFmt = numFmt;

        const isNumber = typeof cell.value === 'number';
        cell.border = ALL_BORDERS;
        cell.font = {
          name: 'Arial',
          size: 9,
          bold: !!(st?.bold || st?.header),
          color: { argb: argb(st?.color) || 'FF0F172A' }
        };
        if (st?.bg && st.bg !== '#ffffff') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(st.bg) } };
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: st?.header ? 'center' : isNumber ? 'right' : v === '-' ? 'center' : st?.align || 'left',
          wrapText: !!st?.header
        };

        const len = String(v ?? '').length;
        colChars[c] = Math.max(colChars[c], Math.min(st?.header ? 18 : 48, len + 2));
      });
    });

    // Gabungan sel (rowSpan/colSpan) dari tabel web
    sheet.merges.forEach((m) => {
      ws.mergeCells(startRow + m.s.r, m.s.c + 1, startRow + m.e.r, m.e.c + 1);
    });

    row = startRow + sheet.rows.length + 2; // jarak antar tabel
  });

  colChars.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filename}.xlsx`
  );
}

// ---------------------------------------------------------------------------
// CSV  (pemisah ";" + desimal koma -> langsung terbaca sebagai angka di Excel Indonesia)
// ---------------------------------------------------------------------------
function csvValue(v, raw) {
  let s;
  if (typeof v === 'number') {
    s = String(v).replace('.', ',');
  } else if (!raw) {
    const p = parseIdNumber(v);
    s = p && p.z.indexOf('%') === -1 ? String(p.value).replace('.', ',') : String(v ?? '');
  } else {
    s = String(v ?? '');
  }
  s = s.replace(/\r?\n+/g, ' ').trim();
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(sheetList, filename) {
  const lines = [];
  sheetList.forEach((sheet, i) => {
    if (sheetList.length > 1) {
      if (i > 0) lines.push('');
      lines.push(csvValue(sheet.title || `Tabel ${i + 1}`, true));
    }
    sheet.rows.forEach((row) => lines.push(row.map((v) => csvValue(v, sheet.raw)).join(';')));
  });
  const content = '﻿sep=;\r\n' + lines.join('\r\n');
  triggerDownload(new Blob([content], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

// ---------------------------------------------------------------------------
// DOCX (HTML Word, landscape) — tabel DOM dipertahankan warnanya
// ---------------------------------------------------------------------------
function createHexColor() {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  return (css) => {
    if (!css || css === 'transparent') return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    const mix = (v) => Math.round(v * (a / 255) + 255 * (1 - a / 255));
    return '#' + [mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
}

const CELL_BASE = 'border:0.5pt solid #cbd5e1;padding:2pt 3pt;vertical-align:middle;white-space:nowrap';
const TABLE_OPEN =
  '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:6.5pt;mso-table-layout-alt:autofit">';

function domTableToWordHtml(tableEl) {
  const toHex = createHexColor();
  const htmlRows = Array.from(tableEl.rows).map((tr) => {
    const trBg = toHex(getComputedStyle(tr).backgroundColor);
    const cells = Array.from(tr.cells).map((cell) => {
      const cs = getComputedStyle(cell);
      const bg = toHex(cs.backgroundColor) || trBg || '#ffffff';
      const color = toHex(cs.color) || '#0f172a';
      const bold = parseInt(cs.fontWeight, 10) >= 600;
      const align = ['right', 'end'].includes(cs.textAlign) ? 'right' : cs.textAlign === 'center' ? 'center' : 'left';
      const tag = cell.tagName === 'TH' ? 'th' : 'td';
      const span = `${cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''}${cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ''}`;
      const style = `${CELL_BASE};background:${bg};color:${color};font-weight:${bold ? 'bold' : 'normal'};text-align:${align}`;
      return `<${tag}${span} style="${style}">${escapeHtml(cleanText(cell))}</${tag}>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  });
  return `${TABLE_OPEN}${htmlRows.join('')}</table>`;
}

function rowsToWordHtml(rows) {
  const [head = [], ...body] = rows;
  const th = head
    .map((h) => `<th style="${CELL_BASE};background:#0f172a;color:#ffffff;font-weight:bold;text-align:center">${escapeHtml(h)}</th>`)
    .join('');
  const trs = body.map(
    (r) =>
      `<tr>${r
        .map(
          (v) =>
            `<td style="${CELL_BASE};text-align:${typeof v === 'number' ? 'right' : 'left'}">${escapeHtml(
              typeof v === 'number' ? v.toLocaleString('id-ID') : v
            )}</td>`
        )
        .join('')}</tr>`
  );
  return `${TABLE_OPEN}<tr>${th}</tr>${trs.join('')}</table>`;
}

export function exportDocx({ sheets, tableSelector }, filename, docTitle) {
  const parts = sheets?.length
    ? sheetsFromRows(sheets).map((s) => ({ title: s.title, html: rowsToWordHtml(s.rows) }))
    : getVisibleTables(tableSelector).map(({ el, title }) => ({ title, html: domTableToWordHtml(el) }));
  if (!parts.length) return false;

  const body = parts
    .map(({ title, html }) => `${parts.length > 1 && title ? `<h2>${escapeHtml(title)}</h2>` : ''}${html}`)
    .join('<p class="gap">&nbsp;</p>');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(docTitle)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page Landscape { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 28pt 24pt 28pt 24pt; }
  div.Landscape { page: Landscape; }
  body { font-family: Arial, sans-serif; }
  h1 { font-size: 14pt; margin: 0 0 2pt 0; color: #0f172a; }
  p.meta { font-size: 8pt; color: #64748b; margin: 0 0 8pt 0; }
  h2 { font-size: 10pt; margin: 10pt 0 4pt 0; color: #0f172a; page-break-after: avoid; }
  p.gap { font-size: 4pt; margin: 0; }
</style></head>
<body><div class="Landscape">
<h1>${escapeHtml(docTitle)}</h1>
<p class="meta">Diekspor ${escapeHtml(exportStamp())}</p>
${body}
</div></body></html>`;
  triggerDownload(new Blob(['﻿', html], { type: 'application/msword' }), `${filename}.doc`);
  return true;
}

// ---------------------------------------------------------------------------
// PDF — difoto per blok (anak langsung dari area konten) supaya pergantian halaman
// jatuh di antara blok, bukan memotong baris tabel; skala dibatasi agar canvas tidak
// melebihi batas browser pada halaman yang sangat panjang.
// ---------------------------------------------------------------------------
const MAX_CANVAS_PX = 12000;

async function blobToImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const im = new window.Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function cropToDataUrl(img, srcY, srcH) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = Math.max(1, Math.ceil(srcH));
  c.getContext('2d').drawImage(img, 0, srcY, img.width, srcH, 0, 0, img.width, srcH);
  return c.toDataURL('image/jpeg', 0.92);
}

export async function exportPdf(target, filename, docTitle) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const top = margin + 8; // ruang header judul
  const bottom = pageH - margin;
  const usableW = pageW - margin * 2;
  const usableH = bottom - top;
  const gap = 2;

  let blocks = Array.from(target.children).filter(
    (el) =>
      !el.hasAttribute('data-html2canvas-ignore') &&
      el.offsetHeight > 0 &&
      getComputedStyle(el).display !== 'none'
  );
  if (!blocks.length) blocks = [target];

  let y = top;
  for (const block of blocks) {
    const scale = Math.max(0.5, Math.min(2, MAX_CANVAS_PX / Math.max(1, block.scrollHeight + 32)));
    const blob = await captureElementToBlob(block, '#F6F8FC', { scale });
    if (!blob) continue;
    const img = await blobToImage(blob);
    const hMm = (img.height * usableW) / img.width;

    if (hMm <= bottom - y) {
      pdf.addImage(cropToDataUrl(img, 0, img.height), 'JPEG', margin, y, usableW, hMm);
      y += hMm + gap;
      continue;
    }
    if (hMm <= usableH) {
      pdf.addPage();
      y = top;
      pdf.addImage(cropToDataUrl(img, 0, img.height), 'JPEG', margin, y, usableW, hMm);
      y += hMm + gap;
      continue;
    }

    // Blok lebih tinggi dari satu halaman: potong per halaman
    if (y > top) {
      pdf.addPage();
      y = top;
    }
    const pxPerMm = img.width / usableW;
    let srcY = 0;
    while (srcY < img.height) {
      const srcH = Math.min(usableH * pxPerMm, img.height - srcY);
      const hPart = srcH / pxPerMm;
      pdf.addImage(cropToDataUrl(img, srcY, srcH), 'JPEG', margin, y, usableW, hPart);
      srcY += srcH;
      if (srcY < img.height) {
        pdf.addPage();
        y = top;
      } else {
        y += hPart + gap;
      }
    }
  }

  // Header di setiap halaman
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(docTitle, margin, margin + 4);
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Diekspor ${exportStamp()}  ·  Hal ${i}/${total}`, pageW - margin, margin + 4, { align: 'right' });
  }

  pdf.save(`${filename}.pdf`);
}
