import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { can } from '../features/auth/auth';
import { DeadlineInput } from './FormFields';
import UnsavedChangesBar from './UnsavedChangesBar';
import { useDraftForm, isSameValues } from '../lib/useDraftForm';
import { clearDraft, loadDraft, saveDraft } from '../lib/draft';
import { parseDmY } from '../lib/supportInsights';
import { RichText } from './RichText';
import {
  SUPPORT_CHANGED_EVENT,
  plainSupportText,
  addMeetingActionApi,
  deleteActionApi,
  deleteMeetingApi,
  fetchSupportFromApi,
  setSupportClearApi,
  updateActionApi,
  updateMeetingApi
} from '../data/supportParser';

const PAGE_SIZE = 6;

// Kunci draft notulensi (harus cocok dengan prefix di lib/draft.js agar tampil di popup)
const meetingDraftKey = (meetingId) => `mom-notulensi:${meetingId}`;
const actionDraftKey = (id) => `mom-notulensi-action:${id}`;
const newActionDraftKey = (meetingId) => `mom-notulensi-new:${meetingId}`;

const actionValuesOf = (item) => ({
  actionPlan: item.actionPlan,
  uic: item.uic,
  destinasiFu: item.destinasiFu,
  supportNeeded: item.supportNeeded,
  deadline: item.deadline,
  status: item.status,
  notes: item.notes
});

const STATUS_OPTIONS =['BELUM FU', 'IN PROGRESS', 'NEED DISCUSS', 'DONE'];

const STATUS_TONE = {
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'IN PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
  'NEED DISCUSS': 'bg-amber-50 text-amber-700 border-amber-200',
  'BELUM FU': 'bg-slate-100 text-slate-600 border-slate-200'
};

const inputCls =
  'mt-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:border-blue-500 focus:outline-none';

/** Semua action plan dalam satu notulensi punya deadline yang sama? Kembalikan deadline itu, kalau tidak '' */
const commonDeadlineOf = (items) =>
  items.every((i) => i.deadline === items[0].deadline) ? items[0].deadline : '';

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Label deadline notulensi: satu tanggal kalau semua sama, rentang "18 Sep – 30 Okt 2026"
 * (terdekat ke terjauh) kalau berbeda. Deadline yang tidak bisa dibaca sebagai tanggal diabaikan.
 */
