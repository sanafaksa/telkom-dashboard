/**
 * Native HTML5 2D Canvas High-DPI Report Image Renderer for MoM & Support Needed.
 * Produces crystal-clear, 2x Retina PNG images with 100% vertically centered badges/pills,
 * clean text wrapping, and zero html2canvas baseline/clipping artifacts.
 */

const FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function setFont(ctx, weight = 400, size = 12) {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function drawRoundedRect(ctx, x, y, w, h, r, fill = null, stroke = null, lineWidth = 1) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [''];
  const rawParagraphs = String(text).split(/\r?\n/);
  const lines = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // Handle single very long word
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Draws the "Report Follow Up Support Needed — By Agenda" section onto a canvas context
 * and returns the height drawn.
 */
function drawAgendaSection(ctx, metrics, x, y, width) {
  const { agendaList = [], agendaSummary = {} } = metrics || {};
  const headerH = 72;
  const thH = 44;
  const rowH = 46;
  const totalRowH = 50;
  const footerH = 68;
  const cardH = headerH + thH + agendaList.length * rowH + totalRowH + footerH;

  // Card background & shadow
  ctx.save();
  drawRoundedRect(ctx, x, y, width, cardH, 16, '#FFFFFF', '#E2E8F0', 1);

  // Clip to rounded card
  ctx.beginPath();
  const r = 16;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + cardH - r);
  ctx.quadraticCurveTo(x + width, y + cardH, x + width - r, y + cardH);
  ctx.lineTo(x + r, y + cardH);
  ctx.quadraticCurveTo(x, y + cardH, x, y + cardH - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.clip();

  // 1. Navy Header Bar
  ctx.fillStyle = '#0B1E48';
  ctx.fillRect(x, y, width, headerH);

  // Icon box
  const iconBoxX = x + 20;
  const iconBoxY = y + (headerH - 34) / 2;
  drawRoundedRect(ctx, iconBoxX, iconBoxY, 34, 34, 8, 'rgba(255,255,255,0.12)');
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  for (let i = -1; i <= 1; i++) {
    const ly = iconBoxY + 17 + i * 4.5;
    ctx.beginPath();
    ctx.moveTo(iconBoxX + 10, ly);
    ctx.lineTo(iconBoxX + 24, ly);
    ctx.stroke();
  }

  // Title & Subtitle
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 700, 15.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Report Follow Up Support Needed — By Agenda', iconBoxX + 46, y + 26);

  setFont(ctx, 400, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText(
    'Distribusi status kebutuhan per agenda rapat koordinasi strategis (Dihitung Otomatis dari CSV/Excel)',
    iconBoxX + 46,
    y + 48
  );

  // Right Pill Badge
  const badgeText = `Total ${agendaSummary.totalCategories || agendaList.length} Kategori Agenda Terdata`;
  setFont(ctx, 600, 12);
  const badgeW = ctx.measureText(badgeText).width + 28;
  const badgeH = 32;
  const badgeX = x + width - badgeW - 20;
  const badgeY = y + (headerH - badgeH) / 2;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.20)', 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

  // 2. Table Columns definition
  const cols = [
    { label: 'NO', w: 56, align: 'center' },
    { label: 'NAMA AGENDA KOORDINASI', w: 264, align: 'left' },
    { label: 'OPEN / BELUM FU', w: 136, align: 'center', isRed: true },
    { label: '% OPEN', w: 96, align: 'center', isRed: true },
    { label: 'NEED DISCUSS', w: 120, align: 'center' },
    { label: '% DISCUSS', w: 100, align: 'center' },
    { label: 'ON PROGRESS', w: 120, align: 'center' },
    { label: '% PROGRESS', w: 108, align: 'center' },
    { label: 'DONE', w: 96, align: 'center' },
    { label: '% DONE', w: 96, align: 'center' },
    { label: 'TOTAL', w: 120, align: 'center', isTotal: true }
  ];
  // Scale columns proportionally to width
  const baseSum = cols.reduce((s, c) => s + c.w, 0);
  cols.forEach((c) => {
    c.w = (c.w / baseSum) * width;
  });

  // Table Header Row
  const thY = y + headerH;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(x, thY, width, thH);

  let curX = x;
  cols.forEach((c) => {
    if (c.isRed) {
      ctx.fillStyle = 'rgba(254, 242, 242, 0.7)';
      ctx.fillRect(curX, thY, c.w, thH);
    }
    setFont(ctx, c.isRed || c.isTotal ? 800 : 700, 11.5);
    ctx.fillStyle = c.isRed ? '#DC2626' : c.isTotal ? '#0F172A' : '#475569';
    ctx.textAlign = c.align;
    ctx.textBaseline = 'middle';
    const tx = c.align === 'left' ? curX + 14 : curX + c.w / 2;
    ctx.fillText(c.label, tx, thY + thH / 2);
    curX += c.w;
  });

  // Header bottom border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, thY + thH);
  ctx.lineTo(x + width, thY + thH);
  ctx.stroke();

  // 3. Data Rows
  let rowY = thY + thH;
  agendaList.forEach((r) => {
    let cx = x;
    const rowVals = [
      { v: r.no, bold: r.highlightNo, color: r.highlightNo ? '#DC2626' : '#475569' },
      { v: r.name, bold: true, color: '#1E293B' },
      { v: r.open, bold: r.open > 0, color: r.open > 0 ? '#DC2626' : '#CBD5E1', bg: 'rgba(254, 242, 242, 0.35)' },
      { v: r.pctOpen, bold: r.open > 0, color: r.open > 0 ? '#DC2626' : '#CBD5E1', bg: 'rgba(254, 242, 242, 0.35)' },
      { v: r.discuss, bold: r.discuss > 0, color: r.discuss > 0 ? '#1E293B' : '#CBD5E1' },
      { v: r.pctDiscuss, bold: false, color: r.discuss > 0 ? '#64748B' : '#CBD5E1' },
      { v: r.progress, bold: r.progress > 0, color: r.progress > 0 ? '#1E293B' : '#CBD5E1' },
      { v: r.pctProgress, bold: false, color: r.progress > 0 ? '#64748B' : '#CBD5E1' },
      { v: r.done, bold: r.done > 0, color: r.done > 0 ? '#1E293B' : '#CBD5E1' },
      { v: r.pctDone, bold: false, color: r.done > 0 ? '#64748B' : '#CBD5E1' },
      { v: r.total, bold: true, color: '#0F172A', weight: 800 }
    ];

    rowVals.forEach((cell, i) => {
      const col = cols[i];
      if (cell.bg) {
        ctx.fillStyle = cell.bg;
        ctx.fillRect(cx, rowY, col.w, rowH);
      }
      setFont(ctx, cell.weight || (cell.bold ? 700 : 500), 12);
      ctx.fillStyle = cell.color;
      ctx.textAlign = col.align;
      ctx.textBaseline = 'middle';
      const tx = col.align === 'left' ? cx + 14 : cx + col.w / 2;
      ctx.fillText(String(cell.v), tx, rowY + rowH / 2);
      cx += col.w;
    });

    // Row divider
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, rowY + rowH);
    ctx.lineTo(x + width, rowY + rowH);
    ctx.stroke();

    rowY += rowH;
  });

  // 4. Total Keseluruhan Row
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(x, rowY, width, totalRowH);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, rowY);
  ctx.lineTo(x + width, rowY);
  ctx.stroke();

  // Col 0+1 spanned label
  setFont(ctx, 800, 12);
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOTAL KESELURUHAN', x + 16, rowY + totalRowH / 2);

  let tcx = x + cols[0].w + cols[1].w;
  const totCells = [
    { v: agendaSummary.totalOpen ?? 0, color: '#DC2626', size: 14, weight: 800, bg: 'rgba(254, 242, 242, 0.65)' },
    { v: agendaSummary.pctOpen ?? '0%', color: '#DC2626', size: 12, weight: 800, bg: 'rgba(254, 242, 242, 0.65)' },
    { v: agendaSummary.totalDiscuss ?? 0, color: '#0F172A', size: 14, weight: 800 },
    { v: agendaSummary.pctDiscuss ?? '0%', color: '#334155', size: 12, weight: 700 },
    { v: agendaSummary.totalProgress ?? 0, color: '#0F172A', size: 14, weight: 800 },
    { v: agendaSummary.pctProgress ?? '0%', color: '#334155', size: 12, weight: 700 },
    { v: agendaSummary.totalDone ?? 0, color: '#0F172A', size: 14, weight: 800 },
    { v: agendaSummary.pctDone ?? '0%', color: '#334155', size: 12, weight: 700 },
    { v: agendaSummary.grandTotal ?? 0, color: '#0F172A', size: 15, weight: 900 }
  ];

  totCells.forEach((tc, idx) => {
    const col = cols[idx + 2];
    if (tc.bg) {
      ctx.fillStyle = tc.bg;
      ctx.fillRect(tcx, rowY, col.w, totalRowH);
    }
    setFont(ctx, tc.weight, tc.size);
    ctx.fillStyle = tc.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tc.v), tcx + col.w / 2, rowY + totalRowH / 2);
    tcx += col.w;
  });

  // 5. Footer Note
  const footY = rowY + totalRowH;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, footY);
  ctx.lineTo(x + width, footY);
  ctx.stroke();

  // Red indicator square perfectly aligned with first text line
  const line1Y = footY + 24;
  drawRoundedRect(ctx, x + 16, line1Y - 7, 14, 14, 3, '#DC2626');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 700, 12);
  ctx.fillStyle = '#0F172A';
  const boldLabel = 'Catatan Otomatis: ';
  ctx.fillText(boldLabel, x + 40, line1Y);
  const boldW = ctx.measureText(boldLabel).width;

  setFont(ctx, 400, 12);
  ctx.fillStyle = '#334155';
  ctx.fillText(agendaSummary.note || '', x + 40 + boldW, line1Y);

  setFont(ctx, 400, 11);
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`Sinkronisasi data terakhir: ${agendaSummary.lastSync || 'Baru saja'}`, x + 40, footY + 46);

  ctx.restore();
  return cardH;
}

