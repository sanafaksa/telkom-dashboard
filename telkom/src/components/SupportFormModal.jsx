import { RichTextarea } from './RichText';
import { DESTINASI_OPTIONS, DeadlineInput, StatusSelect, UicMultiSelect } from './FormFields';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, Check, Plus, Trash2, X } from 'lucide-react';
import { clearDraft, loadDraft, saveDraft } from '../lib/draft';

const DRAFT_KEY = 'mom-support-form';

// Draft dianggap ada jika ada isian selain nilai default
const hasDraftContent = (meta, items) =>
  !!(
    meta.agenda ||
    meta.mainTopic.trim() ||
    meta.units.length ||
    meta.peserta.trim() ||
    meta.pembahasan.trim() ||
    items.some(
      (it) =>
        it.actionPlan.trim() ||
        it.supportNeeded.trim() ||
        it.uic.trim() ||
        it.destinasiFu.trim() ||
        it.deadline.trim() ||
        it.notes.trim() ||
        it.status !== 'BELUM FU'
    )
  );

// Pilihan agenda sesuai filter "TYPE OF AGENDA" di dashboard Witel sebelumnya.
export const AGENDA_OPTIONS = ['RAPAT WITEL', 'RAPAT UNIT', 'RAPAT EKSTERNAL'];

const ALL_UNIT = 'ALL UNIT WITEL SOLO JATENG TIMUR';

export const UNIT_OPTIONS = [
  ALL_UNIT,
  'PRQ',
  'BS',
  'GS',
  'SSGS',
  'LESA',
  'TELDA SRAGEN',
  'TELDA KUDUS',
  'TELDA PATI',
  'TELDA PURWODADI'
];

const STATUS_OPTIONS = [
  { value: 'BELUM FU', label: 'BELUM FU (Open)' },
  { value: 'IN PROGRESS', label: 'IN PROGRESS (Dalam Proses)' },
  { value: 'NEED DISCUSS', label: 'NEED DISCUSS (Butuh Diskusi)' },
  { value: 'DONE', label: 'DONE (Selesai)' }
];

const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const DEFAULT_META = {
  tglIso: todayIso(),
  agenda: '',
  mainTopic: '',
  units: [],
  peserta: '',
  pembahasan: ''
};

// <input type="date"> memakai YYYY-MM-DD, sedangkan Notulensi Tracker memakai DD/MM/YYYY.
const isoToDmy = (iso) => {
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};

const emptyItem = () => ({
  actionPlan: '',
  supportNeeded: '',
  uic: '',
  destinasiFu: '',
  deadline: '',
  status: 'BELUM FU',
  notes: ''
});

const labelCls = 'text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5';
const inputCls =
  'w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none';
const textareaCls = `${inputCls} leading-relaxed`;

/**
 * Form satu rapat: 1 PEMBAHASAN -> banyak butir Action Plan (sejajar dengan SN, UIC,
 * Destinasi FU, Deadline, Status, Notes). NO rapat dikunci dan dibuat otomatis.
 *
 * onSave({ meeting, items }) harus mengembalikan Promise; error yang dilempar ditampilkan di form.
 */
/**
 * prefill (opsional): { no, meta } untuk menambah action plan baru ke rapat yang sudah ada.
 * Mode prefill tidak memakai draft, supaya draft input manual yang belum disimpan tidak tertimpa.
 */
// Field wajib yang belum terisi (dipakai untuk popup dan highlight field)
function collectMissing(meta, items) {
  const out = [];
  if (!meta.tglIso) out.push({ key: 'tgl', label: 'Tanggal rapat' });
  if (!meta.agenda) out.push({ key: 'agenda', label: 'Agenda' });
  if (!meta.mainTopic.trim()) out.push({ key: 'mainTopic', label: 'Main topic' });
  items.forEach((it, i) => {
    if (!it.actionPlan.trim()) {
      out.push({ key: `action-${i}`, label: items.length > 1 ? `Action Plan #${i + 1}` : 'Action Plan' });
    }
  });
  return out;
}