function deadlineLabelOf(items) {
  if (commonDeadlineOf(items)) return commonDeadlineOf(items);

  const dates = items.map((i) => parseDmY(i.deadline)).filter(Boolean).sort((a, b) => a - b);
  if (dates.length === 0) return 'beda-beda';

  const first = dates[0];
  const last = dates[dates.length - 1];
  const fmt = (d) => `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
  if (first.getTime() === last.getTime()) return `${fmt(first)} ${first.getFullYear()}`;
  if (first.getFullYear() === last.getFullYear()) return `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`;
  return `${fmt(first)} ${first.getFullYear()} – ${fmt(last)} ${last.getFullYear()}`;
}

/** Kelompokkan action plan per notulensi (meetingId). Urutan mengikuti kemunculan pertama. */
function groupByMeeting(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.meetingId ?? `${item.no}|${item.tgl}|${item.agenda}|${item.mainTopic}`;
    if (!map.has(key)) map.set(key, { key, meetingId: item.meetingId, head: item, items: [] });
    map.get(key).items.push(item);
  });
  return [...map.values()];
}

/**
 * focus (dari laporan MoM): { agenda?, status?, meetingId?, nonce }. Setiap nonce baru menerapkan fokusnya:
 * agenda & status menjadi filter, meetingId membuka popup notulensi tersebut.
 */
export default function NotulensiSection({ focus = null }) {
  const canManage = can('mom.manage');
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [agendaFilter, setAgendaFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (!focus) return;
    setAgendaFilter(focus.agenda ?? null);
    setStatusFilter(focus.status ?? null);
    setQ('');
    if (focus.meetingId) setOpenKey(focus.meetingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  // Muat dari database dan ikut diperbarui setiap MoM berubah (edit di popup, upload Excel, dst.)
  useEffect(() => {
    let active = true;
    const load = () => {
      fetchSupportFromApi().then((dbItems) => {
        if (active && Array.isArray(dbItems)) {
          setItems(dbItems);
          setLoaded(true);
        }
      });
    };
    load();
    window.addEventListener(SUPPORT_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(SUPPORT_CHANGED_EVENT, load);
    };
  }, []);

  const groups = useMemo(() => groupByMeeting(items), [items]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (agendaFilter && g.head.agenda !== agendaFilter) return false;
      if (statusFilter && !g.items.some((i) => i.status === statusFilter)) return false;
      if (!term) return true;
      const h = g.head;
      return [h.no, h.agenda, h.tgl, h.mainTopic, h.unitTelda, h.pembahasanNotulen, h.pembahasan]
        .some((v) => String(v ?? '').toLowerCase().includes(term))
        || g.items.some((i) => i.actionPlan.toLowerCase().includes(term));
    });
  }, [groups, q, agendaFilter, statusFilter]);

  // Paginasi: 6 notulensi per halaman. Kembali ke halaman 1 saat pencarian berubah.
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, agendaFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openGroup = groups.find((g) => g.key === openKey) ?? null;

  // Dibuka dari popup draft: notulensi yang punya draft belum disimpan langsung terbuka (sekali per navigasi)
  const location = useLocation();
  const navigate = useNavigate();
  const consumedDraftRef = useRef(null);
  useEffect(() => {
    const k = location.state?.openDraft;
    if (typeof k !== 'string' || !loaded || consumedDraftRef.current === location.key) return;
    const m = k.match(/^mom-notulensi(?:-action|-new)?:(.+)$/);
    if (!m) return;
    consumedDraftRef.current = location.key;
    // Hapus status "buka draft" dari riwayat supaya reload tidak membukanya lagi
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
    // Popup hanya dibuka kalau draft-nya masih ada (draft yang sudah dibuang tidak dibuka)
    if (!loadDraft(k)) return;
    let meetingId = m[1];
    if (k.startsWith('mom-notulensi-action:')) {
      meetingId = items.find((i) => String(i.id) === meetingId)?.meetingId;
    }
    const group = groups.find((g) => String(g.key) === String(meetingId));
    if (group) setOpenKey(group.key);
  }, [location.key, loaded, groups, items]);

  return (
    <section id="notulensi-section" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Notulensi Rapat
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {groups.length} notulensi · {items.length} action plan
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Klik notulensi untuk melihat, mengedit isi rapat, dan mengubah deadline semua action plan-nya sekaligus.
          </p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari notulensi, topik, atau action plan…"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
      </div>

      {(agendaFilter || statusFilter) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Filter aktif:</span>
          {agendaFilter && (
            <button type="button" onClick={() => setAgendaFilter(null)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold cursor-pointer hover:bg-blue-100">
              Agenda: {agendaFilter} <X size={12} />
            </button>
          )}
          {statusFilter && (
            <button type="button" onClick={() => setStatusFilter(null)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold cursor-pointer hover:bg-amber-100">
              Status: {statusFilter} <X size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAgendaFilter(null);
              setStatusFilter(null);
            }}
            className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}

      {!loaded ? (
        <p className="py-10 text-center text-xs text-slate-400">Memuat notulensi…</p>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">
          {groups.length === 0 ? 'Belum ada notulensi. Upload data MoM atau tambah butir baru.' : 'Tidak ada notulensi yang cocok.'}
        </p>
      ) : (
        <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((g) => {
            const h = g.head;
            const clear = g.items.filter((i) => i.supportClear).length;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setOpenKey(g.key)}
                className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="size-9 shrink-0 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                    {h.no || '-'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-slate-400">
                      {h.agenda} · {h.tgl}
                    </div>
                    <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">{h.mainTopic}</div>
                  </div>
                </div>
                {h.pembahasanNotulen && h.pembahasanNotulen.trim() && (
                  <p className="mt-3 text-[11px] text-slate-600 leading-relaxed line-clamp-2 whitespace-pre-line">
                    {h.pembahasanNotulen}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {g.items.length} action plan
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                    {clear} clear
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                    Deadline: {deadlineLabelOf(g.items)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Menampilkan <b className="text-slate-800">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)}</b> dari{' '}
              <b className="text-slate-800">{visible.length}</b> notulensi
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Halaman sebelumnya"
                className="size-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Halaman berikutnya"
                className="size-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {openGroup && (
        <NotulensiDetailModal
          key={openGroup.key}
          group={openGroup}
          canManage={canManage}
          onClose={() => setOpenKey(null)}
          onRemoved={() => setOpenKey(null)}
        />
      )}
    </section>
  );
}

/** Popup detail notulensi: isi rapat, deadline bersama, dan daftar action plan yang bisa diedit satu per satu. */
function NotulensiDetailModal({ group, canManage, onClose, onRemoved }) {
  const meetingId = group.meetingId;
  const draft = useDraftForm(meetingDraftKey(meetingId), {
    no: group.head.no,
    tgl: group.head.tgl,
    agenda: group.head.agenda,
    mainTopic: group.head.mainTopic,
    unitTelda: group.head.unitTelda,
    peserta: group.head.peserta,
    pembahasan: group.head.pembahasan,
    pembahasanNotulen: group.head.pembahasanNotulen,
    deadline: commonDeadlineOf(group.items)
  });
  const { values: form, setValues: setForm, base, dirty: meetingDirty, restored, savedAt, discardDraft, markSaved } = draft;
  const [confirming, setConfirming] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Edit action plan yang sedang terbuka juga dihitung sebagai perubahan yang belum disimpan
  const dirty = meetingDirty || editingId !== null;
  // Draft edit action plan (per item) dan draft action plan baru: disimpan otomatis ke browser
  const [actionForm, setActionForm] = useState({});
  const [actionBase, setActionBase] = useState({});
  const [actionRestored, setActionRestored] = useState(false);
  const [actionSavedAt, setActionSavedAt] = useState(null);
  const newKey = newActionDraftKey(meetingId);
  const [newAction, setNewAction] = useState(() => loadDraft(newKey)?.value?.text ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editingId === null) return undefined;
    const key = actionDraftKey(editingId);
    const t = setTimeout(() => {
      if (isSameValues(actionForm, actionBase)) {
        clearDraft(key);
        setActionSavedAt(null);
      } else {
        saveDraft(key, actionForm);
        setActionSavedAt(new Date().toISOString());
      }
    }, 400);
    return () => clearTimeout(t);
  }, [actionForm, actionBase, editingId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (newAction.trim()) saveDraft(newKey, { text: newAction });
      else clearDraft(newKey);
    }, 400);
    return () => clearTimeout(t);
  }, [newAction, newKey]);

  // Tutup popup hanya langsung kalau tidak ada perubahan; kalau ada, tanya dulu
  const requestClose = () => {
    if (dirty) setConfirming(true);
    else onClose();
  };

  // Escape = sama dengan tombol Tutup
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, onClose]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Mengembalikan true kalau berhasil; gagal = pesan error, popup tetap terbuka
  const run = async (fn, failMsg) => {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (err) {
      alert(`${failMsg}\n${err.message}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveMeeting = () =>
    run(async () => {
      const { deadline, ...fields } = form;
      // Deadline hanya dikirim kalau diubah; deadline semua action plan lalu ikut berubah
      const payload = deadline && deadline !== base.deadline ? { ...fields, deadline } : fields;
      await updateMeetingApi(meetingId, payload);
      markSaved();
      onClose();
    }, 'Notulensi belum tersimpan ke database.');

  // "Simpan lalu keluar" dari konfirmasi: simpan action yang sedang diedit, lalu notulensi
  const saveAndExit = async () => {
    if (editingId !== null && !(await saveAction(editingId))) return;
    if (meetingDirty) await saveMeeting();
    else onClose();
  };

  // Keluar sambil membuang semua draft yang terkait popup ini
  const discardAndExit = () => {
    discardDraft();
    if (editingId !== null) clearDraft(actionDraftKey(editingId));
    clearDraft(newKey);
    setEditingId(null);
    onClose();
  };

  // Buang draft: semua draft popup ini dihapus dan popup ditutup
  const discardMeetingDraft = () => {
    if (!confirm('Buang draft isi notulensi ini? Isian yang belum disimpan ke database akan hilang.')) return;
    discardAndExit();
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const removeMeeting = () => {
    if (!confirm(`Hapus notulensi ini beserta ${group.items.length} action plan-nya?`)) return;
    run(async () => {
      await deleteMeetingApi(meetingId);
      onRemoved();
    }, 'Gagal menghapus notulensi.');
  };

  const toggleClear = (item) =>
    run(() => setSupportClearApi(item.id, !item.supportClear), 'Centang belum tersimpan ke database.');

  // Membuka edit: kalau ada draft yang belum disimpan untuk action ini, isinya dipulihkan
  const startEdit = (item) => {
    const base = actionValuesOf(item);
    const stored = loadDraft(actionDraftKey(item.id));
    const restore = !!stored?.value && !isSameValues(stored.value, base);
    setActionBase(base);
    setActionForm(restore ? { ...base, ...stored.value } : base);
    setActionRestored(restore);
    setActionSavedAt(restore ? stored.savedAt : null);
    setEditingId(item.id);
  };

  // Batal = tutup editor dan buang draft-nya (konfirmasi dulu kalau ada isian yang berubah)
  const cancelEdit = () => {
    if (editingId === null) return;
    if (!isSameValues(actionForm, actionBase) && !confirm('Batalkan edit action plan ini? Draft yang belum disimpan akan dibuang.')) return;
    clearDraft(actionDraftKey(editingId));
    setActionRestored(false);
    setEditingId(null);
  };

  const discardActionDraft = () => {
    if (!confirm('Buang draft action plan ini? Isian yang belum disimpan ke database akan hilang.')) return;
    clearDraft(actionDraftKey(editingId));
    setActionForm(actionBase);
    setActionRestored(false);
    setActionSavedAt(null);
  };

  const saveAction = (id) =>
    run(async () => {
      await updateActionApi(id, actionForm);
      clearDraft(actionDraftKey(id));
      setEditingId(null);
    }, 'Action plan belum tersimpan ke database.');

  const removeAction = (item) => {
    if (!confirm('Hapus action plan ini?')) return;
    run(() => deleteActionApi(item.id), 'Gagal menghapus action plan.');
  };

  const addAction = () => {
    const text = newAction.trim();
    if (!text) return;
    run(async () => {
      await addMeetingActionApi(meetingId, { actionPlan: text });
      setNewAction('');
    }, 'Action plan belum tersimpan ke database.');
  };

  const items = group.items;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <span className="size-10 shrink-0 rounded-lg bg-slate-800 text-white text-sm font-bold flex items-center justify-center">
              {form.no || '-'}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-base leading-snug break-words">{form.mainTopic || 'Notulensi'}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {form.agenda} · {form.tgl} · {items.length} action plan
              </p>
            </div>
          </div>
          <button type="button" onClick={requestClose} title="Tutup" className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Isi notulensi */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Isi notulensi</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['no', 'NO rapat'],
                ['tgl', 'Tanggal'],
                ['agenda', 'Agenda'],
                ['mainTopic', 'Main topic'],
                ['unitTelda', 'Unit / Telda']
              ].map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="font-semibold text-slate-600">{label}</span>
                  {key === 'no' ? (
                    <input type="text" value={form[key] ?? ''} readOnly className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} title="NO rapat dibuat otomatis oleh sistem" />
                  ) : (
                    <input type="text" value={form[key] ?? ''} onChange={setField(key)} disabled={!canManage} className={inputCls} />
                  )}
                </label>
              ))}
              <div className="block text-xs">
                <span className="font-semibold text-slate-600">Deadline (semua action plan)</span>
                <div className="mt-1">
                  <DeadlineInput
                    id={`notulensi-deadline-${meetingId}`}
                    value={form.deadline ?? ''}
                    onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
                  />
                </div>
                <span className="text-[11px] text-slate-400">
                  Mengubah ini juga mengubah deadline semua action plan di notulensi ini.
                </span>
              </div>
              <label className="block text-xs sm:col-span-2">
                <span className="font-semibold text-slate-600">Peserta</span>
                <textarea rows={2} value={form.peserta ?? ''} onChange={setField('peserta')} disabled={!canManage} className={inputCls} />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="font-semibold text-slate-600">Pembahasan</span>
                <textarea rows={4} value={form.pembahasan ?? ''} onChange={setField('pembahasan')} disabled={!canManage} className={inputCls} />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="font-semibold text-slate-600">Notulen</span>
                <textarea rows={4} value={form.pembahasanNotulen ?? ''} onChange={setField('pembahasanNotulen')} disabled={!canManage} className={inputCls} />
              </label>
            </div>
          </div>

          {/* Action plan */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
              Action plan ({items.length})
            </h4>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!item.supportClear}
                      disabled={!canManage || busy}
                      onChange={() => toggleClear(item)}
                      title="Centang jika support needed sudah clear"
                      aria-label="Support needed sudah clear"
                      className="mt-1 size-4 shrink-0 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-medium leading-relaxed break-words ${item.supportClear ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        <RichText text={item.actionPlan} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-slate-700">UIC: {item.uic}</span>
                        {item.destinasiFu && item.destinasiFu !== '-' && (
                          <span className="text-blue-600 font-medium">&rarr; {item.destinasiFu}</span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium whitespace-nowrap">{item.deadline}</span>
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${STATUS_TONE[item.status] ?? STATUS_TONE['BELUM FU']}`}>
                          {item.status}
                        </span>
                      </div>
                      {item.supportNeeded && item.supportNeeded !== '-' && (
                        <div className={`mt-2 p-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-line break-words ${item.supportClear ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-800' : 'bg-rose-50/80 border border-rose-200/80 text-rose-900'}`}>
                          <span className="font-bold">{item.supportClear ? 'Support clear: ' : 'Support needed: '}</span>
                          {plainSupportText(item.supportNeeded)}
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => startEdit(item)} title="Edit action plan ini" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 cursor-pointer">
                          <Pencil size={13} />
                        </button>
                        <button type="button" onClick={() => removeAction(item)} title="Hapus action plan ini" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === item.id && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      {actionRestored && (
                        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-900">
                          <span>Draft yang belum disimpan dari browser ini dipulihkan.</span>
                          <button type="button" onClick={discardActionDraft} className="font-semibold text-rose-600 hover:underline cursor-pointer">
                            Buang draft
                          </button>
                        </div>
                      )}
                      <p className="sm:col-span-2 -mb-1 text-[11px] text-slate-500">
                        {isSameValues(actionForm, actionBase)
                          ? 'Isian disimpan otomatis sebagai draft saat kamu berhenti mengetik.'
                          : `Belum disimpan ke database · draft tersimpan otomatis${actionSavedAt ? ` ${formatTime(actionSavedAt)}` : ''}`}
                      </p>
                      <label className="block text-xs sm:col-span-2">
                        <span className="font-semibold text-slate-600">Rencana aksi</span>
                        <textarea rows={2} value={actionForm.actionPlan ?? ''} onChange={(e) => setActionForm((f) => ({ ...f, actionPlan: e.target.value }))} className={inputCls} />
                      </label>
                      <label className="block text-xs">
                        <span className="font-semibold text-slate-600">UIC</span>
                        <input type="text" value={actionForm.uic ?? ''} onChange={(e) => setActionForm((f) => ({ ...f, uic: e.target.value }))} className={inputCls} />
                      </label>
                      <label className="block text-xs">
                        <span className="font-semibold text-slate-600">Destinasi FU</span>
                        <input type="text" value={actionForm.destinasiFu ?? ''} onChange={(e) => setActionForm((f) => ({ ...f, destinasiFu: e.target.value }))} className={inputCls} />
                      </label>
                      <label className="block text-xs sm:col-span-2">
                        <span className="font-semibold text-slate-600">Support needed</span>
                        <textarea rows={2} value={actionForm.supportNeeded ?? ''} onChange={(e) => setActionForm((f) => ({ ...f, supportNeeded: e.target.value }))} className={inputCls} />
                      </label>
                      <div className="block text-xs">
                        <span className="font-semibold text-slate-600">Deadline</span>
                        <div className="mt-1">
                          <DeadlineInput id={`action-deadline-${item.id}`} value={actionForm.deadline ?? ''} onChange={(v) => setActionForm((f) => ({ ...f, deadline: v }))} />
                        </div>
                      </div>
                      <label className="block text-xs">
                        <span className="font-semibold text-slate-600">Status</span>
                        <select value={actionForm.status ?? 'BELUM FU'} onChange={(e) => setActionForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs sm:col-span-2">
                        <span className="font-semibold text-slate-600">Catatan</span>
                        <textarea rows={2} value={actionForm.notes ?? ''} onChange={(e) => setActionForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
                      </label>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-white cursor-pointer">
                          Batal
                        </button>
                        <button type="button" disabled={busy} onClick={() => saveAction(item.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer disabled:opacity-50">
                          <Check size={12} className="inline -mt-0.5 mr-1" />
                          Simpan action
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {canManage && (
              <form
                className="mt-3 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addAction();
                }}
              >
                <Plus size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder="Tulis action plan baru lalu Enter…"
                  className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
                />
                <button type="submit" disabled={busy || !newAction.trim()} className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer disabled:opacity-40">
                  Tambah
                </button>
              </form>
            )}
          </div>
        </div>

        {dirty && (
          <div className="px-6 pt-2 text-[11px] text-amber-700 font-semibold">
            Belum disimpan ke database · draft tersimpan otomatis{savedAt ? ` ${formatTime(savedAt)}` : ''}
          </div>
        )}
        {restored && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 mt-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-900">
            <span>Draft yang belum disimpan dari browser ini dipulihkan.</span>
            <button type="button" onClick={discardMeetingDraft} className="font-semibold text-rose-600 hover:underline cursor-pointer">
              Buang draft
            </button>
          </div>
        )}
        {confirming && (
          <UnsavedChangesBar onStay={() => setConfirming(false)} onSave={saveAndExit} onDiscard={discardAndExit} busy={busy} />
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          {canManage ? (
            <button type="button" onClick={removeMeeting} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer disabled:opacity-40">
              <Trash2 size={13} />
              Hapus notulensi
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={requestClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer">
              Tutup
            </button>
            {canManage && (
              <button type="button" onClick={saveMeeting} disabled={busy} className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50">
                <Check size={14} />
                Simpan notulensi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