/**
 * Measures and draws the "Daftar Detail Action Plan & Support Needed" table card.
 */
function measureAndDrawDetailSection(ctx, items, totalCount, x, y, width, draw = true) {
  const pad = 24;
  const innerW = width - pad * 2;
  const headerAreaH = 62;
  const thH = 44;

  // 8 Clean Columns (No "Aksi" icon column)
  const cols = [
    { key: 'no', label: '#', w: 46, align: 'center' },
    { key: 'agenda', label: 'Agenda & Tgl', w: 142, align: 'left' },
    { key: 'topic', label: 'Main Topic', w: 175, align: 'left' },
    { key: 'plan', label: 'Rencana Aksi (Action Plan)', w: 355, align: 'left' },
    { key: 'uic', label: 'UIC → Destinasi', w: 165, align: 'left' },
    { key: 'support', label: 'Support Needed', w: 295, align: 'left' },
    { key: 'deadline', label: 'Deadline', w: 112, align: 'center' },
    { key: 'status', label: 'Status', w: 122, align: 'center' }
  ];
  const colSum = cols.reduce((s, c) => s + c.w, 0);
  cols.forEach((c) => {
    c.w = (c.w / colSum) * innerW;
  });

  const lineH = 17.5;

  // Measure each row height
  const measuredRows = (items || []).map((item, idx) => {
    setFont(ctx, 700, 12);
    const agendaLines = wrapTextLines(ctx, item.agenda || '-', cols[1].w - 20);

    setFont(ctx, 600, 12);
    const topicLines = wrapTextLines(ctx, item.mainTopic || '-', cols[2].w - 24);

    setFont(ctx, 500, 12);
    const planLines = wrapTextLines(ctx, item.actionPlan || '-', cols[3].w - 24);

    setFont(ctx, 700, 12);
    const uicLines = wrapTextLines(ctx, item.uic || '-', cols[4].w - 20);
    setFont(ctx, 500, 11);
    const destText = item.destinasiFu && item.destinasiFu !== '-' ? `→ ${item.destinasiFu}` : '';
    const destLines = destText ? wrapTextLines(ctx, destText, cols[4].w - 20) : [];

    const hasSupport = Boolean(item.supportNeeded && item.supportNeeded !== '-');
    setFont(ctx, 500, 11.5);
    const supportLines = hasSupport
      ? wrapTextLines(ctx, item.supportNeeded, cols[5].w - 42)
      : ['-'];

    const col1H = agendaLines.length * lineH + 20;
    const col2H = topicLines.length * lineH;
    const col3H = planLines.length * lineH;
    const col4H = uicLines.length * lineH + (destLines.length ? destLines.length * 15 + 4 : 0);
    const col5H = hasSupport ? supportLines.length * 16.5 + 22 : 24;

    const contentH = Math.max(col1H, col2H, col3H, col4H, col5H, 34);
    const rowH = contentH + 26;

    return {
      idx: idx + 1,
      item,
      agendaLines,
      topicLines,
      planLines,
      uicLines,
      destLines,
      hasSupport,
      supportLines,
      rowH
    };
  });

  const rowsTotalH =
    measuredRows.length > 0
      ? measuredRows.reduce((s, r) => s + r.rowH, 0)
      : 80;
  const tableH = thH + rowsTotalH;
  const cardH = pad + headerAreaH + tableH + pad;

  if (!draw) return cardH;

  // Draw Card Outer Box
  drawRoundedRect(ctx, x, y, width, cardH, 16, '#FFFFFF', '#E2E8F0', 1);

  // Card Title + Count Pill
  const titleX = x + pad;
  const titleY = y + pad + 12;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 700, 16.5);
  ctx.fillStyle = '#0F172A';
  const titleStr = 'Daftar Detail Action Plan & Support Needed';
  ctx.fillText(titleStr, titleX, titleY);
  const titleW = ctx.measureText(titleStr).width;

  // Count Pill (100% vertically centered)
  const pillText = `${items.length} dari ${totalCount || items.length} item`;
  setFont(ctx, 600, 11.5);
  const pillW = ctx.measureText(pillText).width + 20;
  const pillH = 24;
  const pillX = titleX + titleW + 10;
  const pillY = titleY - pillH / 2;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 12, '#F1F5F9');
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);

  // Subtitle
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 400, 12);
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    'Rincian komprehensif rencana aksi, destinasi FU, tenggat waktu, dan kebutuhan dukungan',
    titleX,
    titleY + 24
  );

  // Table Container
  const tableX = x + pad;
  const tableY = y + pad + headerAreaH;
  ctx.save();
  drawRoundedRect(ctx, tableX, tableY, innerW, tableH, 12, '#FFFFFF', '#E2E8F0', 1);

  // Clip inside rounded table border
  ctx.beginPath();
  const tr = 12;
  ctx.moveTo(tableX + tr, tableY);
  ctx.lineTo(tableX + innerW - tr, tableY);
  ctx.quadraticCurveTo(tableX + innerW, tableY, tableX + innerW, tableY + tr);
  ctx.lineTo(tableX + innerW, tableY + tableH - tr);
  ctx.quadraticCurveTo(tableX + innerW, tableY + tableH, tableX + innerW - tr, tableY + tableH);
  ctx.lineTo(tableX + tr, tableY + tableH);
  ctx.quadraticCurveTo(tableX, tableY + tableH, tableX, tableY + tableH - tr);
  ctx.lineTo(tableX, tableY + tr);
  ctx.quadraticCurveTo(tableX, tableY, tableX + tr, tableY);
  ctx.closePath();
  ctx.clip();

  // Table Header
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(tableX, tableY, innerW, thH);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tableX, tableY + thH);
  ctx.lineTo(tableX + innerW, tableY + thH);
  ctx.stroke();

  let hcx = tableX;
  cols.forEach((c) => {
    setFont(ctx, 700, 12);
    ctx.fillStyle = '#334155';
    ctx.textAlign = c.align;
    ctx.textBaseline = 'middle';
    const tx = c.align === 'center' ? hcx + c.w / 2 : hcx + 12;
    ctx.fillText(c.label, tx, tableY + thH / 2);
    hcx += c.w;
  });

  // Table Body Rows
  let curY = tableY + thH;
  measuredRows.forEach((row, rIdx) => {
    const topPad = 14;
    let rcx = tableX;

    // Col 0: #
    setFont(ctx, 700, 12);
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(row.idx), rcx + cols[0].w / 2, curY + topPad);
    rcx += cols[0].w;

    // Col 1: Agenda & Tgl
    setFont(ctx, 700, 12);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    row.agendaLines.forEach((ln, i) => {
      ctx.fillText(ln, rcx + 10, curY + topPad + i * lineH);
    });
    setFont(ctx, 400, 11);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(row.item.tgl || '-', rcx + 10, curY + topPad + row.agendaLines.length * lineH + 4);
    rcx += cols[1].w;

    // Col 2: Main Topic
    setFont(ctx, 600, 12);
    ctx.fillStyle = '#1E293B';
    row.topicLines.forEach((ln, i) => {
      ctx.fillText(ln, rcx + 12, curY + topPad + i * lineH);
    });
    rcx += cols[2].w;

    // Col 3: Action Plan
    setFont(ctx, 500, 12);
    ctx.fillStyle = '#1E293B';
    row.planLines.forEach((ln, i) => {
      ctx.fillText(ln, rcx + 12, curY + topPad + i * lineH);
    });
    rcx += cols[3].w;

    // Col 4: UIC -> Destinasi
    setFont(ctx, 700, 12);
    ctx.fillStyle = '#0F172A';
    row.uicLines.forEach((ln, i) => {
      ctx.fillText(ln, rcx + 10, curY + topPad + i * lineH);
    });
    if (row.destLines.length > 0) {
      setFont(ctx, 500, 11);
      ctx.fillStyle = '#2563EB';
      const destStart = curY + topPad + row.uicLines.length * lineH + 3;
      row.destLines.forEach((ln, i) => {
        ctx.fillText(ln, rcx + 10, destStart + i * 15);
      });
    }
    rcx += cols[4].w;

    // Col 5: Support Needed
    if (row.hasSupport) {
      const boxX = rcx + 10;
      const boxY = curY + topPad - 2;
      const boxW = cols[5].w - 20;
      const boxH = row.supportLines.length * 16.5 + 18;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10, '#FFF1F2', '#FECDD3', 1);
      setFont(ctx, 500, 11.5);
      ctx.fillStyle = '#881337';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      row.supportLines.forEach((ln, i) => {
        ctx.fillText(ln, boxX + 11, boxY + 9 + i * 16.5);
      });
    } else {
      setFont(ctx, 400, 12);
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('-', rcx + 14, curY + topPad);
    }
    rcx += cols[5].w;

    // Col 6: Deadline Pill (100% vertically centered)
    const dlText = row.item.deadline || '-';
    setFont(ctx, 500, 11);
    const dlW = Math.max(ctx.measureText(dlText).width + 20, 74);
    const dlH = 25;
    const dlX = rcx + (cols[6].w - dlW) / 2;
    const dlY = curY + topPad - 2;
    drawRoundedRect(ctx, dlX, dlY, dlW, dlH, 6, '#F1F5F9');
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dlText, dlX + dlW / 2, dlY + dlH / 2);
    rcx += cols[6].w;

    // Col 7: Status Badge Pill (100% vertically centered + single line)
    const st = row.item.status || 'BELUM FU';
    let stBg = '#FFF1F2';
    let stBorder = '#FECDD3';
    let stText = '#BE123C';
    let stDot = '#F43F5E';

    if (st === 'DONE') {
      stBg = '#ECFDF5';
      stBorder = '#A7F3D0';
      stText = '#047857';
      stDot = '#10B981';
    } else if (st === 'IN PROGRESS') {
      stBg = '#EFF6FF';
      stBorder = '#BFDBFE';
      stText = '#1D4ED8';
      stDot = '#3B82F6';
    } else if (st === 'NEED DISCUSS') {
      stBg = '#FFFBEB';
      stBorder = '#FDE68A';
      stText = '#B45309';
      stDot = '#F59E0B';
    }

    setFont(ctx, 700, 10.5);
    const textW = ctx.measureText(st).width;
    const dotSize = 6;
    const gap = 6;
    const stPillW = textW + dotSize + gap + 22;
    const stPillH = 25;
    const stPillX = rcx + (cols[7].w - stPillW) / 2;
    const stPillY = curY + topPad - 2;
    const centerY = stPillY + stPillH / 2;

    drawRoundedRect(ctx, stPillX, stPillY, stPillW, stPillH, 13, stBg, stBorder, 1);

    // Colored dot
    ctx.beginPath();
    ctx.arc(stPillX + 11 + dotSize / 2, centerY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = stDot;
    ctx.fill();

    // Status label
    ctx.fillStyle = stText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(st, stPillX + 11 + dotSize + gap, centerY);

    curY += row.rowH;

    // Row divider
    if (rIdx < measuredRows.length - 1) {
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableX, curY);
      ctx.lineTo(tableX + innerW, curY);
      ctx.stroke();
    }
  });

  // Restore outer table border on top of clipped content
  drawRoundedRect(ctx, tableX, tableY, innerW, tableH, 12, null, '#E2E8F0', 1);
  ctx.restore();

  return cardH;
}

