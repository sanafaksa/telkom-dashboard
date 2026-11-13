import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Plus, X } from 'lucide-react';

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

const EMPTY_FORM = {
  no: '',
  tglIso: todayIso(),
  agenda: '',
  mainTopic: '',
  unitTelda: 'PRQ',
  peserta: '',
  pembahasan: '',
  pembahasanNotulen: '',
  actionPlan: '',
  uic: '',
  destinasiFu: '',
  supportNeeded: '',
  deadline: '',
  status: 'BELUM FU',
  notes: ''
};

const labelCls = 'text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5';
const inputCls =
  'w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none';
const textareaCls = `${inputCls} leading-relaxed`;

/**
 * Form input manual satu butir Action Plan & Support Needed.
 * Kolom mengikuti Notulensi Tracker: NO, TGL, AGENDA, MAIN TOPIC, UNIT/TELDA, PESERTA,
 * PEMBAHASAN, PEMBAHASAN (NOTULEN), ACTION PLAN, UIC, DESTINASI FU, SUPPORT NEEDED,
 * DEADLINE, STATUS, NOTES TO FOLLOW UP.
 *
 * onSave(payload) harus mengembalikan Promise; error yang dilempar akan ditampilkan di form.
 */
export default function SupportFormModal({ onClose, onSave, defaultNo = '', agendaOptions = [] }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, no: defaultNo });
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

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const required = [
      ['tglIso', 'Tanggal rapat'],
      ['agenda', 'Agenda'],
      ['mainTopic', 'Main topic'],
      ['actionPlan', 'Action plan']
    ];
    const missing = required.find(([key]) => !String(form[key] ?? '').trim());
    if (missing) {
      setError(`${missing[1]} wajib diisi.`);
      return;
    }

    const payload = {
      no: String(form.no ?? '').trim(),
      tgl: isoToDmy(form.tglIso),
      agenda: form.agenda.trim(),
      mainTopic: form.mainTopic.trim(),
      unitTelda: form.unitTelda.trim(),
      peserta: form.peserta.trim(),
      pembahasan: form.pembahasan.trim(),
      pembahasanNotulen: form.pembahasanNotulen.trim(),
      actionPlan: form.actionPlan.trim(),
      uic: form.uic.trim(),
      destinasiFu: form.destinasiFu.trim(),
      supportNeeded: form.supportNeeded.trim(),
      deadline: form.deadline.trim(),
      status: form.status,
      notes: form.notes.trim()
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
              <h3 className="font-extrabold text-base leading-tight">Tambah Action Plan &amp; Support Needed</h3>
              <p className="text-xs text-white/70">Input manual, kolom sesuai Notulensi Tracker</p>
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

          {/* Rapat */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls} htmlFor="sf-no">NO Rapat</label>
              <input id="sf-no" type="text" value={form.no} onChange={set('no')} className={inputCls} placeholder="Otomatis" />
            </div>
            <div>
              <label className={labelCls} htmlFor="sf-tgl">Tanggal *</label>
              <input id="sf-tgl" type="date" value={form.tglIso} onChange={set('tglIso')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="sf-agenda">Agenda *</label>
              <input
                id="sf-agenda"
                type="text"
                list="sf-agenda-list"
                value={form.agenda}
                onChange={set('agenda')}
                className={inputCls}
                placeholder="e.g. FORUM WITEL"
              />
              <datalist id="sf-agenda-list">
                {agendaOptions.map((ag) => (
                  <option key={ag} value={ag} />
                ))}
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="sf-topic">Main Topic *</label>
              <input id="sf-topic" type="text" value={form.mainTopic} onChange={set('mainTopic')} className={inputCls} placeholder="Topik utama" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="sf-unit">Unit / Telda</label>
              <input id="sf-unit" type="text" value={form.unitTelda} onChange={set('unitTelda')} className={inputCls} placeholder="e.g. PRQ" />
            </div>
            <div className="sm:col-span-4">
              <label className={labelCls} htmlFor="sf-peserta">Peserta Rapat</label>
              <input
                id="sf-peserta"
                type="text"
                value={form.peserta}
                onChange={set('peserta')}
                className={inputCls}
                placeholder="Misal: GM WITEL, PRQ (3), SSGS (3), BS (3)..."
              />
            </div>
          </div>

          {/* Pembahasan */}
          <div>
            <label className={labelCls} htmlFor="sf-pembahasan">Pembahasan</label>
            <textarea id="sf-pembahasan" rows={3} value={form.pembahasan} onChange={set('pembahasan')} className={textareaCls} placeholder="Poin pembahasan rapat..." />
          </div>
          <div>
            <label className={labelCls} htmlFor="sf-notulen">Pembahasan (Notulen)</label>
            <textarea id="sf-notulen" rows={3} value={form.pembahasanNotulen} onChange={set('pembahasanNotulen')} className={textareaCls} placeholder="Notulen rapat secara lengkap..." />
          </div>

          {/* Action plan & support */}
          <div>
            <label className={labelCls} htmlFor="sf-action">Action Plan *</label>
            <textarea id="sf-action" rows={3} value={form.actionPlan} onChange={set('actionPlan')} className={`${textareaCls} bg-blue-50/50 border-blue-200`} placeholder="Tuliskan butir rencana aksi..." />
          </div>
          <div>
            <label className={`${labelCls} text-rose-600`} htmlFor="sf-support">Support Needed</label>
            <textarea id="sf-support" rows={2} value={form.supportNeeded} onChange={set('supportNeeded')} className={`${textareaCls} bg-rose-50/60 border-rose-200`} placeholder="Dukungan atau eskalasi yang dibutuhkan (kosongkan jika tidak ada)..." />
          </div>

          {/* PIC & target */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls} htmlFor="sf-uic">UIC (PIC)</label>
              <input id="sf-uic" type="text" value={form.uic} onChange={set('uic')} className={inputCls} placeholder="e.g. BS, PRQ" />
            </div>
            <div>
              <label className={labelCls} htmlFor="sf-dest">Destinasi FU</label>
              <input id="sf-dest" type="text" value={form.destinasiFu} onChange={set('destinasiFu')} className={inputCls} placeholder="e.g. SSGS" />
            </div>
            <div>
              <label className={labelCls} htmlFor="sf-deadline">Deadline</label>
              <input id="sf-deadline" type="text" value={form.deadline} onChange={set('deadline')} className={inputCls} placeholder="e.g. W3 Nov 2026" />
            </div>
            <div>
              <label className={labelCls} htmlFor="sf-status">Status</label>
              <select id="sf-status" value={form.status} onChange={set('status')} className={`${inputCls} font-bold cursor-pointer`}>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="sf-notes">Notes to Follow Up / No. NDE</label>
            <textarea id="sf-notes" rows={2} value={form.notes} onChange={set('notes')} className={`${textareaCls} font-mono text-[11px]`} placeholder="Nomor NDE, tanggal pengajuan, catatan tindak lanjut..." />
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Field bertanda * wajib diisi.
          </span>
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
              {saving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}