// Nama field dari server (mis. "items.1.actionPlan") menjadi label yang dipahami pengguna
function serverFieldLabel(field) {
  const item = field.match(/^items\.(\d+)\.(\w+)$/);
  if (item) {
    const n = Number(item[1]) + 1;
    const names = { actionPlan: 'Action Plan', supportNeeded: 'Support Needed', uic: 'UIC', destinasiFu: 'Destinasi FU', deadline: 'Deadline', status: 'Status', notes: 'Notes' };
    return `${names[item[2]] ?? item[2]} #${n}`;
  }
  const names = {
    tgl: 'Tanggal rapat',
    agenda: 'Agenda',
    mainTopic: 'Main topic',
    unitTelda: 'Unit / Telda',
    peserta: 'Peserta rapat',
    pembahasan: 'Pembahasan',
    items: 'Action plan'
  };
  return names[field] ?? field;
}

const RING_INVALID = 'ring-2 ring-rose-400 bg-rose-50/40';

// Popup yang menjelaskan kenapa data belum bisa disimpan
function ProblemDialog({ title, items, onClose }) {
  return (
    <div
      className="absolute inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/50 rounded-3xl"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sf-problem-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border animate-[fadeIn_0.2s_ease-out] border-rose-200"
      >
        <div className="flex items-start gap-3">
          <div className="size-10 shrink-0 rounded-xl bg-rose-100 text-rose-600 grid place-items-center">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1">
            <h4 id="sf-problem-title" className="font-extrabold text-sm text-slate-900">{title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Lengkapi hal berikut, lalu tekan Simpan lagi:</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((msg, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-700 bg-rose-50/60 border border-rose-100 rounded-lg px-3 py-2">
              <span className="font-bold text-rose-500">{i + 1}.</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-4 w-full py-2.5 rounded-xl bg-[#1447B8] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
        >
          Oke, saya lengkapi
        </button>
      </div>
    </div>
  );
}

// Dialog konfirmasi dua langkah sebelum keluar saat masih ada draft
function ConfirmDialog({ title, body, confirmLabel, cancelLabel, tone, onConfirm, onCancel }) {
  const confirmCls = tone === 'rose' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#1447B8] hover:bg-blue-700';
  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/50 rounded-3xl">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sf-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border animate-[fadeIn_0.2s_ease-out] border-amber-200"
      >
        <div className="flex items-start gap-3">
          <div className="size-10 shrink-0 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 id="sf-confirm-title" className="font-extrabold text-sm text-slate-900">{title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupportFormModal({ onClose, onSave, nextNo = '', prefill = null }) {
  const isPrefilled = !!prefill;
  const displayNo = prefill?.no || nextNo;

  // Draft otomatis: isian dipulihkan dari localStorage, dan tersimpan setiap kali berubah
  const [initialDraft] = useState(() => (isPrefilled ? null : loadDraft(DRAFT_KEY)));
  const [showRestored, setShowRestored] = useState(!!initialDraft);
  const [meta, setMeta] = useState(() => {
    if (isPrefilled) return prefill.meta;
    const saved = initialDraft?.value?.meta;
    // Draft lama mungkin masih memuat unit yang sudah dihapus dari pilihan
    return saved ? { ...saved, units: (saved.units ?? []).filter((u) => UNIT_OPTIONS.includes(u)) } : DEFAULT_META;
  });
  const [items, setItems] = useState(() => initialDraft?.value?.items ?? [emptyItem()]);
  const [problems, setProblems] = useState(null); // { title, items } untuk popup
  const [showMissing, setShowMissing] = useState(false); // aktif setelah Simpan ditekan: field kosong di-highlight
  const missing = showMissing ? collectMissing(meta, items) : [];
  const isMissing = (key) => missing.some((m) => m.key === key);
  const [saving, setSaving] = useState(false);

  // Autosave: 800 ms setelah berhenti mengetik. Draft juga disimpan saat modal ditutup / unmount.
  const [savedAt, setSavedAt] = useState(initialDraft?.savedAt ?? null);
  const latest = useRef({ meta, items });
  latest.current = { meta, items };
  const submittedRef = useRef(false);
  const timerRef = useRef(null);

  // Setelah "Buang draft", draft tidak boleh ditulis ulang (termasuk saat unmount)
  const discardedRef = useRef(false);

  const persist = () => {
    if (submittedRef.current || isPrefilled || discardedRef.current) return false;
    const { meta: m, items: its } = latest.current;
    if (!hasDraftContent(m, its)) {
      clearDraft(DRAFT_KEY);
      return false;
    }
    saveDraft(DRAFT_KEY, { meta: m, items: its });
    return true;
  };

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (persist()) setSavedAt(new Date().toISOString());
    }, 800);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, items]);

  useEffect(() => () => persist(), []);

  // Buang draft: draft dihapus dari browser dan form ditutup (tidak ditulis ulang saat unmount)
  const discardDraft = () => {
    if (!confirm('Buang draft ini? Isian yang belum disimpan ke database akan hilang.')) return;
    discardedRef.current = true;
    clearTimeout(timerRef.current);
    clearDraft(DRAFT_KEY);
    onClose();
  };

  // Keluar dari form: kalau masih ada draft yang belum disimpan, minta konfirmasi dua langkah
  const hasUnsaved = !submittedRef.current && hasDraftContent(meta, items);
  const [closeStep, setCloseStep] = useState(0); // 0 = tidak ada dialog, 1 & 2 = langkah konfirmasi
  const [leaveWarn, setLeaveWarn] = useState(false); // peringatan singkat saat klik di luar form

  const requestClose = () => {
    if (saving) return;
    if (!hasUnsaved) onClose();
    else setCloseStep(1);
  };

  useEffect(() => {
    if (!leaveWarn) return undefined;
    const t = setTimeout(() => setLeaveWarn(false), 4000);
    return () => clearTimeout(t);
  }, [leaveWarn]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || saving) return;
      if (closeStep > 0) setCloseStep(0);
      else if (hasUnsaved) setCloseStep(1);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, saving, hasUnsaved, closeStep]);

  const setM = (field) => (e) => setMeta((prev) => ({ ...prev, [field]: e.target.value }));

  // ALL UNIT: centang = pilih semua unit; hapus salah satu unit = ALL ikut tidak tercentang
  const toggleUnit = (unit) =>
    setMeta((prev) => {
      const others = UNIT_OPTIONS.filter((u) => u !== ALL_UNIT);
      let next;
      if (unit === ALL_UNIT) {
        const allSelected = prev.units.length === UNIT_OPTIONS.length;
        next = allSelected ? [] : [...UNIT_OPTIONS];
      } else {
        const toggled = prev.units.includes(unit)
          ? prev.units.filter((u) => u !== unit)
          : [...prev.units, unit];
        const everyOtherSelected = others.every((u) => toggled.includes(u));
        next = everyOtherSelected
          ? [...others, ALL_UNIT]
          : toggled.filter((u) => u !== ALL_UNIT);
      }
      return { ...prev, units: next };
    });

  // Setter untuk komponen yang mengirim nilai mentah (UIC, deadline, status)
  const setItemVal = (idx, field) => (v) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: v } : it)));

  const setItem = (idx, field) => (e) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: e.target.value } : it)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // Enter di Action Plan = tambah poin baru dan fokus pindah ke sana. Shift+Enter = baris baru di dalam poin.
  const actionRefs = useRef([]);
  const [focusIdx, setFocusIdx] = useState(null);
  useEffect(() => {
    if (focusIdx === null) return;
    actionRefs.current[focusIdx]?.focus();
    setFocusIdx(null);
  }, [focusIdx, items.length]);

  const onActionKeyDown = (idx) => (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (!items[idx].actionPlan.trim()) return; // poin kosong tidak menambah poin baru
    setItems((prev) => [...prev, emptyItem()]);
    setFocusIdx(items.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missingNow = collectMissing(meta, items);
    if (missingNow.length) {
      setShowMissing(true);
      setProblems({
        title: `${missingNow.length} field belum diisi`,
        items: missingNow.map((m) => `${m.label} wajib diisi.`)
      });
      return;
    }

    const payload = {
      meeting: {
        // NO rapat dikunci: dikirim hanya untuk menambah butir ke notulensi yang sudah ada; selain itu sistem membuat nomor
        no: prefill?.no || '',
        tgl: isoToDmy(meta.tglIso),
        agenda: meta.agenda,
        mainTopic: meta.mainTopic.trim(),
        unitTelda: meta.units.join(', '),
        peserta: meta.peserta.trim(),
        pembahasan: meta.pembahasan.trim()
      },
      items: items.map((it) => ({
        actionPlan: it.actionPlan.trim(),
        supportNeeded: it.supportNeeded.trim(),
        uic: it.uic.trim(),
        destinasiFu: it.destinasiFu.trim(),
        deadline: it.deadline.trim(),
        status: it.status,
        notes: it.notes.trim()
      }))
    };

    setSaving(true);
    try {
      await onSave(payload);
      submittedRef.current = true; // rapat sudah tersimpan: jangan simpan ulang sebagai draft saat modal ditutup
      clearTimeout(timerRef.current);
      clearDraft(DRAFT_KEY);
    } catch (err) {
      const list = err.serverErrors?.length
        ? err.serverErrors.map((s) => `${serverFieldLabel(s.field)}: ${s.message}`)
        : [err.message || 'Gagal menyimpan data.'];
      setProblems({ title: 'Data belum bisa disimpan', items: list });
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target !== e.currentTarget || saving) return;
        // Klik di luar form: kalau ada draft, jangan tutup — tampilkan peringatan saja
        if (hasUnsaved) setLeaveWarn(true);
        else onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-[fadeIn_0.2s_ease-out]"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-blue-50 text-[#1447B8] grid place-items-center">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Tambah Rapat &amp; Action Plan</h3>
              <p className="text-xs text-slate-500">Satu pembahasan bisa memiliki banyak action plan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {showRestored && initialDraft && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
              <span>
                Draft dipulihkan
                {initialDraft.savedAt ? ` (disimpan ${new Date(initialDraft.savedAt).toLocaleString('id-ID')})` : ''}.
              </span>
              <button type="button" onClick={discardDraft} className="font-bold underline cursor-pointer shrink-0">
                Buang draft
              </button>
            </div>
          )}

          {/* Data rapat */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls} htmlFor="sf-no">NO Rapat</label>
              <input id="sf-no" type="text" value={displayNo} readOnly className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} title="Dibuat otomatis oleh sistem" />
            </div>
            <div>
              <label className={labelCls} htmlFor="sf-tgl">Tanggal *</label>
              <input id="sf-tgl" type="date" value={meta.tglIso} onChange={setM('tglIso')} className={`${inputCls} ${isMissing('tgl') ? RING_INVALID : ''}`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="sf-agenda">Agenda *</label>
              <select id="sf-agenda" value={meta.agenda} onChange={setM('agenda')} className={`${inputCls} cursor-pointer ${isMissing('agenda') ? RING_INVALID : ''}`}>
                <option value="">— Pilih agenda —</option>
                {AGENDA_OPTIONS.map((ag) => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className={labelCls} htmlFor="sf-topic">Main Topic *</label>
              <input id="sf-topic" type="text" value={meta.mainTopic} onChange={setM('mainTopic')} className={`${inputCls} ${isMissing('mainTopic') ? RING_INVALID : ''}`} placeholder="Topik utama rapat" />
            </div>
            <div className="sm:col-span-4">
              <span className={labelCls}>Unit / Telda</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {UNIT_OPTIONS.map((u) => (
                  <label key={u} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={meta.units.includes(u)}
                      onChange={() => toggleUnit(u)}
                      className="accent-blue-600"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">{u}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className={labelCls} htmlFor="sf-peserta">Peserta Rapat</label>
              <input
                id="sf-peserta"
                type="text"
                value={meta.peserta}
                onChange={setM('peserta')}
                className={inputCls}
                placeholder="Misal: GM WITEL, PRQ (3), SSGS (3), BS (3)..."
              />
            </div>
          </div>

          {/* Pembahasan (satu box) */}
          <div>
            <label className={labelCls} htmlFor="sf-pembahasan">Pembahasan (Notulen)</label>
            <RichTextarea
              id="sf-pembahasan"
              rows={4}
              value={meta.pembahasan}
              onChange={setM('pembahasan')}
              className={textareaCls}
              placeholder="Notulen rapat secara lengkap..."
            />
          </div>

          {/* Butir action plan */}
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                    Action Plan #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} /> Hapus poin
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelCls} htmlFor={`sf-action-${idx}`}>Action Plan *</label>
                  <RichTextarea
                    id={`sf-action-${idx}`}
                    ref={(el) => {
                      actionRefs.current[idx] = el;
                    }}
                    rows={2}
                    value={it.actionPlan}
                    onChange={setItem(idx, 'actionPlan')}
                    onKeyDown={onActionKeyDown(idx)}
                    className={`${textareaCls} ${isMissing(`action-${idx}`) ? RING_INVALID : ''}`}
                    placeholder="Tuliskan butir rencana aksi..."
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Tips: tekan <kbd className="px-1 rounded bg-slate-100 border border-slate-300 font-mono">Enter</kbd> untuk
                    menambah action plan baru, atau <kbd className="px-1 rounded bg-slate-100 border border-slate-300 font-mono">Shift+Enter</kbd>{' '}
                    untuk membuat baris baru di dalam poin ini.
                  </p>
                </div>
                <div>
                  <label className={`${labelCls} text-rose-600`} htmlFor={`sf-support-${idx}`}>Support Needed</label>
                  <RichTextarea
                    id={`sf-support-${idx}`}
                    rows={2}
                    value={it.supportNeeded}
                    onChange={setItem(idx, 'supportNeeded')}
                    className={`${textareaCls} bg-rose-50/60 border-rose-200`}
                    placeholder="Kosongkan jika tidak ada..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls} htmlFor={`sf-uic-${idx}`}>UIC (PIC)</label>
                    <UicMultiSelect id={`sf-uic-${idx}`} value={it.uic} onChange={setItemVal(idx, 'uic')} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`sf-dest-${idx}`}>Destinasi FU</label>
                    <UicMultiSelect id={`sf-dest-${idx}`} value={it.destinasiFu} onChange={setItemVal(idx, 'destinasiFu')} options={DESTINASI_OPTIONS} placeholder="Pilih destinasi FU" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`sf-deadline-${idx}`}>Deadline</label>
                    <DeadlineInput id={`sf-deadline-${idx}`} value={it.deadline} onChange={setItemVal(idx, 'deadline')} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`sf-status-${idx}`}>Status</label>
                    <StatusSelect id={`sf-status-${idx}`} value={it.status} onChange={setItemVal(idx, 'status')} options={STATUS_OPTIONS} />
                  </div>
                </div>

                <div>
                  <label className={labelCls} htmlFor={`sf-notes-${idx}`}>Notes to Follow Up / No. NDE</label>
                  <RichTextarea
                    id={`sf-notes-${idx}`}
                    rows={2}
                    value={it.notes}
                    onChange={setItem(idx, 'notes')}
                    className={`${textareaCls} font-mono text-[11px]`}
                    placeholder="Nomor NDE, tanggal pengajuan, catatan tindak lanjut..."
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-700 text-xs font-bold hover:bg-blue-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Tambah poin action plan
            </button>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Field bertanda * wajib diisi.{' '}
            {savedAt
              ? `Draft tersimpan otomatis ${new Date(savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`
              : 'Isian disimpan otomatis sebagai draft saat kamu berhenti mengetik.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors disabled:opacity-40"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1447B8] hover:bg-blue-700 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
            >
              <Check size={14} />
              {saving ? 'Menyimpan...' : `Simpan Rapat (${items.length} poin)`}
            </button>
          </div>
        </div>
        {problems && (
          <ProblemDialog title={problems.title} items={problems.items} onClose={() => setProblems(null)} />
        )}
        {closeStep === 1 && (
          <ConfirmDialog
            title="Tutup form ini?"
            body="Rapat ini belum disimpan ke database. Isiannya tetap tersimpan sebagai draft di browser ini dan bisa dilanjutkan nanti."
            confirmLabel="Tutup form"
            cancelLabel="Tetap di form"
            tone="amber"
            onConfirm={onClose}
            onCancel={() => setCloseStep(0)}
          />
        )}
      </form>
      {leaveWarn && (
        <div
          role="status"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[10001] w-[calc(100%-2rem)] max-w-sm flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xl text-xs"
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-bold">Draft belum disimpan</p>
            <p className="mt-0.5 leading-relaxed">
              Form tidak ditutup karena klik di luar. Pakai tombol Batal atau X untuk keluar.
            </p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