/**
 * Draws the "Report Follow Up Support Needed — By Unit (UIC)" card onto the canvas.
 */
function drawUnitsSection(ctx, metrics, x, y, width) {
  const { unitsList = [] } = metrics || {};
  const pad = 24;
  const headerH = 56;
  const boxH = 128;
  const cardH = pad + headerH + boxH + pad;

  drawRoundedRect(ctx, x, y, width, cardH, 16, '#FFFFFF', '#E2E8F0', 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 700, 16);
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Report Follow Up Support Needed — By Unit (UIC)', x + pad, y + pad + 10);

  setFont(ctx, 400, 12);
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    'Rincian beban eskalasi dukungan berdasarkan unit operasional dan fungsional',
    x + pad,
    y + pad + 32
  );

  // Right Pill
  const rightLabel = 'DISTRIBUSI UNIT TERKAIT';
  setFont(ctx, 700, 10.5);
  const rlW = ctx.measureText(rightLabel).width + 24;
  const rlH = 26;
  const rlX = x + width - pad - rlW;
  const rlY = y + pad + 6;
  drawRoundedRect(ctx, rlX, rlY, rlW, rlH, 6, '#F1F5F9');
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rightLabel, rlX + rlW / 2, rlY + rlH / 2);

  // 4 Unit Cards
  const gap = 16;
  const innerW = width - pad * 2;
  const colW = (innerW - gap * 3) / 4;
  const startY = y + pad + headerH;

  unitsList.slice(0, 4).forEach((u, i) => {
    const ux = x + pad + i * (colW + gap);
    drawRoundedRect(
      ctx,
      ux,
      startY,
      colW,
      boxH,
      14,
      '#FFFFFF',
      u.isTop ? '#2563EB' : '#E2E8F0',
      u.isTop ? 2 : 1
    );

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    setFont(ctx, 700, 10.5);
    ctx.fillStyle = u.isTop ? '#2563EB' : '#94A3B8';
    ctx.fillText(u.category || 'UNIT OPERASIONAL', ux + 18, startY + 24);

    setFont(ctx, 700, 14);
    ctx.fillStyle = '#0F172A';
    ctx.fillText(u.name || '', ux + 18, startY + 44);

    // Big count
    setFont(ctx, 900, 30);
    ctx.fillStyle = u.isTop ? '#2563EB' : '#0F172A';
    ctx.fillText(String(u.count ?? 0), ux + 18, startY + 84);

    setFont(ctx, 700, 11.5);
    ctx.fillText('Action Item', ux + 18, startY + 108);

    // Right status breakdown box
    const sbW = 122;
    const sbH = 62;
    const sbX = ux + colW - sbW - 14;
    const sbY = startY + boxH - sbH - 14;
    drawRoundedRect(
      ctx,
      sbX,
      sbY,
      sbW,
      sbH,
      10,
      u.isTop ? '#EFF6FF' : '#F8FAFC',
      u.isTop ? '#DBEAFE' : '#F1F5F9',
      1
    );

    const parts = (u.status || '').split(',').map((s) => s.trim());
    const dotColors = ['#F43F5E', '#3B82F6', '#10B981'];
    parts.slice(0, 3).forEach((p, idx) => {
      const py = sbY + 14 + idx * 17;
      ctx.beginPath();
      ctx.arc(sbX + 13, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = dotColors[idx] || '#64748B';
      ctx.fill();

      setFont(ctx, 500, 10.5);
      ctx.fillStyle = u.isTop ? '#1D4ED8' : '#475569';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p, sbX + 22, py);
    });
  });

  return cardH;
}

