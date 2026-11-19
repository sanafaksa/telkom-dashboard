import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { UicTreeMenu } from './UicTree';

/* ---------- Status (berwarna) ---------- */

export const STATUS_STYLE = {
  DONE: 'bg-emerald-50 border-emerald-400 text-emerald-700',
  'IN PROGRESS': 'bg-amber-50 border-amber-400 text-amber-700',
  'NEED DISCUSS': 'bg-violet-50 border-violet-400 text-violet-700',
  'BELUM FU': 'bg-rose-50 border-rose-400 text-rose-700'
};

const baseSelect =
  'w-full px-3 py-2 text-xs font-bold rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer';

/** Dropdown status. onChange menerima nilai mentah (bukan event). */
export function StatusSelect({ id, value, onChange, options, className = '' }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseSelect} ${STATUS_STYLE[value] ?? STATUS_STYLE['BELUM FU']} ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-white text-slate-800 font-semibold">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- UIC (dropdown multi-pilih) ---------- */

export const UIC_OPTIONS = ['BPPLP', 'ED', 'EVP', 'RLEGS', 'RSMES', 'RSO', 'RSO 1', 'RSO 2', 'RWS', 'SSGS'];

const splitUic = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Dropdown UIC dengan centang. Nilai tersimpan "A, B" seperti sebelumnya.
 * Nilai lama yang tidak ada di daftar tetap tampil dan bisa dihapus centangnya.
 */
export const DESTINASI_OPTIONS = [
  'PRQ',
  'BS',
  'GS',
  'SSGS',
  'LESA V',
  'RSMES',
  'RSO',
  'RLEGS',
  'BPPLP',
  'TIF',
  'TIF SEMARANG',
  'TIF HO',
  'TELDA KUDUS',
  'TELDA SRAGEN',
  'TELDA PATI',
  'TELDA PURWODADI',
  'ALL TELDA',
  'ALL PESERTA'
];

export function UicMultiSelect({ id, value, onChange, className = '', placeholder = 'Pilih UIC' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = splitUic(value);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next.join(', '));
  };

  // Pilih/lepas banyak sekaligus (checkbox "pilih semua" di induk)
  const setMany = (vals, on) => {
    const next = on
      ? [...selected, ...vals.filter((v) => !selected.includes(v))]
      : selected.filter((s) => !vals.includes(s));
    onChange(next.join(', '));
  };

  // Isian dinamis dari node bertanda * (mis. "WITEL BALI - TELDA KUDUS BARU")
  const addCustomValue = (v) => {
    if (!v || selected.includes(v)) return;
    onChange([...selected, v].join(', '));
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 text-xs font-bold text-left text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer flex items-center justify-between gap-2"
      >
        <span className={`truncate ${selected.length ? '' : 'font-normal text-slate-400'}`}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 w-[340px] max-w-[92vw] overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xl p-1">
          <UicTreeMenu
            mode="multi"
            selected={selected}
            onToggle={toggle}
            onBulk={setMany}
            onAddCustom={addCustomValue}
            maxH="max-h-80"
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Target deadline (kalender) ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Ubah teks deadline menjadi YYYY-MM-DD untuk <input type="date">. Null jika tidak dikenali. */
export function deadlineToIso(text) {
  const s = String(text || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  if (m) {
    const idx = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
    if (idx >= 0) return `${m[3]}-${String(idx + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** Format yang disimpan: "13 Nov 2026" (sama dengan gaya deadline di data). */
export function isoToDeadline(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Input tanggal. Nilai lama yang tidak berbentuk tanggal (misal "W3 Nov 2026") tetap ditampilkan. */
export function DeadlineInput({ id, value, onChange, className = '' }) {
  const iso = deadlineToIso(value);
  const legacy = value && !iso ? value : null;
  return (
    <div className={className}>
      <input
        id={id}
        type="date"
        value={iso || ''}
        onChange={(e) => onChange(e.target.value ? isoToDeadline(e.target.value) : '')}
        className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
      />
      {legacy && (
        <p className="text-[10.5px] text-slate-500 mt-1">
          Nilai lama: <span className="font-semibold">{legacy}</span>. Pilih tanggal untuk menggantinya.
        </p>
      )}
    </div>
  );
}
