import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Plus, Trash2, X } from 'lucide-react';

// Pilihan agenda sesuai filter "TYPE OF AGENDA" di dashboard Witel sebelumnya.
export const AGENDA_OPTIONS = [
  '1 ON 1 UNIT',
  '1 ON 1 WITEL',
  'EVP DIRECTION',
  'WBR 04 MAR',
  'WBR 11 FEB',
  'WBR 17 FEB',
  'WBR 18 JUNI',
  'WBR 18 MAR',
  'WBR 19 MEI',
  'WBR 22 Jul',
  'WBR 23 JUNI',
  'WBR 25 FEB',
  'WBR 26 MEI',
  'WBR 6 MEI'
];

export const UNIT_OPTIONS = [
  'PRQ',
  'BS',
  'GS',
  'SSGS',
  'TELDA SOLO',
  'TELDA SRAGEN',
  'TELDA KUDUS',
  'TELDA PATI',
  'TELDA PURWODADI',
  'ALL UNIT WITEL SOLO JATENG TIMUR'
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
export default function SupportFormModal({ onClose, onSave, nextNo = '' }) {
  const [meta, setMeta] = useState({
    tglIso: todayIso(),
    agenda: '',
    mainTopic: '',
    units: [],
    peserta: '',
    pembahasan: ''
  });
  const [items, setItems] = useState([emptyItem()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, saving]);

  const setM = (field) => (e) => setMeta((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleUnit = (unit) =>
    setMeta((prev) => ({
      ...prev,
      units: prev.units.includes(unit) ? prev.units.filter((u) => u !== unit) : [...prev.units, unit]
    }));

  const setItem = (idx, field) => (e) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: e.target.value } : it)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const required = [
      [!meta.tglIso, 'Tanggal rapat wajib diisi.'],
      [!meta.agenda, 'Agenda wajib dipilih.'],
      [!meta.mainTopic.trim(), 'Main topic wajib diisi.'],
      [items.some((it) => !it.actionPlan.trim()) , 'Setiap poin action plan wajib diisi.']
    ];
    const failed = required.find(([bad]) => bad);
    if (failed) {
      setError(failed[1]);
      return;
    }

    const payload = {
      meeting: {
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
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data.');
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-[#0B1E48] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-white/10 grid place-items-center">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Tambah Rapat &amp; Action Plan</h3>
              <p className="text-xs text-white/70">Satu pembahasan bisa memiliki banyak action plan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-white/70 hover:text-white p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Data rapat */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls} htmlFor="sf-no">NO Rapat</label>
              <input id="sf-no" type="text" value={nextNo} readOnly className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} title="Dibuat otomatis" />
            </div>
            <div>
              <label className={labelCls} htmlFor="sf-tgl">Tanggal *</label>
              <input id="sf-tgl" type="date" value={meta.tglIso} onChange={setM('tglIso')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="sf-agenda">Agenda *</label>
              <select id="sf-agenda" value={meta.agenda} onChange={setM('agenda')} className={`${inputCls} cursor-pointer`}>
                <option value="">— Pilih agenda —</option>
                {AGENDA_OPTIONS.map((ag) => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className={labelCls} htmlFor="sf-topic">Main Topic *</label>
              <input id="sf-topic" type="text" value={meta.mainTopic} onChange={setM('mainTopic')} className={inputCls} placeholder="Topik utama rapat" />
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
            <textarea
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
                  <textarea
                    id={`sf-action-${idx}`}
                    rows={2}
                    value={it.actionPlan}
                    onChange={setItem(idx, 'actionPlan')}
                    className={textareaCls}
                    placeholder="Tuliskan butir rencana aksi..."
                  />
                </div>
                <div>
                  <label className={`${labelCls} text-rose-600`} htmlFor={`sf-support-${idx}`}>Support Needed</label>
                  <textarea
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
                    <input id={`sf-uic-${idx}`} type="text" value={it.uic} onChange={setItem(idx, 'uic')} className={inputCls} placeholder="e.g. BS, PRQ" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`sf-dest-${idx}`}>Destinasi FU</label>
                    <input id={`sf-dest-${idx}`} type="text" value={it.destinasiFu} onChange={setItem(idx, 'destinasiFu')} className={inputCls} placeholder="e.g. SSGS" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`sf-deadline-${idx}`}>Deadline</label>
                    <input id={`sf-deadline-${idx}`} type="text" value={it.deadline} onChange={setItem(idx, 'deadline')} className={inputCls} placeholder="e.g. W3 Nov 2026" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`sf-status-${idx}`}>Status</label>
                    <select id={`sf-status-${idx}`} value={it.status} onChange={setItem(idx, 'status')} className={`${inputCls} font-bold cursor-pointer`}>
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls} htmlFor={`sf-notes-${idx}`}>Notes to Follow Up / No. NDE</label>
                  <textarea
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
          <span className="text-[11px] text-slate-500">Field bertanda * wajib diisi.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
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
      </form>
    </div>,
    document.body
  );
}