function createHiDPICanvas(logicalWidth, logicalHeight, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(logicalWidth * scale);
  canvas.height = Math.ceil(logicalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

/**
 * 1. Renders ONLY the "Report Follow Up Support Needed — By Agenda" table card to PNG Blob.
 */
export async function renderAgendaTableToBlob(metrics) {
  const width = 1360;
  const pad = 20;
  const { agendaList = [] } = metrics || {};
  const cardH = 72 + 44 + agendaList.length * 46 + 50 + 68;
  const totalW = width + pad * 2;
  const totalH = cardH + pad * 2;

  const { canvas, ctx } = createHiDPICanvas(totalW, totalH, 2);
  ctx.fillStyle = '#F6F8FC';
  ctx.fillRect(0, 0, totalW, totalH);

  drawAgendaSection(ctx, metrics, pad, pad, width);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/**
 * 2. Renders ONLY the "Daftar Detail Action Plan & Support Needed" table card to PNG Blob.
 */
export async function renderDetailTableToBlob(items, totalCount) {
  const width = 1360;
  const pad = 20;

  // Measure height first
  const dummyCanvas = document.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');
  const cardH = measureAndDrawDetailSection(dummyCtx, items, totalCount, 0, 0, width, false);

  const totalW = width + pad * 2;
  const totalH = cardH + pad * 2;

  const { canvas, ctx } = createHiDPICanvas(totalW, totalH, 2);
  ctx.fillStyle = '#F6F8FC';
  ctx.fillRect(0, 0, totalW, totalH);

  measureAndDrawDetailSection(ctx, items, totalCount, pad, pad, width, true);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/**
 * 3. Renders the Complete MoM & Support Needed Page (Header + Agenda + Units + Detail Table) to PNG Blob.
 */
export async function renderFullSupportPageToBlob(metrics, items, totalCount) {
  const width = 1360;
  const pad = 28;
  const gap = 22;
  const topTitleH = 62;

  const { agendaList = [] } = metrics || {};
  const agendaH = 72 + 44 + agendaList.length * 46 + 50 + 68;
  const unitsH = 24 + 56 + 128 + 24;

  const dummyCanvas = document.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');
  const detailH = measureAndDrawDetailSection(dummyCtx, items, totalCount, 0, 0, width, false);

  const totalW = width + pad * 2;
  const totalH = pad + topTitleH + agendaH + gap + unitsH + gap + detailH + pad;

  const { canvas, ctx } = createHiDPICanvas(totalW, totalH, 2);
  ctx.fillStyle = '#F6F8FC';
  ctx.fillRect(0, 0, totalW, totalH);

  // Page Title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 800, 26);
  ctx.fillStyle = '#0F172A';
  ctx.fillText('MoM & Support Needed', pad, pad + 16);

  setFont(ctx, 400, 13);
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    'Monitoring tindak lanjut MoM rapat koordinasi & eskalasi support needed Regional 3',
    pad,
    pad + 42
  );

  let curY = pad + topTitleH;
  drawAgendaSection(ctx, metrics, pad, curY, width);
  curY += agendaH + gap;

  drawUnitsSection(ctx, metrics, pad, curY, width);
  curY += unitsH + gap;

  measureAndDrawDetailSection(ctx, items, totalCount, pad, curY, width, true);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

