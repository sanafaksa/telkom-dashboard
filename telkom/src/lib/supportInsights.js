// Turunan data MoM Support (sumber: tabel mom_action_plans lewat /api/mom-support).
// Dipakai bersama oleh Dashboard (kartu & tabel), notifikasi header, dan pencarian global
// supaya semua angka dan tautannya berasal dari data yang sama.

import { normalizeStatus } from '../data/supportParser';

const DAY_MS = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Daftar UIC yang punya opsi filter di halaman Support (harus sama dengan UIC_FILTER_OPTIONS di sana)
export const UIC_FILTER_VALUES = ['BPPLP', 'ED', 'EVP', 'RLEGS', 'RSMES', 'RSMES & RLEGS', 'RSO', 'RSO 1', 'RSO 2', 'RWS', 'SSGS'];

/** "11/09/2026" (DD/MM/YYYY) → Date, null jika format tidak dikenali */
export function parseDmY(value) {
  const m = String(value || '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateLabel(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);

export const shorten = (text, max = 60) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// Samakan penulisan UIC: "RSO - PO" → "RSO", "RSMESS" → "RSMES" (sama dengan Support)
export const normalizeUic = (t) =>
  t.trim().toUpperCase().replace(/\s+-\s+.*$/, '').replace(/^RSMESS$/, 'RSMES');

export function uicTokens(uicText) {
  return String(uicText || '')
    .split(',')
    .map(normalizeUic)
    .filter(Boolean);
}

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/** Angka untuk kartu Executive Overview, dihitung langsung dari data MoM. */
export function buildDashboardStats(items) {
  let pending = 0;
  let progress = 0;
  let done = 0;
  const units = new Map();
  const uics = new Map();

  items.forEach((it) => {
    const status = normalizeStatus(it.status);
    if (status === 'DONE') done += 1;
    else if (status === 'IN PROGRESS') progress += 1;
    else pending += 1; // BELUM FU dan NEED DISCUSS: belum dimulai / tertunda

    const unit = String(it.unitTelda || '').trim();
    if (unit) {
      const u = units.get(unit) ?? { total: 0, done: 0 };
      u.total += 1;
      if (status === 'DONE') u.done += 1;
      units.set(unit, u);
    }

    uicTokens(it.uic).forEach((token) => uics.set(token, (uics.get(token) ?? 0) + 1));
  });

  const total = items.length;
  const witel = [...units.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([n, u]) => ({ n, v: pct(u.done, u.total), total: u.total }));

  const uic = [...uics.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([n, v]) => ({ n, v }));

  return {
    total,
    pending,
    progress,
    done,
    pctPending: pct(pending, total),
    pctProgress: pct(progress, total),
    pctDone: pct(done, total),
    witel,
    uic,
    uicMax: Math.max(1, ...uic.map((x) => x.v))
  };
}

/** Entri pencarian global dari data MoM: agenda, unit/witel, UIC, dan butir action plan. */
export function buildSupportSearchEntries(items) {
  const entries = [];
  const agendas = new Map();
  const units = new Map();
  const uics = new Map();

  items.forEach((it) => {
    const agenda = String(it.agenda || '').trim();
    if (agenda) agendas.set(agenda, (agendas.get(agenda) ?? 0) + 1);
    const unit = String(it.unitTelda || '').trim();
    if (unit) units.set(unit, (units.get(unit) ?? 0) + 1);
    uicTokens(it.uic).forEach((t) => uics.set(t, (uics.get(t) ?? 0) + 1));
  });

  agendas.forEach((count, name) =>
    entries.push({ type: 'Agenda', label: name, desc: `${count} butir action plan`, to: `/support-needed?q=${encodeURIComponent(name)}` })
  );
  units.forEach((count, name) =>
    entries.push({ type: 'Witel', label: name, desc: `${count} butir action plan`, to: `/support-needed?q=${encodeURIComponent(name)}` })
  );
  uics.forEach((count, name) => {
    const filterable = UIC_FILTER_VALUES.includes(name);
    entries.push({
      type: 'UIC',
      label: name,
      desc: `${count} butir · PIC UIC`,
      to: filterable ? `/support-needed?uic=${encodeURIComponent(name)}` : `/support-needed?q=${encodeURIComponent(name)}`
    });
  });
  items.forEach((it) => {
    const plan = String(it.actionPlan || '').trim();
    if (!plan) return;
    entries.push({
      type: 'Action Plan',
      label: shorten(plan, 70),
      desc: [it.agenda, it.unitTelda].filter(Boolean).join(' · ') || 'Support Needed',
      to: `/support-needed?q=${encodeURIComponent(shorten(plan, 60))}`
    });
  });
  return entries;
}

/**
 * Notifikasi dari data MoM:
 * - deadline action plan yang sudah lewat / mendekati (≤ 3 hari)
 * - tindak lanjut BELUM FU yang meeting-nya sudah lebih dari 7 hari lalu
 * - butir MoM baru sejak terakhir dilihat (lastSeenId)
 */
export function buildNotifications(items, { lastSeenId = null, now = new Date() } = {}) {
  const out = [];
  const open = items.filter((it) => normalizeStatus(it.status) !== 'DONE');

  const deadlines = [];
  open.forEach((it) => {
    const d = parseDmY(it.deadline);
    if (!d) return;
    const diff = dayDiff(d, now);
    if (diff <= 3) deadlines.push({ it, d, diff });
  });
  deadlines
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5)
    .forEach(({ it, d, diff }) => {
      const when = diff < 0 ? `terlewat ${-diff} hari` : diff === 0 ? 'jatuh tempo hari ini' : `${diff} hari lagi`;
      out.push({
        id: `deadline-${it.id}-${it.deadline}`,
        urgent: diff < 0,
        title: diff < 0 ? 'Deadline action plan terlewat' : 'Deadline action plan mendekati',
        desc: `${shorten(it.actionPlan, 70)} · ${it.unitTelda || '-'} · ${when}`,
        time: dateLabel(d),
        to: `/support-needed?q=${encodeURIComponent(shorten(it.actionPlan, 60))}`
      });
    });

  const staleFu = open.filter((it) => {
    const tgl = parseDmY(it.tgl);
    return normalizeStatus(it.status) === 'BELUM FU' && tgl && dayDiff(now, tgl) >= 7;
  });
  if (staleFu.length) {
    out.push({
      id: `fu-belum-${staleFu.length}`,
      urgent: false,
      title: 'Follow up belum dimulai',
      desc: `${staleFu.length} butir action plan masih BELUM FU lebih dari 7 hari sejak rapat`,
      time: 'Perlu tindak lanjut',
      to: '/support-needed?status=BELUM%20FU'
    });
  }

  const maxId = items.reduce((m, it) => Math.max(m, Number(it.id) || 0), 0);
  if (lastSeenId !== null && maxId > lastSeenId) {
    const added = items.filter((it) => (Number(it.id) || 0) > lastSeenId).length;
    out.push({
      id: `new-${maxId}`,
      urgent: false,
      title: 'Data MoM Support baru',
      desc: `${added} butir action plan baru ditambahkan ke database`,
      time: 'Baru',
      to: '/support-needed'
    });
  }

  return { list: out, maxId };
}

/* ---------- Penyimpanan status notifikasi per pengguna (localStorage, best effort) ---------- */

const notifKey = (userKey) => `solaris:notif:${userKey || 'anon'}`;

export function loadNotifState(userKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(notifKey(userKey))) ?? {};
    return {
      read: Array.isArray(raw.read) ? raw.read : [],
      dismissed: Array.isArray(raw.dismissed) ? raw.dismissed : [],
      lastSeenId: Number.isFinite(raw.lastSeenId) ? raw.lastSeenId : null
    };
  } catch {
    return { read: [], dismissed: [], lastSeenId: null };
  }
}

export function saveNotifState(userKey, state) {
  try {
    localStorage.setItem(notifKey(userKey), JSON.stringify(state));
  } catch {
    // storage penuh / diblokir: notifikasi tetap tampil, hanya status baca tidak tersimpan
  }
}
