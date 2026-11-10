import { useState, useMemo, useRef, Fragment } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  LayoutGrid,
  Layers,
  Maximize2,
  Package,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ExportButton, ShareDropdown } from '../components/ui';
import FilterDropdown from '../components/FilterDropdown';
import { SNAPSHOTS, CATATAN_DASHBOARD } from '../data/monitoringOrderSjtData';

const fmtNum = (val) => {
  if (val === undefined || val === null || val === 0 || val === '-') return '-';
  return Number(val).toLocaleString('id-ID');
};

const fmtNilai = (val) => {
  if (val === undefined || val === null || val === 0 || val === '-') return '-';
  return Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatRupiahShort = (val) => {
  if (val === undefined || val === null || val === '-') return '-';
  const abs = Math.abs(Number(val));
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  return `${sign}${abs.toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
};

const fmtSelisih = (val) => {
  if (val === undefined || val === null || val === 0 || val === '-') return '-';
  return val > 0 ? `+${val}` : `${val}`;
};

// Format KPI nilai (Rp juta) dengan 1 desimal, semua pemisah pakai titik.
// Contoh: Rp 2.333.5 Jt (0 tetap tampil "0.0")
const fmtNilaiKpi = (val) =>
  (Number(val) || 0)
    .toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    .replace(',', '.');

const DIVISI_KEYS = ['dgs', 'rbs', 'dps', 'dss'];

const STATUS_KEYS = {
  Pending: 'pending',
  'In Progress': 'inProgress',
  Failed: 'failed',
  'Pending Cancel': 'pendingCancel',
  Complete: 'complete',
};

// Pemetaan tahapan alur order (rincian) ke status milestone utama
const DETAIL_TO_STATUS = {
  'PROVISION START': 'In Progress',
  'PROVISION ISSUED': 'In Progress',
  'PROVISION COMPLETE': 'In Progress',
  'BASO STARTED': 'In Progress',
  'BILLING APPROVAL STARTED': 'In Progress',
  'TSQ FAILED': 'Failed',
  'PROVISION FAILED': 'Failed',
  'FULFILL BILLING FAILED': 'Failed',
  'FULFILL BILLING COMPLETE': 'Complete',
  Abandoned: 'Pending Cancel',
};

const round1 = (n) => Math.round(n * 10) / 10;

const sumRows = (rows, keys) =>
  keys.reduce((acc, k) => {
    acc[k] = round1(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
    return acc;
  }, {});

// Hanya hitung kolom divisi terpilih; Total dihitung ulang, Nilai diproporsikan
const applyDivisi = (row, activeDivs) => {
  if (activeDivs.length === DIVISI_KEYS.length) return row;
  const next = { ...row };
  DIVISI_KEYS.forEach((d) => {
    if (!activeDivs.includes(d)) next[d] = 0;
  });
  next.total = activeDivs.reduce((s, d) => s + (Number(row[d]) || 0), 0);
  next.nilai = row.total > 0 ? round1((Number(row.nilai) || 0) * (next.total / row.total)) : 0;
  return next;
};

// Hanya hitung kolom status terpilih pada tabel AM; Total dihitung ulang, Nilai diproporsikan
const applyAmStatus = (row, selectedStatuses) => {
  const next = { ...row };
  Object.entries(STATUS_KEYS).forEach(([label, key]) => {
    if (!selectedStatuses.includes(label)) next[key] = 0;
  });
  next.total = Object.values(STATUS_KEYS).reduce((s, k) => s + (Number(next[k]) || 0), 0);
  next.nilai = row.total > 0 ? round1((Number(row.nilai) || 0) * (next.total / row.total)) : 0;
  return next;
};

const DIVISI_COLORS = {
  DGS: { bg: 'bg-[#0F172A]', label: 'DGS', badge: 'bg-slate-900 text-white' },
  RBS: { bg: 'bg-[#2563EB]', label: 'RBS', badge: 'bg-blue-600 text-white' },
  DPS: { bg: 'bg-[#60A5FA]', label: 'DPS', badge: 'bg-blue-400 text-white' },
  DSS: { bg: 'bg-[#CBD5E1]', label: 'DSS', badge: 'bg-slate-300 text-slate-800' },
};

const STATUS_BADGE = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  'In Progress': 'bg-blue-50 text-[#1D4ED8] border border-blue-200/80',
  Failed: 'bg-red-50 text-red-600 border border-red-200/80',
  'Pending Cancel': 'bg-slate-100 text-slate-600 border border-slate-200',
  Complete: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
};

const FILTER_OPTIONS = {
  periode: ['31/10/2026', '29/10/2026'],
  divisi: ['DGS', 'RBS', 'DPS', 'DSS'],
  milestone: ['Pending', 'In Progress', 'Failed', 'Pending Cancel', 'Complete'],
  namaAm: [
    'AFIQ ADZANA',
    'ALI PUJIANTO',
    'ANETTA NIMASAYU',
    'CANDRA EVITA TRYARIESTYA',
    'ELSA AYU LESTARI',
    "MUHIBBUDDIN AL MA'RUF",
    'NIGHARA ASMARANTAKA SULYA',
    'SETO EDI WIBOWO',
    'ERIKA KURNIAWATI',
    'MUHYIDDIN TAUFIQ ARDHIYYAN',
    'NUR RAHMAWATI',
    'YASINTA DIAH NURMALISA',
    'RINA SULISTYA PUSPASARI',
    'MAHARANI SARASTIKA BODJAWATI',
    'ADITYA NOVIYANTO',
    'WAHYU ARGA KUSUMA',
    'AM NON SOLO',
    'ADMINISTRATOR',
  ],
  sort: ['Sort by', 'Nama (A-Z)', 'Nama (Z-A)', 'Order Terbanyak', 'Nilai Tertinggi'],
};

/* ========================================================================== */
/* UPLOAD MODAL (IDENTIK DENGAN EDK MONITORING)                               */
/* ========================================================================== */

function UploadOrderModal({ open, onClose }) {
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setFiles([]);
        onClose();
      }, 1200);
    }, 1000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Report Order SJT</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Format yang didukung: XLSX, CSV, PDF (maks 20MB)
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".xlsx,.xls,.csv,.pdf"
          />

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              drag
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mx-auto size-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mb-3">
              <Upload size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Drag & drop file report atau klik untuk pilih
            </p>
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx, .xls), CSV, atau PDF</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <span className="text-xs font-semibold text-slate-700 truncate">{f.name}</span>
                  <button
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!files.length || uploading}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              done
                ? 'bg-emerald-500 text-white'
                : files.length && !uploading
                ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-2xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {done && (
              <>
                <Check size={14} /> Berhasil
              </>
            )}
            {uploading && (
              <>
                <span className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                Mengunggah...
              </>
            )}
            {!done && !uploading && (
              <>
                <Upload size={14} /> Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ========================================================================== */
/* KOMPONEN GRAFIK INTERAKTIF                                                 */
/* ========================================================================== */

function ChartMilestonePerDivisi({ data, selectedRow, onSelectRow }) {
  const [metric, setMetric] = useState('total');
  const maxOrder = Math.max(...data.rows.map((r) => r.total), 250);
  const maxNilai = Math.max(...data.rows.map((r) => r.nilai), 2200);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Jumlah Order per Milestone (CURRENT)
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Visualisasi distribusi milestone order saat ini • Klik bar untuk fokus baris
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          {[
            ['total', 'Total Order'],
            ['stacked', 'Per Divisi'],
            ['nilai', 'Nilai (Rp Jt)'],
          ].map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                metric === k
                  ? 'bg-[#1D4ED8] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {metric === 'stacked' && (
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 mb-3">
          {Object.entries(DIVISI_COLORS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-xs ${v.bg}`} />
              {v.label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[120px_1fr_75px] items-center text-[10px] font-semibold text-slate-400 pb-2 border-b border-slate-200/80">
        <span>Milestone</span>
        <div className="flex justify-between px-1">
          {metric === 'nilai' ? (
            <>
              <span>0</span>
              <span>500</span>
              <span>1.000</span>
              <span>1.500</span>
              <span>2.000+ Rp Jt</span>
            </>
          ) : (
            <>
              <span>0</span>
              <span>50</span>
              <span>100</span>
              <span>150</span>
              <span>200</span>
              <span>250</span>
            </>
          )}
        </div>
        <span className="text-right">{metric === 'nilai' ? 'Rp Jt' : 'Order'}</span>
      </div>

      <div className="space-y-3 mt-3">
        {data.rows.map((r) => {
          const isSelected = selectedRow === r.milestone;
          const pct =
            metric === 'nilai'
              ? Math.min(100, (r.nilai / maxNilai) * 100)
              : Math.min(100, (r.total / maxOrder) * 100);

          const barColor =
            r.milestone === 'Failed'
              ? 'bg-red-500'
              : r.milestone === 'Complete'
              ? 'bg-emerald-500'
              : r.milestone === 'Pending'
              ? 'bg-amber-500'
              : 'bg-[#2563EB]';

          return (
            <div
              key={r.milestone}
              onClick={() => onSelectRow?.(isSelected ? null : r.milestone)}
              className={`grid grid-cols-[120px_1fr_75px] items-center gap-3 py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-white/90'
              }`}
            >
              <span className="text-xs font-semibold text-slate-700 truncate">{r.milestone}</span>

              <div className="h-5 bg-slate-200/70 rounded-md overflow-hidden flex items-center relative">
                {metric === 'stacked' ? (
                  r.total > 0 ? (
                    <div
                      className="h-full flex transition-all duration-500 rounded-md overflow-hidden"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    >
                      {r.dgs > 0 && (
                        <div
                          className="bg-[#0F172A] h-full"
                          style={{ width: `${(r.dgs / r.total) * 100}%` }}
                          title={`DGS: ${r.dgs}`}
                        />
                      )}
                      {r.rbs > 0 && (
                        <div
                          className="bg-[#2563EB] h-full"
                          style={{ width: `${(r.rbs / r.total) * 100}%` }}
                          title={`RBS: ${r.rbs}`}
                        />
                      )}
                      {r.dps > 0 && (
                        <div
                          className="bg-[#60A5FA] h-full"
                          style={{ width: `${(r.dps / r.total) * 100}%` }}
                          title={`DPS: ${r.dps}`}
                        />
                      )}
                      {r.dss > 0 && (
                        <div
                          className="bg-[#CBD5E1] h-full"
                          style={{ width: `${(r.dss / r.total) * 100}%` }}
                          title={`DSS: ${r.dss}`}
                        />
                      )}
                    </div>
                  ) : null
                ) : (
                  <div
                    className={`h-full ${barColor} rounded-md transition-all duration-500`}
                    style={{
                      width: `${
                        (metric === 'nilai' ? r.nilai : r.total) > 0 ? Math.max(pct, 1.5) : 0
                      }%`,
                    }}
                  />
                )}
              </div>

              <span className="text-xs font-extrabold text-slate-800 text-right tabular-nums">
                {metric === 'nilai' ? fmtNilai(r.nilai) : fmtNum(r.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartPergerakanStatus({ data, selectedRow, onSelectRow }) {
  const maxVal = Math.max(...data.rows.flatMap((r) => [r.before, r.after]), 250);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Pergerakan BEF vs CURRENT
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Perbandingan jumlah order per milestone sebelum (BEFORE) dan sesudah (AFTER)
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200/80">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="size-3 rounded-xs bg-slate-400 inline-block" />
            BEFORE
          </span>
          <span className="flex items-center gap-1.5 text-[#1D4ED8]">
            <span className="size-3 rounded-xs bg-[#2563EB] inline-block" />
            AFTER
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[120px_1fr_80px] items-center text-[10px] font-semibold text-slate-400 pb-2 border-b border-slate-200/80">
        <span>Milestone</span>
        <div className="flex justify-between px-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
          <span>250</span>
        </div>
        <span className="text-right">Bef → Aft</span>
      </div>

      <div className="space-y-3 mt-3">
        {data.rows.map((r) => {
          const isSelected = selectedRow === r.milestone;
          const pctBefore = Math.min(100, (r.before / maxVal) * 100);
          const pctAfter = Math.min(100, (r.after / maxVal) * 100);

          return (
            <div
              key={r.milestone}
              onClick={() => onSelectRow?.(isSelected ? null : r.milestone)}
              className={`grid grid-cols-[120px_1fr_80px] items-center gap-3 py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-white/90'
              }`}
            >
              <div>
                <span className="text-xs font-semibold text-slate-700 block truncate">
                  {r.milestone}
                </span>
                {r.selisih !== 0 && (
                  <span
                    className={`text-[10px] font-bold ${
                      r.milestone === 'Complete' && r.selisih > 0
                        ? 'text-emerald-600'
                        : r.selisih < 0
                        ? 'text-blue-600'
                        : 'text-slate-500'
                    }`}
                  >
                    Selisih {fmtSelisih(r.selisih)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="h-3 bg-slate-200/60 rounded-sm overflow-hidden flex items-center">
                  <div
                    className="h-full bg-slate-400 rounded-sm transition-all duration-500"
                    style={{ width: `${r.before > 0 ? Math.max(pctBefore, 1.5) : 0}%` }}
                    title={`Before: ${r.before}`}
                  />
                </div>
                <div className="h-3 bg-slate-200/60 rounded-sm overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-sm transition-all duration-500 ${
                      r.milestone === 'Complete'
                        ? 'bg-emerald-500'
                        : r.milestone === 'Failed'
                        ? 'bg-red-500'
                        : 'bg-[#2563EB]'
                    }`}
                    style={{ width: `${r.after > 0 ? Math.max(pctAfter, 1.5) : 0}%` }}
                    title={`After: ${r.after}`}
                  />
                </div>
              </div>

              <div className="text-right text-xs font-bold tabular-nums">
                <span className="text-slate-400">{fmtNum(r.before)}</span>
                <span className="text-slate-300 mx-1">→</span>
                <span className="text-slate-800">{fmtNum(r.after)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartDetailMilestone({ data, selectedRow, onSelectRow }) {
  const [metric, setMetric] = useState('total');
  const activeRows = data.rows.filter((r) => r.total > 0 || r.nilai > 0);
  const maxVal =
    metric === 'nilai'
      ? Math.max(...activeRows.map((r) => r.nilai), 2000)
      : Math.max(...activeRows.map((r) => r.total), 180);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Grafik Rincian Alur Milestone per Divisi
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Komposisi order per tahapan alur provisioning & billing (DGS, RBS, DPS, DSS)
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setMetric('total')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'total'
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Jumlah Order
          </button>
          <button
            type="button"
            onClick={() => setMetric('nilai')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'nilai'
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Nilai (Rp Jt)
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 mb-3">
        {Object.entries(DIVISI_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-xs ${v.bg}`} />
            {v.label}
          </span>
        ))}
      </div>

      <div className="space-y-2.5">
        {data.rows.map((r) => {
          const isSelected = selectedRow === r.milestone;
          const isFailed = r.milestone.includes('FAILED');
          const val = metric === 'nilai' ? r.nilai : r.total;
          const pct = Math.min(100, (val / maxVal) * 100);

          return (
            <div
              key={r.milestone}
              onClick={() => onSelectRow?.(isSelected ? null : r.milestone)}
              className={`grid grid-cols-[185px_1fr_75px] items-center gap-3 py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-white/90'
              }`}
            >
              <span
                className={`text-xs font-semibold truncate ${
                  isFailed ? 'text-red-600 font-bold' : 'text-slate-700'
                }`}
              >
                {r.milestone}
              </span>

              <div className="h-4.5 bg-slate-200/70 rounded-sm overflow-hidden flex">
                {metric === 'total' && r.total > 0 ? (
                  <div
                    className="h-full flex transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  >
                    {r.dgs > 0 && (
                      <div
                        className="bg-[#0F172A] h-full"
                        style={{ width: `${(r.dgs / r.total) * 100}%` }}
                        title={`DGS: ${r.dgs}`}
                      />
                    )}
                    {r.rbs > 0 && (
                      <div
                        className="bg-[#2563EB] h-full"
                        style={{ width: `${(r.rbs / r.total) * 100}%` }}
                        title={`RBS: ${r.rbs}`}
                      />
                    )}
                    {r.dps > 0 && (
                      <div
                        className="bg-[#60A5FA] h-full"
                        style={{ width: `${(r.dps / r.total) * 100}%` }}
                        title={`DPS: ${r.dps}`}
                      />
                    )}
                    {r.dss > 0 && (
                      <div
                        className="bg-[#CBD5E1] h-full"
                        style={{ width: `${(r.dss / r.total) * 100}%` }}
                        title={`DSS: ${r.dss}`}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className={`h-full transition-all duration-500 ${
                      isFailed ? 'bg-red-500' : 'bg-[#2563EB]'
                    }`}
                    style={{ width: `${val > 0 ? Math.max(pct, 2) : 0}%` }}
                  />
                )}
              </div>

              <span className="text-xs font-bold text-slate-800 text-right tabular-nums">
                {metric === 'nilai' ? fmtNilai(r.nilai) : fmtNum(r.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartAmMilestone({ title, rows, selectedRow, onSelectRow }) {
  const [metric, setMetric] = useState('order');
  const maxOrder = Math.max(...rows.map((r) => r.total), 75);
  const maxNilai = Math.max(...rows.map((r) => r.nilai), 120);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Grafik {title}
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Distribusi beban order & capaian milestone per Account Manager
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setMetric('order')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'order'
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Jumlah Order
          </button>
          <button
            type="button"
            onClick={() => setMetric('nilai')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'nilai'
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Nilai (Rp Jt)
          </button>
        </div>
      </div>

      {metric === 'order' && (
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-amber-400" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-[#2563EB]" /> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-red-500" /> Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-emerald-500" /> Complete
          </span>
        </div>
      )}

      <div className="space-y-2 mt-2">
        {rows.map((r) => {
          const isSelected = selectedRow === r.nama;
          const pct =
            metric === 'nilai'
              ? Math.min(100, (r.nilai / maxNilai) * 100)
              : Math.min(100, (r.total / maxOrder) * 100);

          return (
            <div
              key={r.nama}
              onClick={() => onSelectRow?.(isSelected ? null : r.nama)}
              className={`grid grid-cols-[175px_1fr_75px] items-center gap-3 py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-white/90'
              }`}
            >
              <span className="text-xs font-semibold text-slate-700 truncate" title={r.nama}>
                {r.nama}
              </span>

              <div className="h-4.5 bg-slate-200/70 rounded-sm overflow-hidden flex items-center">
                {metric === 'order' ? (
                  r.total > 0 ? (
                    <div
                      className="h-full flex transition-all duration-500 rounded-sm overflow-hidden"
                      style={{ width: `${Math.max(pct, 2.5)}%` }}
                    >
                      {r.pending > 0 && (
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${(r.pending / r.total) * 100}%` }}
                          title={`Pending: ${r.pending}`}
                        />
                      )}
                      {r.inProgress > 0 && (
                        <div
                          className="bg-[#2563EB] h-full"
                          style={{ width: `${(r.inProgress / r.total) * 100}%` }}
                          title={`In Progress: ${r.inProgress}`}
                        />
                      )}
                      {r.failed > 0 && (
                        <div
                          className="bg-red-500 h-full"
                          style={{ width: `${(r.failed / r.total) * 100}%` }}
                          title={`Failed: ${r.failed}`}
                        />
                      )}
                      {r.complete > 0 && (
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(r.complete / r.total) * 100}%` }}
                          title={`Complete: ${r.complete}`}
                        />
                      )}
                    </div>
                  ) : null
                ) : (
                  <div
                    className="h-full bg-[#1D4ED8] rounded-sm transition-all duration-500"
                    style={{ width: `${r.nilai > 0 ? Math.max(pct, 2) : 0}%` }}
                  />
                )}
              </div>

              <span className="text-xs font-bold text-slate-800 text-right tabular-nums">
                {metric === 'nilai' ? fmtNilai(r.nilai) : fmtNum(r.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartUmurOrderPerDivisi({ data, selectedRow, onSelectRow }) {
  const maxTotal = 200;
  const yTicks = [200, 180, 160, 140, 120, 100, 80, 60, 40, 20, 0];

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Umur Order per Divisi
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Distribusi aging order berdasarkan divisi DGS, RBS, DPS, dan DSS
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80">
          {Object.entries(DIVISI_COLORS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-xs ${v.bg}`} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/70 p-4 pt-6">
        <div className="grid grid-cols-[36px_1fr] gap-2">
          <div className="flex flex-col justify-between h-56 text-[10px] font-semibold text-slate-400 text-right pr-1 select-none">
            {yTicks.map((t) => (
              <span key={t} className="leading-none">
                {t === 0 ? '-' : t}
              </span>
            ))}
          </div>

          <div className="relative h-56 border-l border-b border-slate-300 flex items-end justify-around px-4">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {yTicks.map((t) => (
                <div key={t} className="w-full border-t border-slate-100" />
              ))}
            </div>

            {data.rows.map((r) => {
              const isSelected = selectedRow === r.range;
              const totalHeightPct = Math.min(100, (r.total / maxTotal) * 100);

              return (
                <div
                  key={r.range}
                  onClick={() => onSelectRow?.(isSelected ? null : r.range)}
                  className={`relative z-10 flex flex-col items-center justify-end h-full w-16 sm:w-24 group cursor-pointer ${
                    isSelected ? 'scale-[1.03]' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-extrabold mb-1 transition-transform ${
                      r.highlight ? 'text-red-600' : 'text-slate-800'
                    }`}
                  >
                    {r.total}
                  </span>

                  <div
                    className={`w-12 sm:w-16 flex flex-col-reverse rounded-t-md overflow-hidden shadow-xs transition-all duration-500 ${
                      isSelected ? 'ring-2 ring-[#2563EB] ring-offset-2' : 'group-hover:brightness-105'
                    }`}
                    style={{ height: `${Math.max(totalHeightPct, 2)}%` }}
                  >
                    {r.dgs > 0 && (
                      <div
                        className="bg-[#0F172A] w-full transition-all"
                        style={{ height: `${(r.dgs / r.total) * 100}%` }}
                        title={`DGS: ${r.dgs}`}
                      />
                    )}
                    {r.rbs > 0 && (
                      <div
                        className="bg-[#2563EB] w-full transition-all"
                        style={{ height: `${(r.rbs / r.total) * 100}%` }}
                        title={`RBS: ${r.rbs}`}
                      />
                    )}
                    {r.dps > 0 && (
                      <div
                        className="bg-[#60A5FA] w-full transition-all"
                        style={{ height: `${(r.dps / r.total) * 100}%` }}
                        title={`DPS: ${r.dps}`}
                      />
                    )}
                    {r.dss > 0 && (
                      <div
                        className="bg-[#CBD5E1] w-full transition-all"
                        style={{ height: `${(r.dss / r.total) * 100}%` }}
                        title={`DSS: ${r.dss}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[36px_1fr] gap-2 mt-3">
          <div />
          <div className="flex justify-around px-4">
            {data.rows.map((r) => (
              <div key={r.range} className="w-16 sm:w-24 text-center">
                <span
                  className={`text-xs font-bold ${
                    r.highlight ? 'text-red-600' : 'text-slate-700'
                  }`}
                >
                  {r.range}
                </span>
                <span className="block text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Rp {fmtNilai(r.nilai)} Jt
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartJenisOrder({ data, selectedRow, onSelectRow }) {
  const [metric, setMetric] = useState('jumlah');
  const maxOrder = 90;
  const maxNilai = Math.max(...data.rows.map((r) => r.nilai), 1600);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#0F172A]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Jumlah Order per Jenis (Order Subtype)
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Distribusi volume order berdasarkan tipe layanan / transaksi
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          {[
            ['jumlah', 'Total Jumlah'],
            ['gt60', 'Umur > 60 Hari'],
            ['nilai', 'Nilai (Rp Jt)'],
          ].map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                metric === k
                  ? 'bg-[#1D4ED8] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[145px_1fr_75px] items-center text-[10px] font-semibold text-slate-400 pb-2 border-b border-slate-200/80">
        <span>Order Subtype</span>
        <div className="flex justify-between px-1">
          {metric === 'nilai' ? (
            <>
              <span>0</span>
              <span>400</span>
              <span>800</span>
              <span>1.200</span>
              <span>1.600 Rp Jt</span>
            </>
          ) : (
            <>
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50</span>
              <span>60</span>
              <span>70</span>
              <span>80</span>
              <span>90</span>
            </>
          )}
        </div>
        <span className="text-right">{metric === 'nilai' ? 'Rp Jt' : 'Order'}</span>
      </div>

      <div className="space-y-2.5 mt-3">
        {data.rows.map((r) => {
          const isSelected = selectedRow === r.subtype;
          const val = metric === 'nilai' ? r.nilai : metric === 'gt60' ? r.gt60 : r.jumlah;
          const max = metric === 'nilai' ? maxNilai : maxOrder;
          const pct = Math.min(100, (val / max) * 100);

          return (
            <div
              key={r.subtype}
              onClick={() => onSelectRow?.(isSelected ? null : r.subtype)}
              className={`grid grid-cols-[145px_1fr_75px] items-center gap-3 py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-white/90'
              }`}
            >
              <span className="text-xs font-semibold text-slate-700 truncate">{r.subtype}</span>

              <div className="h-4.5 bg-slate-200/70 rounded-sm overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-sm transition-all duration-500 ${
                    metric === 'gt60'
                      ? 'bg-red-500'
                      : metric === 'nilai'
                      ? 'bg-[#2563EB]'
                      : 'bg-[#0F172A]'
                  }`}
                  style={{ width: `${val > 0 ? Math.max(pct, 2) : 0}%` }}
                />
              </div>

              <span className="text-xs font-extrabold text-slate-800 text-right tabular-nums">
                {metric === 'nilai' ? fmtNilai(r.nilai) : fmtNum(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartProdukPerDivisi({ rows, selectedRow, onSelectRow }) {
  const [metric, setMetric] = useState('total');
  const maxOrder = Math.max(...rows.map((r) => r.total), 100);
  const maxNilai = Math.max(...rows.map((r) => r.nilai), 900);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Grafik Top 12 Produk per Divisi
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Komposisi order produk terbanyak per divisi (DGS, RBS, DPS, DSS)
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setMetric('total')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'total'
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Jumlah Order
          </button>
          <button
            type="button"
            onClick={() => setMetric('nilai')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'nilai'
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Nilai (Rp Jt)
          </button>
        </div>
      </div>

      {metric === 'total' && (
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 mb-3">
          {Object.entries(DIVISI_COLORS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-xs ${v.bg}`} />
              {v.label}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const isSelected = selectedRow === r.produk;
          const val = metric === 'nilai' ? r.nilai : r.total;
          const max = metric === 'nilai' ? maxNilai : maxOrder;
          const pct = Math.min(100, (val / max) * 100);

          return (
            <div
              key={r.produk}
              onClick={() => onSelectRow?.(isSelected ? null : r.produk)}
              className={`grid grid-cols-[175px_1fr_75px] items-center gap-3 py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300' : 'hover:bg-white/90'
              }`}
            >
              <span
                className={`text-xs font-semibold text-slate-700 truncate ${
                  r.isItalic ? 'italic' : ''
                }`}
                title={r.produk}
              >
                {r.produk}
              </span>

              <div className="h-4.5 bg-slate-200/70 rounded-sm overflow-hidden flex items-center">
                {metric === 'total' ? (
                  r.total > 0 ? (
                    <div
                      className="h-full flex transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2.5)}%` }}
                    >
                      {r.dgs > 0 && (
                        <div
                          className="bg-[#0F172A] h-full"
                          style={{ width: `${(r.dgs / r.total) * 100}%` }}
                          title={`DGS: ${r.dgs}`}
                        />
                      )}
                      {r.rbs > 0 && (
                        <div
                          className="bg-[#2563EB] h-full"
                          style={{ width: `${(r.rbs / r.total) * 100}%` }}
                          title={`RBS: ${r.rbs}`}
                        />
                      )}
                      {r.dps > 0 && (
                        <div
                          className="bg-[#60A5FA] h-full"
                          style={{ width: `${(r.dps / r.total) * 100}%` }}
                          title={`DPS: ${r.dps}`}
                        />
                      )}
                      {r.dss > 0 && (
                        <div
                          className="bg-[#CBD5E1] h-full"
                          style={{ width: `${(r.dss / r.total) * 100}%` }}
                          title={`DSS: ${r.dss}`}
                        />
                      )}
                    </div>
                  ) : null
                ) : (
                  <div
                    className="h-full bg-[#2563EB] rounded-sm transition-all duration-500"
                    style={{ width: `${val > 0 ? Math.max(pct, 2) : 0}%` }}
                  />
                )}
              </div>

              <span className="text-xs font-bold text-slate-800 text-right tabular-nums">
                {metric === 'nilai' ? fmtNilai(r.nilai) : fmtNum(r.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartOrderBergerak({ rows }) {
  const byDivisi = useMemo(() => {
    const counts = { DPS: 0, RBS: 0, DGS: 0, DSS: 0 };
    rows.forEach((r) => {
      counts[r.divisi] = (counts[r.divisi] || 0) + 1;
    });
    return Object.entries(counts).filter(([, c]) => c > 0);
  }, [rows]);

  const byTransition = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const k = `${r.statusBefore} → ${r.statusAfter}`;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map);
  }, [rows]);

  const totalMoved = Math.max(rows.length, 1);

  return (
    <div
      className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 animate-[fadeSlideDown_0.2s_ease-out]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Grafik Ringkasan Order Bergerak ({rows.length} Order)
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Proporsi pergerakan status order berdasarkan Divisi dan Transisi Milestone
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/70 p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Distribusi per Divisi
          </p>
          <div className="space-y-3">
            {byDivisi.map(([div, count]) => {
              const pct = Math.round((count / totalMoved) * 100);
              const color = DIVISI_COLORS[div]?.bg || 'bg-blue-600';
              return (
                <div key={div}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-700">Divisi {div}</span>
                    <span className="text-slate-900 font-bold">
                      {count} Order ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Transisi Status (13/10 → 15/10)
          </p>
          <div className="space-y-3">
            {byTransition.map(([trans, count]) => {
              const pct = Math.round((count / totalMoved) * 100);
              const isComplete = trans.includes('Complete');
              return (
                <div key={trans}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-700">{trans}</span>
                    <span className="text-slate-900 font-bold">
                      {count} Order ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-emerald-500' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* PANEL TABEL INTERAKTIF                                                     */
/* ========================================================================== */

function TableSectionBox({
  id,
  title,
  subtitle,
  badgeText,
  isOpen,
  onToggle,
  onOpenModal,
  chartElement,
  children,
}) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer group/box ${
        isOpen
          ? 'bg-white border-[#2563EB]/60 ring-2 ring-[#2563EB]/10 shadow-sm'
          : 'bg-white border-slate-200/80 hover:border-blue-300/90 shadow-2xs'
      }`}
    >
      {/* Box Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/40">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2 rounded-full transition-colors ${
                isOpen ? 'bg-[#2563EB]' : 'bg-[#1D4ED8]'
              }`}
            />
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">
              {title}
            </h3>
            {badgeText && (
              <span className="bg-blue-50 text-[#1D4ED8] border border-blue-200/60 text-[10.5px] font-bold px-3 py-1 rounded-full leading-none">
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isOpen
                ? 'bg-[#1D4ED8] text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] border border-slate-200/90 shadow-2xs'
            }`}
          >
            <BarChart2 size={14} />
            <span>{isOpen ? 'Sembunyikan Grafik' : 'Lihat Grafik'}</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal(id, title, subtitle, chartElement)}
            className="size-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#1D4ED8] grid place-items-center transition-colors cursor-pointer shadow-2xs"
            title="Perbesar Grafik di Layar Penuh"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Box Body */}
      <div className="p-5 md:p-6">
        {children}

        {!isOpen ? (
          <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400 group-hover/box:text-[#2563EB] transition-colors">
            <span className="flex items-center gap-1.5 font-medium">
              <BarChart2 size={13} />
              Klik pada tabel ini untuk memunculkan grafik visualisasi
            </span>
            <span className="font-semibold">Tampilkan Grafik →</span>
          </div>
        ) : (
          <div className="mt-4">{chartElement}</div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* HALAMAN UTAMA: MONITORING ORDER SJT (TERSTRUKTUR SEPERTI EDK MONITORING)   */
/* ========================================================================== */

export default function MonitoringOrderSjt() {
  const [showUpload, setShowUpload] = useState(false);

  // Filter States (Persis gaya FilterDropdown EDK Monitoring)
  const [selectedPeriode, setSelectedPeriode] = useState([]);
  const [selectedDivisi, setSelectedDivisi] = useState([]);
  const [selectedNamaAm, setSelectedNamaAm] = useState([]);
  const [selectedMilestone, setSelectedMilestone] = useState([]);
  const [sortOrder, setSortOrder] = useState('Sort by');

  // 5 Mode Tab terfokus (Default: Milestone & Status agar tidak menumpuk 9 tabel sekaligus)
  const [mode, setMode] = useState('Milestone & Status');
  // Sub-filter di dalam tab Performa AM: 'Semua Segmen' | 'Segmen RBS' | 'Segmen LEGS'
  const [amGroupFilter, setAmGroupFilter] = useState('Semua Segmen');

  // Snapshot aktif
  const snapshotKey =
    selectedPeriode.length === 1 && SNAPSHOTS[selectedPeriode[0]]
      ? selectedPeriode[0]
      : '31/10/2026';
  const currentData = SNAPSHOTS[snapshotKey];

  // State buka/tutup grafik per tabel saat diklik
  const [openCharts, setOpenCharts] = useState({
    milestoneDivisi: false,
    pergerakanStatus: false,
    milestoneDetail: false,
    amRbs: false,
    amLegs: false,
    umurOrder: false,
    jenisOrder: false,
    produkDivisi: false,
    orderBergerak: false,
  });

  const [selectedRows, setSelectedRows] = useState({});
  const [modalChart, setModalChart] = useState(null);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedPeriode.length > 0 ||
      selectedDivisi.length > 0 ||
      selectedNamaAm.length > 0 ||
      selectedMilestone.length > 0 ||
      (sortOrder !== 'Sort by' && sortOrder !== '')
    );
  }, [selectedPeriode, selectedDivisi, selectedNamaAm, selectedMilestone, sortOrder]);

  const resetFilters = () => {
    setSelectedPeriode([]);
    setSelectedDivisi([]);
    setSelectedNamaAm([]);
    setSelectedMilestone([]);
    setSortOrder('Sort by');
  };

  const toggleChart = (key) => {
    setOpenCharts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectRow = (tableKey, rowKey) => {
    setSelectedRows((prev) => ({ ...prev, [tableKey]: rowKey }));
    if (!openCharts[tableKey] && rowKey !== null) {
      setOpenCharts((prev) => ({ ...prev, [tableKey]: true }));
    }
  };

  const applySort = (list, nameKey, orderKey, nilaiKey) => {
    const arr = [...list];
    if (sortOrder === 'Nama (A-Z)') {
      return arr.sort((a, b) => String(a[nameKey]).localeCompare(String(b[nameKey])));
    }
    if (sortOrder === 'Nama (Z-A)') {
      return arr.sort((a, b) => String(b[nameKey]).localeCompare(String(a[nameKey])));
    }
    if (sortOrder === 'Order Terbanyak') {
      return arr.sort((a, b) => (b[orderKey] || 0) - (a[orderKey] || 0));
    }
    if (sortOrder === 'Nilai Tertinggi') {
      return arr.sort((a, b) => (b[nilaiKey] || 0) - (a[nilaiKey] || 0));
    }
    return arr;
  };

  // Filtered datasets
  // Catatan: data sumber berupa rekap (agregat). Filter Divisi menghitung ulang Total
  // dari kolom divisi terpilih; Nilai ikut diproporsikan. Filter Milestone menyaring
  // baris status / kolom status, dan baris TOTAL selalu dihitung ulang dari hasil filter.
  const activeDivs = useMemo(
    () =>
      selectedDivisi.length > 0
        ? DIVISI_KEYS.filter((d) => selectedDivisi.includes(d.toUpperCase()))
        : DIVISI_KEYS,
    [selectedDivisi]
  );
  const isDivFiltered = selectedDivisi.length > 0;
  const isMsFiltered = selectedMilestone.length > 0;

  const filteredMilestoneRows = useMemo(() => {
    let rows = currentData.milestonePerDivisi.rows.map((r) => applyDivisi(r, activeDivs));
    if (isMsFiltered) {
      rows = rows.filter((r) => selectedMilestone.includes(r.milestone));
    }
    return applySort(rows, 'milestone', 'total', 'nilai');
  }, [currentData, activeDivs, selectedMilestone, sortOrder]);

  const milestoneTotal = useMemo(
    () =>
      !isDivFiltered && !isMsFiltered
        ? currentData.milestonePerDivisi.total
        : sumRows(filteredMilestoneRows, [...DIVISI_KEYS, 'total', 'nilai']),
    [currentData, filteredMilestoneRows, isDivFiltered, isMsFiltered]
  );

  const filteredPergerakanRows = useMemo(() => {
    let rows = currentData.pergerakanStatus.rows;
    if (isMsFiltered) {
      rows = rows.filter((r) => selectedMilestone.includes(r.milestone));
    }
    return applySort(rows, 'milestone', 'after', 'porsiAfter');
  }, [currentData, selectedMilestone, sortOrder]);

  const pergerakanTotal = useMemo(
    () =>
      !isMsFiltered
        ? currentData.pergerakanStatus.total
        : sumRows(filteredPergerakanRows, ['before', 'after', 'selisih', 'porsiAfter']),
    [currentData, filteredPergerakanRows, isMsFiltered]
  );

  const filteredDetailRows = useMemo(() => {
    let rows = currentData.milestoneDetailPerDivisi.rows.map((r) => applyDivisi(r, activeDivs));
    if (isMsFiltered) {
      rows = rows.filter((r) => selectedMilestone.includes(DETAIL_TO_STATUS[r.milestone]));
    }
    return rows;
  }, [currentData, activeDivs, selectedMilestone]);

  const detailTotal = useMemo(
    () =>
      !isDivFiltered && !isMsFiltered
        ? currentData.milestoneDetailPerDivisi.total
        : sumRows(filteredDetailRows, [...DIVISI_KEYS, 'total', 'nilai']),
    [currentData, filteredDetailRows, isDivFiltered, isMsFiltered]
  );

  const filterAmRows = (list) => {
    let rows = list;
    if (selectedNamaAm.length > 0) {
      rows = rows.filter((r) => selectedNamaAm.includes(r.nama));
    }
    if (isMsFiltered) {
      rows = rows.map((r) => applyAmStatus(r, selectedMilestone)).filter((r) => r.total > 0);
    }
    return applySort(rows, 'nama', 'total', 'nilai');
  };

  const filteredAmRbs = useMemo(
    () => filterAmRows(currentData.amRbs.rows),
    [currentData, selectedNamaAm, selectedMilestone, sortOrder]
  );
  const filteredAmLegs = useMemo(
    () => filterAmRows(currentData.amLegs.rows),
    [currentData, selectedNamaAm, selectedMilestone, sortOrder]
  );

  const AM_TOTAL_KEYS = [...Object.values(STATUS_KEYS), 'total', 'nilai'];
  const amRbsTotal = useMemo(
    () =>
      selectedNamaAm.length === 0 && !isMsFiltered
        ? currentData.amRbs.total
        : sumRows(filteredAmRbs, AM_TOTAL_KEYS),
    [currentData, filteredAmRbs, selectedNamaAm, isMsFiltered]
  );
  const amLegsTotal = useMemo(
    () =>
      selectedNamaAm.length === 0 && !isMsFiltered
        ? currentData.amLegs.total
        : sumRows(filteredAmLegs, AM_TOTAL_KEYS),
    [currentData, filteredAmLegs, selectedNamaAm, isMsFiltered]
  );

  const filteredUmurRows = useMemo(
    () => currentData.umurOrderPerDivisi.rows.map((r) => applyDivisi(r, activeDivs)),
    [currentData, activeDivs]
  );
  const umurTotal = useMemo(
    () =>
      !isDivFiltered
        ? currentData.umurOrderPerDivisi.total
        : sumRows(filteredUmurRows, [...DIVISI_KEYS, 'total', 'nilai']),
    [currentData, filteredUmurRows, isDivFiltered]
  );

  const filteredJenisOrder = useMemo(() => {
    return applySort(currentData.jenisOrder.rows, 'subtype', 'jumlah', 'nilai');
  }, [currentData, sortOrder]);

  const filteredProduk = useMemo(() => {
    const rows = currentData.produkPerDivisi.rows
      .map((r) => applyDivisi(r, activeDivs))
      .filter((r) => !isDivFiltered || r.total > 0);
    return applySort(rows, 'produk', 'total', 'nilai');
  }, [currentData, activeDivs, sortOrder]);

  const produkTotal = useMemo(
    () =>
      !isDivFiltered
        ? currentData.produkPerDivisi.total
        : sumRows(filteredProduk, [...DIVISI_KEYS, 'total', 'nilai']),
    [currentData, filteredProduk, isDivFiltered]
  );

  const filteredOrderBergerak = useMemo(() => {
    let rows = currentData.daftarOrderBergerak.rows;
    if (isDivFiltered) {
      rows = rows.filter((r) => selectedDivisi.includes(r.divisi));
    }
    if (isMsFiltered) {
      // Ikut status CURRENT (after), konsisten dengan tabel posisi milestone
      rows = rows.filter((r) => selectedMilestone.includes(r.statusAfter));
    }
    return rows;
  }, [currentData, selectedDivisi, selectedMilestone]);

  // Dynamic KPI Metrics — mengikuti SEMUA filter (Divisi, Milestone, Nama AM)
  const kpiMetrics = useMemo(() => {
    const useAm = selectedNamaAm.length > 0;
    const grandTotal = milestoneTotal.total || 0;

    let totalOrder;
    let totalNilai;
    let countStatus;

    if (useAm) {
      const amRows = [...filteredAmRbs, ...filteredAmLegs];
      totalOrder = amRows.reduce((s, r) => s + (Number(r.total) || 0), 0);
      totalNilai = amRows.reduce((s, r) => s + (Number(r.nilai) || 0), 0);
      countStatus = (label) =>
        amRows.reduce((s, r) => s + (Number(r[STATUS_KEYS[label]]) || 0), 0);
    } else {
      totalOrder = Number(milestoneTotal.total) || 0;
      totalNilai = Number(milestoneTotal.nilai) || 0;
      countStatus = (label) => {
        const row = filteredMilestoneRows.find((r) => r.milestone === label);
        return row ? Number(row.total) || 0 : 0;
      };
    }

    const inProgress = countStatus('In Progress');
    const complete = countStatus('Complete');
    const failed = countStatus('Failed');

    // Data umur tidak dirinci per status / per AM, jadi >60 hari hanya tersedia
    // bila filter yang aktif sebatas Periode / Divisi.
    let gt60 = null;
    if (!useAm && !isMsFiltered) {
      const gt60Row = filteredUmurRows.find((r) => r.range === '> 60 Hari');
      gt60 = gt60Row ? Number(gt60Row.total) || 0 : 0;
    }

    const pct = (n) => `${(totalOrder > 0 ? (n / totalOrder) * 100 : 0).toFixed(1)}%`;

    return {
      totalOrder,
      totalNilai,
      grandTotal,
      totalPct: `${(grandTotal > 0 ? (totalOrder / grandTotal) * 100 : 0).toFixed(1)}%`,
      inProgress,
      inProgressPct: pct(inProgress),
      complete,
      completePct: pct(complete),
      failed,
      gt60,
      gt60Pct: gt60 === null ? null : pct(gt60),
    };
  }, [
    currentData,
    selectedNamaAm,
    isMsFiltered,
    milestoneTotal,
    filteredMilestoneRows,
    filteredAmRbs,
    filteredAmLegs,
    filteredUmurRows,
  ]);

  // Filter yang tidak bisa diterapkan pada tabel tertentu (data sumber tidak dirinci)
  const filterScopeNotes = useMemo(() => {
    const notes = [];
    const showMs = mode === 'Milestone & Status' || mode === 'Semua Tabel';
    const showAm = mode === 'Performa AM' || mode === 'Semua Tabel';
    const showUmur = mode === 'Umur & Jenis' || mode === 'Semua Tabel';
    const showProduk = mode === 'Produk & Move' || mode === 'Semua Tabel';
    if (selectedNamaAm.length > 0 && (showMs || showUmur || showProduk)) {
      notes.push('Nama AM hanya berlaku untuk tabel Performa AM & kartu KPI (tabel lain tidak dirinci per AM).');
    }
    if (isDivFiltered && showAm) {
      notes.push('Segmen / Divisi tidak berlaku untuk tabel AM (sudah dipisah per segmen RBS & LEGS).');
    }
    if (isDivFiltered && showUmur) {
      notes.push('Segmen / Divisi tidak berlaku untuk tabel Jenis Order (tidak dirinci per divisi).');
    }
    if (isMsFiltered && (showUmur || showProduk)) {
      notes.push('Status Milestone tidak berlaku untuk tabel Umur Order, Jenis Order, dan Produk (data tidak dirinci per status).');
    }
    if (isDivFiltered) {
      notes.push('Saat filter Divisi aktif, Nilai (Rp Jt) per baris dihitung proporsional terhadap jumlah order divisi terpilih.');
    }
    return notes;
  }, [mode, selectedNamaAm, isDivFiltered, isMsFiltered]);

  const divColHighlight = (div) =>
    selectedDivisi.includes(div) ? 'bg-blue-50/70 font-bold text-[#1D4ED8]' : '';

  return (
    <div id="sjt-main-content" className="space-y-4">
      {/* ================================================================== */}
      {/* 1. PAGE HEADER                                                     */}
      {/* ================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 tracking-tight">
            Monitoring Order SJT
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring posisi milestone, pergerakan status, umur order, dan produk Witel Solo Jateng Timur
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Upload Report</span>
          </button>

          <ExportButton
            filename={`Monitoring_Order_SJT_${snapshotKey.replace(/\//g, '-')}`}
            title={`Monitoring Order SJT ${snapshotKey}`}
            prepareExport={() => {
              // Export DOCX/XLSX/CSV selalu berisi semua tabel, apa pun mode tampilan saat ini
              const prev = mode;
              if (prev === 'Semua Tabel') return null;
              flushSync(() => setMode('Semua Tabel'));
              return () => setMode(prev);
            }}
            tableSelector="#sjt-main-content table"
            pdfSelector="#sjt-main-content"
          />

          <ShareDropdown
            buttonLabel="Salin & Bagikan"
            captureSelector="#sjt-main-content"
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. KPI CARDS (4 KARTU UTAMA BERSIH SEPERTI EDK MONITORING)         */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            TOTAL ORDER
          </p>
          <p className="text-[28px] font-bold text-slate-900 tracking-tight mt-1">
            {kpiMetrics.totalOrder.toLocaleString('id-ID')}
          </p>
          {kpiMetrics.gt60 !== null ? (
            <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-semibold">
              <span>{kpiMetrics.gt60.toLocaleString('id-ID')} order (&gt;60 hari)</span>
              <span className="text-slate-400 font-normal">• {kpiMetrics.gt60Pct} dari total</span>
            </p>
          ) : (
            <p className="text-xs mt-1.5 flex items-center gap-1 text-slate-500">
              <span className="font-bold text-slate-800">{kpiMetrics.totalPct}</span>
              <span className="text-slate-400 font-normal">
                dari {kpiMetrics.grandTotal.toLocaleString('id-ID')} total order
              </span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            TOTAL NILAI
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            Rp {formatRupiahShort(kpiMetrics.totalNilai)}
          </p>

          <p className="text-xs mt-1.5 flex items-center gap-1 text-emerald-600 font-semibold">
            <span>112 hari</span>
            <span className="text-slate-400 font-normal">rata-rata umur order</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            IN PROGRESS
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            {kpiMetrics.inProgress.toLocaleString('id-ID')}
          </p>
          <p className="text-xs mt-1.5 text-slate-500">
            <span className="font-bold text-slate-800">{kpiMetrics.inProgressPct}</span>{' '}
            <span className="text-slate-400 font-normal">
              dari total order ({kpiMetrics.failed} Failed)
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            COMPLETE
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            {kpiMetrics.complete.toLocaleString('id-ID')}
          </p>
          <p className="text-xs mt-1.5 text-slate-500">
            <span className="font-bold text-slate-800">{kpiMetrics.completePct}</span>{' '}
            <span className="text-slate-400 font-normal">dari total order</span>
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. FILTER TOOLBAR                                                  */}
      {/* ================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-end gap-3 w-full">
          <FilterDropdown
            label="Periode Order"
            options={FILTER_OPTIONS.periode}
            selected={selectedPeriode}
            onChange={setSelectedPeriode}
            className="flex-1 min-w-[130px]"
          />

          <FilterDropdown
            label="Segmen / Divisi"
            options={FILTER_OPTIONS.divisi}
            selected={selectedDivisi}
            onChange={setSelectedDivisi}
            className="flex-1 min-w-[110px]"
          />

          <FilterDropdown
            label="Nama AM"
            options={FILTER_OPTIONS.namaAm}
            selected={selectedNamaAm}
            onChange={setSelectedNamaAm}
            className="flex-1 min-w-[130px]"
          />

          <FilterDropdown
            label="Status Milestone"
            options={FILTER_OPTIONS.milestone}
            selected={selectedMilestone}
            onChange={setSelectedMilestone}
            className="flex-1 min-w-[140px]"
          />

          <FilterDropdown
            label="Urutkan Data"
            options={FILTER_OPTIONS.sort}
            selected={[sortOrder]}
            onChange={(val) => setSortOrder(val[0] || 'Sort by')}
            isSort
            className="flex-1 min-w-[130px]"
          />

          <button
            type="button"
            onClick={resetFilters}
            className={`font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer h-[32px] shrink-0 ${
              hasActiveFilters
                ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200 hover:bg-blue-100 shadow-2xs font-bold'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 shadow-2xs'
            }`}
          >
            <RotateCcw
              size={13}
              className={hasActiveFilters ? 'text-[#1D4ED8]' : 'text-slate-500'}
            />
            <span className="whitespace-nowrap">Reset Filter</span>
            {hasActiveFilters && <span className="size-1.5 rounded-full bg-[#1D4ED8]" />}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 4. MAIN UNIFIED WORKSPACE CARD (PERSIS STRUKTUR EDK MONITORING)    */}
      {/* ================================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Status Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <span className="text-slate-500 font-medium">Last Update :</span>
            <b className="font-bold text-slate-800">{currentData.dateLabel}</b>
            <span className="text-slate-300 mx-1">•</span>
            <span className="text-slate-500">
              Sumber: <b className="text-slate-700">{currentData.source}</b>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 shrink-0">
              {[
                'Milestone & Status',
                'Performa AM',
                'Umur & Jenis',
                'Produk & Move',
                'Semua Tabel',
              ].map((m) => {
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer focus:outline-none ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/70'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workspace Content Area */}
        <div className="p-5 md:p-6 space-y-6 bg-slate-50/30">
          {filterScopeNotes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/80 text-amber-800 rounded-xl px-4 py-3 text-[11.5px] leading-relaxed">
              <p className="font-bold mb-1">Catatan filter</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {filterScopeNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {/* ============================================================== */}
          {/* VIEW 1: MILESTONE & STATUS (DEFAULT)                           */}
          {/* ============================================================== */}
          {(mode === 'Milestone & Status' || mode === 'Semua Tabel') && (
            <div className="space-y-5">
              {/* Executive Highlight Banner */}
              {mode === 'Milestone & Status' && (
                <div className="bg-gradient-to-r from-[#0F4FC2] via-[#1A54C8] to-[#1E52BF] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <Layers size={22} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-bold tracking-tight text-white">
                        Rekapitulasi Posisi Milestone & Pergerakan Status Order
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        Klik pada salah satu tabel di bawah untuk menampilkan grafik perbandingan milestone secara interaktif
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-bold tracking-wider text-white/75 uppercase">
                        STATUS BERGERAK (BEF → CUR)
                      </p>
                      <p className="text-2xl font-extrabold text-white mt-0.5">
                        +9 Complete
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                {/* Tabel 1: Posisi Milestone per Divisi */}
                <TableSectionBox
                  id="milestoneDivisi"
                  title="Posisi Milestone per Divisi"
                  subtitle="Berdasarkan UPDATE STATUS CURRENT, urut sesuai alur order"
                  badgeText="PER DIVISI"
                  isOpen={openCharts.milestoneDivisi}
                  onToggle={() => toggleChart('milestoneDivisi')}
                  onOpenModal={(id, title, subtitle, chart) =>
                    setModalChart({ id, title, subtitle, chart })
                  }
                  chartElement={
                    <ChartMilestonePerDivisi
                      data={{ ...currentData.milestonePerDivisi, rows: filteredMilestoneRows }}
                      selectedRow={selectedRows.milestoneDivisi}
                      onSelectRow={(r) => handleSelectRow('milestoneDivisi', r)}
                    />
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0F172A] text-white font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-3.5 text-left rounded-tl-xl">Milestone</th>
                          <th className="py-3 px-2.5 text-right">DGS</th>
                          <th className="py-3 px-2.5 text-right">RBS</th>
                          <th className="py-3 px-2.5 text-right">DPS</th>
                          <th className="py-3 px-2.5 text-right">DSS</th>
                          <th className="py-3 px-3 text-right">Total</th>
                          <th className="py-3 px-3.5 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {filteredMilestoneRows.map((r) => {
                          const isSelected = selectedRows.milestoneDivisi === r.milestone;
                          return (
                            <tr
                              key={r.milestone}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRow(
                                  'milestoneDivisi',
                                  isSelected ? null : r.milestone
                                );
                              }}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/90 font-semibold'
                                  : 'bg-white hover:bg-blue-50/40'
                              }`}
                            >
                              <td className="py-3 px-3.5 font-medium text-slate-800">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold leading-none ${
                                    STATUS_BADGE[r.milestone] || 'text-slate-700'
                                  }`}
                                >
                                  {r.milestone}
                                </span>
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'DGS'
                                )}`}
                              >
                                {fmtNum(r.dgs)}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'RBS'
                                )}`}
                              >
                                {fmtNum(r.rbs)}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'DPS'
                                )}`}
                              >
                                {fmtNum(r.dps)}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'DSS'
                                )}`}
                              >
                                {fmtNum(r.dss)}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {fmtNum(r.total)}
                              </td>
                              <td className="py-3 px-3.5 text-right font-semibold text-slate-700 tabular-nums">
                                {fmtNilai(r.nilai)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                          <td className="py-3 px-3.5">TOTAL</td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(milestoneTotal.dgs)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(milestoneTotal.rbs)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(milestoneTotal.dps)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(milestoneTotal.dss)}
                          </td>
                          <td className="py-3 px-3 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNum(milestoneTotal.total)}
                          </td>
                          <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNilai(milestoneTotal.nilai)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </TableSectionBox>

                {/* Tabel 2: Pergerakan Status */}
                <TableSectionBox
                  id="pergerakanStatus"
                  title="Pergerakan Status"
                  subtitle="Jumlah order per milestone, before vs current"
                  badgeText="BEF VS AFTER"
                  isOpen={openCharts.pergerakanStatus}
                  onToggle={() => toggleChart('pergerakanStatus')}
                  onOpenModal={(id, title, subtitle, chart) =>
                    setModalChart({ id, title, subtitle, chart })
                  }
                  chartElement={
                    <ChartPergerakanStatus
                      data={{ ...currentData.pergerakanStatus, rows: filteredPergerakanRows }}
                      selectedRow={selectedRows.pergerakanStatus}
                      onSelectRow={(r) => handleSelectRow('pergerakanStatus', r)}
                    />
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0F172A] text-white font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-3.5 text-left rounded-tl-xl">Milestone</th>
                          <th className="py-3 px-3 text-right">Before</th>
                          <th className="py-3 px-3 text-right">After</th>
                          <th className="py-3 px-3 text-right">Selisih</th>
                          <th className="py-3 px-3.5 text-right rounded-tr-xl">% Porsi After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {filteredPergerakanRows.map((r) => {
                          const isSelected = selectedRows.pergerakanStatus === r.milestone;
                          return (
                            <tr
                              key={r.milestone}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRow(
                                  'pergerakanStatus',
                                  isSelected ? null : r.milestone
                                );
                              }}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/90 font-semibold'
                                  : 'bg-white hover:bg-blue-50/40'
                              }`}
                            >
                              <td className="py-3 px-3.5 font-medium text-slate-800">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold leading-none ${
                                    STATUS_BADGE[r.milestone] || 'text-slate-700'
                                  }`}
                                >
                                  {r.milestone}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                                {fmtNum(r.before)}
                              </td>
                              <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-900">
                                {fmtNum(r.after)}
                              </td>
                              <td
                                className={`py-3 px-3 text-right font-bold tabular-nums ${
                                  r.selisih > 0
                                    ? 'text-emerald-600'
                                    : r.selisih < 0
                                    ? 'text-blue-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {fmtSelisih(r.selisih)}
                              </td>
                              <td className="py-3 px-3.5 text-right font-semibold tabular-nums text-slate-700">
                                {r.porsiAfter > 0 ? `${r.porsiAfter.toFixed(1)}%` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                          <td className="py-3 px-3.5">TOTAL</td>
                          <td className="py-3 px-3 text-right tabular-nums">
                            {fmtNum(pergerakanTotal.before)}
                          </td>
                          <td className="py-3 px-3 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNum(pergerakanTotal.after)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">-</td>
                          <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                            {pergerakanTotal.porsiAfter.toFixed(1)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </TableSectionBox>
              </div>

              {/* Tabel 3: Rincian Alur Order per Divisi */}
              <TableSectionBox
                id="milestoneDetail"
                title="Posisi Milestone per Divisi (Rincian Tahapan Alur Order)"
                subtitle="Berdasarkan UPDATE STATUS CURRENT, urut sesuai tahapan provisioning, BASO, dan billing"
                badgeText="10 TAHAPAN ALUR"
                isOpen={openCharts.milestoneDetail}
                onToggle={() => toggleChart('milestoneDetail')}
                onOpenModal={(id, title, subtitle, chart) =>
                  setModalChart({ id, title, subtitle, chart })
                }
                chartElement={
                  <ChartDetailMilestone
                    data={{ ...currentData.milestoneDetailPerDivisi, rows: filteredDetailRows }}
                    selectedRow={selectedRows.milestoneDetail}
                    onSelectRow={(r) => handleSelectRow('milestoneDetail', r)}
                  />
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#0F172A] text-white font-bold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4 text-left rounded-tl-xl">
                          Milestone (Tahapan Order)
                        </th>
                        <th className="py-3 px-3 text-right">DGS</th>
                        <th className="py-3 px-3 text-right">RBS</th>
                        <th className="py-3 px-3 text-right">DPS</th>
                        <th className="py-3 px-3 text-right">DSS</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-4 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {filteredDetailRows.map((r) => {
                        const isSelected = selectedRows.milestoneDetail === r.milestone;
                        const isFailed = r.milestone.includes('FAILED');
                        return (
                          <tr
                            key={r.milestone}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRow(
                                'milestoneDetail',
                                isSelected ? null : r.milestone
                              );
                            }}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-blue-50/90 font-semibold'
                                : 'bg-white hover:bg-blue-50/40'
                            }`}
                          >
                            <td
                              className={`py-2.5 px-4 font-semibold ${
                                isFailed ? 'text-red-600' : 'text-slate-800'
                              }`}
                            >
                              {r.milestone}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right tabular-nums text-slate-700 ${divColHighlight(
                                'DGS'
                              )}`}
                            >
                              {fmtNum(r.dgs)}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right tabular-nums text-slate-700 ${divColHighlight(
                                'RBS'
                              )}`}
                            >
                              {fmtNum(r.rbs)}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right tabular-nums text-slate-700 ${divColHighlight(
                                'DPS'
                              )}`}
                            >
                              {fmtNum(r.dps)}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right tabular-nums text-slate-700 ${divColHighlight(
                                'DSS'
                              )}`}
                            >
                              {fmtNum(r.dss)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                              {fmtNum(r.total)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-slate-700 tabular-nums">
                              {fmtNilai(r.nilai)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                        <td className="py-3 px-4">TOTAL</td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {fmtNum(detailTotal.dgs)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {fmtNum(detailTotal.rbs)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {fmtNum(detailTotal.dps)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {fmtNum(detailTotal.dss)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#1D4ED8] tabular-nums">
                          {fmtNum(detailTotal.total)}
                        </td>
                        <td className="py-3 px-4 text-right text-[#1D4ED8] tabular-nums">
                          {fmtNilai(detailTotal.nilai)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </TableSectionBox>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2: PERFORMA ACCOUNT MANAGER (GAYA GROUPED SEPERTI EDK)    */}
          {/* ============================================================== */}
          {(mode === 'Performa AM' || mode === 'Semua Tabel') && (
            <div className="space-y-5">
              {mode === 'Performa AM' && (
                <div className="bg-gradient-to-r from-[#0F4FC2] via-[#1A54C8] to-[#1E52BF] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <Users size={22} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-bold tracking-tight text-white">
                        Performa Milestone Account Manager (RBS & LEGS)
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        Total 20 Account Manager • Klik tabel AM RBS atau AM LEGS untuk membuka grafik perbandingan beban kerja AM
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl border border-white/20 shrink-0">
                    {['Semua Segmen', 'Segmen RBS', 'Segmen LEGS'].map((sg) => (
                      <button
                        key={sg}
                        type="button"
                        onClick={() => setAmGroupFilter(sg)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none ${
                          amGroupFilter === sg
                            ? 'bg-white text-[#06246A] font-bold shadow-2xs'
                            : 'text-white/85 hover:text-white'
                        }`}
                      >
                        {sg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`grid grid-cols-1 ${
                  amGroupFilter === 'Semua Segmen' ? 'xl:grid-cols-2' : ''
                } gap-5 items-start`}
              >
                {/* Tabel 4: AM RBS */}
                {(amGroupFilter === 'Semua Segmen' || amGroupFilter === 'Segmen RBS') && (
                  <TableSectionBox
                    id="amRbs"
                    title="Posisi Milestone per AM RBS"
                    subtitle="Berdasarkan data current Account Manager Segmen RBS"
                    badgeText="SEGMEN RBS (149 ORDER)"
                    isOpen={openCharts.amRbs}
                    onToggle={() => toggleChart('amRbs')}
                    onOpenModal={(id, title, subtitle, chart) =>
                      setModalChart({ id, title, subtitle, chart })
                    }
                    chartElement={
                      <ChartAmMilestone
                        title="Posisi Milestone per AM RBS"
                        rows={filteredAmRbs}
                        selectedRow={selectedRows.amRbs}
                        onSelectRow={(r) => handleSelectRow('amRbs', r)}
                      />
                    }
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0F172A] text-white font-bold uppercase text-[10.5px] tracking-wider">
                            <th className="py-3 px-3.5 text-left rounded-tl-xl">Nama AM</th>
                            <th className="py-3 px-2 text-right">Pending</th>
                            <th className="py-3 px-2 text-right">In Progress</th>
                            <th className="py-3 px-2 text-right">Failed</th>
                            <th className="py-3 px-2 text-right">Pending Cancel</th>
                            <th className="py-3 px-2 text-right">Complete</th>
                            <th className="py-3 px-2.5 text-right">Total</th>
                            <th className="py-3 px-3.5 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70">
                          {filteredAmRbs.map((r) => {
                            const isSelected = selectedRows.amRbs === r.nama;
                            return (
                              <tr
                                key={r.nama}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectRow('amRbs', isSelected ? null : r.nama);
                                }}
                                className={`transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50/90 font-semibold'
                                    : 'bg-white hover:bg-blue-50/40'
                                }`}
                              >
                                <td className="py-2.5 px-3.5 font-semibold text-slate-800 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-[#2563EB] shrink-0" />
                                    <span>{r.nama}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                                  {fmtNum(r.pending)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-blue-700 font-medium">
                                  {fmtNum(r.inProgress)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-red-600 font-medium">
                                  {fmtNum(r.failed)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-slate-400">
                                  {fmtNum(r.pendingCancel)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700 font-medium">
                                  {fmtNum(r.complete)}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 tabular-nums">
                                  {fmtNum(r.total)}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 tabular-nums">
                                  {fmtNilai(r.nilai)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                            <td className="py-3 px-3.5">SUBTOTAL AM RBS</td>
                            <td className="py-3 px-2 text-right tabular-nums">
                              {fmtNum(amRbsTotal.pending)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums">
                              {fmtNum(amRbsTotal.inProgress)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums text-red-600">
                              {fmtNum(amRbsTotal.failed)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums">
                              {fmtNum(amRbsTotal.pendingCancel)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums text-emerald-700">
                              {fmtNum(amRbsTotal.complete)}
                            </td>
                            <td className="py-3 px-2.5 text-right text-[#1D4ED8] tabular-nums">
                              {fmtNum(amRbsTotal.total)}
                            </td>
                            <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                              {fmtNilai(amRbsTotal.nilai)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </TableSectionBox>
                )}

                {/* Tabel 5: AM LEGS */}
                {(amGroupFilter === 'Semua Segmen' || amGroupFilter === 'Segmen LEGS') && (
                  <TableSectionBox
                    id="amLegs"
                    title="Posisi Milestone per AM LEGS"
                    subtitle="Berdasarkan data current Account Manager Segmen LEGS (DGS, DPS, DSS)"
                    badgeText="SEGMEN LEGS (194 ORDER)"
                    isOpen={openCharts.amLegs}
                    onToggle={() => toggleChart('amLegs')}
                    onOpenModal={(id, title, subtitle, chart) =>
                      setModalChart({ id, title, subtitle, chart })
                    }
                    chartElement={
                      <ChartAmMilestone
                        title="Posisi Milestone per AM LEGS"
                        rows={filteredAmLegs}
                        selectedRow={selectedRows.amLegs}
                        onSelectRow={(r) => handleSelectRow('amLegs', r)}
                      />
                    }
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0F172A] text-white font-bold uppercase text-[10.5px] tracking-wider">
                            <th className="py-3 px-3.5 text-left rounded-tl-xl">Nama AM</th>
                            <th className="py-3 px-2 text-right">Pending</th>
                            <th className="py-3 px-2 text-right">In Progress</th>
                            <th className="py-3 px-2 text-right">Failed</th>
                            <th className="py-3 px-2 text-right">Pending Cancel</th>
                            <th className="py-3 px-2 text-right">Complete</th>
                            <th className="py-3 px-2.5 text-right">Total</th>
                            <th className="py-3 px-3.5 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70">
                          {filteredAmLegs.map((r) => {
                            const isSelected = selectedRows.amLegs === r.nama;
                            return (
                              <tr
                                key={r.nama}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectRow('amLegs', isSelected ? null : r.nama);
                                }}
                                className={`transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50/90 font-semibold'
                                    : 'bg-white hover:bg-blue-50/40'
                                }`}
                              >
                                <td className="py-2.5 px-3.5 font-semibold text-slate-800 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-[#0F172A] shrink-0" />
                                    <span>{r.nama}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                                  {fmtNum(r.pending)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-blue-700 font-medium">
                                  {fmtNum(r.inProgress)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-red-600 font-medium">
                                  {fmtNum(r.failed)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-slate-400">
                                  {fmtNum(r.pendingCancel)}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700 font-medium">
                                  {fmtNum(r.complete)}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 tabular-nums">
                                  {fmtNum(r.total)}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 tabular-nums">
                                  {fmtNilai(r.nilai)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                            <td className="py-3 px-3.5">SUBTOTAL AM LEGS</td>
                            <td className="py-3 px-2 text-right tabular-nums">
                              {fmtNum(amLegsTotal.pending)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums">
                              {fmtNum(amLegsTotal.inProgress)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums text-red-600">
                              {fmtNum(amLegsTotal.failed)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums">
                              {fmtNum(amLegsTotal.pendingCancel)}
                            </td>
                            <td className="py-3 px-2 text-right tabular-nums text-emerald-700">
                              {fmtNum(amLegsTotal.complete)}
                            </td>
                            <td className="py-3 px-2.5 text-right text-[#1D4ED8] tabular-nums">
                              {fmtNum(amLegsTotal.total)}
                            </td>
                            <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                              {fmtNilai(amLegsTotal.nilai)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </TableSectionBox>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 3: UMUR ORDER & JENIS ORDER (BOTTLENECK AGING)            */}
          {/* ============================================================== */}
          {(mode === 'Umur & Jenis' || mode === 'Semua Tabel') && (
            <div className="space-y-5">
              {mode === 'Umur & Jenis' && (
                <div className="bg-gradient-to-r from-[#0F4FC2] via-[#1A54C8] to-[#1E52BF] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <Clock size={22} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-bold tracking-tight text-white">
                        Evaluasi Aging Umur Order & Jenis Transaksi (Subtype)
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        Terdapat <b className="text-white">127 order (&gt; 60 Hari)</b> senilai{' '}
                        <b className="text-white">Rp {formatRupiahShort(1945.9)}</b> yang memerlukan percepatan eksekusi terutama pada DGS & DSS

                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] font-bold tracking-wider text-white/75 uppercase">
                      NILAI ORDER &gt; 60 HARI
                    </p>
                    <p className="text-2xl font-extrabold text-white mt-0.5">Rp {formatRupiahShort(1945.9)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                {/* Tabel 6: Umur Order per Divisi */}
                <TableSectionBox
                  id="umurOrder"
                  title="Umur Order per Divisi"
                  subtitle="Kolom RANGE pada sheet Data"
                  badgeText="AGING ORDER"
                  isOpen={openCharts.umurOrder}
                  onToggle={() => toggleChart('umurOrder')}
                  onOpenModal={(id, title, subtitle, chart) =>
                    setModalChart({ id, title, subtitle, chart })
                  }
                  chartElement={
                    <ChartUmurOrderPerDivisi
                      data={{ ...currentData.umurOrderPerDivisi, rows: filteredUmurRows }}
                      selectedRow={selectedRows.umurOrder}
                      onSelectRow={(r) => handleSelectRow('umurOrder', r)}
                    />
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0F172A] text-white font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-3.5 text-left rounded-tl-xl">Range Umur</th>
                          <th className="py-3 px-2.5 text-right">DGS</th>
                          <th className="py-3 px-2.5 text-right">RBS</th>
                          <th className="py-3 px-2.5 text-right">DPS</th>
                          <th className="py-3 px-2.5 text-right">DSS</th>
                          <th className="py-3 px-3 text-right">Total</th>
                          <th className="py-3 px-3.5 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {filteredUmurRows.map((r) => {
                          const isSelected = selectedRows.umurOrder === r.range;
                          return (
                            <tr
                              key={r.range}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRow('umurOrder', isSelected ? null : r.range);
                              }}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/90 font-semibold'
                                  : r.highlight
                                  ? 'bg-red-50/40 hover:bg-red-50/70'
                                  : 'bg-white hover:bg-blue-50/40'
                              }`}
                            >
                              <td
                                className={`py-3 px-3.5 font-semibold ${
                                  r.highlight ? 'text-red-600 font-bold' : 'text-slate-800'
                                }`}
                              >
                                {r.range}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums ${
                                  r.highlight ? 'text-red-600 font-bold' : 'text-slate-700'
                                } ${divColHighlight('DGS')}`}
                              >
                                {fmtNum(r.dgs)}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums ${
                                  r.highlight ? 'text-red-600 font-bold' : 'text-slate-700'
                                } ${divColHighlight('RBS')}`}
                              >
                                {fmtNum(r.rbs)}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums ${
                                  r.highlight ? 'text-red-600 font-bold' : 'text-slate-700'
                                } ${divColHighlight('DPS')}`}
                              >
                                {fmtNum(r.dps)}
                              </td>
                              <td
                                className={`py-3 px-2.5 text-right tabular-nums ${
                                  r.highlight ? 'text-red-600 font-bold' : 'text-slate-700'
                                } ${divColHighlight('DSS')}`}
                              >
                                {fmtNum(r.dss)}
                              </td>
                              <td
                                className={`py-3 px-3 text-right font-extrabold tabular-nums ${
                                  r.highlight ? 'text-red-600' : 'text-slate-900'
                                }`}
                              >
                                {fmtNum(r.total)}
                              </td>
                              <td
                                className={`py-3 px-3.5 text-right font-semibold tabular-nums ${
                                  r.highlight ? 'text-red-600 font-bold' : 'text-slate-700'
                                }`}
                              >
                                {fmtNilai(r.nilai)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                          <td className="py-3 px-3.5">TOTAL</td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(umurTotal.dgs)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(umurTotal.rbs)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(umurTotal.dps)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(umurTotal.dss)}
                          </td>
                          <td className="py-3 px-3 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNum(umurTotal.total)}
                          </td>
                          <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNilai(umurTotal.nilai)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </TableSectionBox>

                {/* Tabel 7: Jenis Order */}
                <TableSectionBox
                  id="jenisOrder"
                  title="Jenis Order (Order Subtype)"
                  subtitle="Jumlah, umur > 60 hari, failed, dan nilai"
                  badgeText="7 SUBTYPE"
                  isOpen={openCharts.jenisOrder}
                  onToggle={() => toggleChart('jenisOrder')}
                  onOpenModal={(id, title, subtitle, chart) =>
                    setModalChart({ id, title, subtitle, chart })
                  }
                  chartElement={
                    <ChartJenisOrder
                      data={{ ...currentData.jenisOrder, rows: filteredJenisOrder }}
                      selectedRow={selectedRows.jenisOrder}
                      onSelectRow={(r) => handleSelectRow('jenisOrder', r)}
                    />
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0F172A] text-white font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-3.5 text-left rounded-tl-xl">Order Subtype</th>
                          <th className="py-3 px-3 text-right">Jumlah</th>
                          <th className="py-3 px-3 text-right">&gt; 60 Hari</th>
                          <th className="py-3 px-3 text-right">Failed</th>
                          <th className="py-3 px-3.5 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {filteredJenisOrder.map((r) => {
                          const isSelected = selectedRows.jenisOrder === r.subtype;
                          return (
                            <tr
                              key={r.subtype}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRow('jenisOrder', isSelected ? null : r.subtype);
                              }}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/90 font-semibold'
                                  : 'bg-white hover:bg-blue-50/40'
                              }`}
                            >
                              <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                                {r.subtype}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {fmtNum(r.jumlah)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-amber-700 tabular-nums">
                                {fmtNum(r.gt60)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-red-600 tabular-nums">
                                {fmtNum(r.failed)}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 tabular-nums">
                                {fmtNilai(r.nilai)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                          <td className="py-3 px-3.5">TOTAL</td>
                          <td className="py-3 px-3 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNum(currentData.jenisOrder.total.jumlah)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">
                            {fmtNum(currentData.jenisOrder.total.gt60)}
                          </td>
                          <td className="py-3 px-3 text-right text-red-600 tabular-nums">
                            {fmtNum(currentData.jenisOrder.total.failed)}
                          </td>
                          <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNilai(currentData.jenisOrder.total.nilai)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </TableSectionBox>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 4: PRODUK PER DIVISI & DAFTAR ORDER BERGERAK              */}
          {/* ============================================================== */}
          {(mode === 'Produk & Move' || mode === 'Semua Tabel') && (
            <div className="space-y-5">
              {mode === 'Produk & Move' && (
                <div className="bg-gradient-to-r from-[#0F4FC2] via-[#1A54C8] to-[#1E52BF] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <Package size={22} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-bold tracking-tight text-white">
                        Top 12 Produk per Divisi & Daftar Order Bergerak (MOVE)
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5">
                        Volume tertinggi: <b className="text-white">Wifi Managed Service (94)</b> &{' '}
                        <b className="text-white">ASTINet (79)</b> • Nilai tertinggi:{' '}
                        <b className="text-white">IP Transit (Rp 895,8 Jt)</b>
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] font-bold tracking-wider text-white/75 uppercase">
                      ORDER BERGERAK (MOVE)
                    </p>
                    <p className="text-2xl font-extrabold text-white mt-0.5">
                      {filteredOrderBergerak.length} Order Aktif
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                {/* Tabel 8: Produk per Divisi */}
                <TableSectionBox
                  id="produkDivisi"
                  title="Produk per Divisi"
                  subtitle="12 produk dengan jumlah order terbanyak"
                  badgeText="TOP 12 PRODUK"
                  isOpen={openCharts.produkDivisi}
                  onToggle={() => toggleChart('produkDivisi')}
                  onOpenModal={(id, title, subtitle, chart) =>
                    setModalChart({ id, title, subtitle, chart })
                  }
                  chartElement={
                    <ChartProdukPerDivisi
                      rows={filteredProduk}
                      selectedRow={selectedRows.produkDivisi}
                      onSelectRow={(r) => handleSelectRow('produkDivisi', r)}
                    />
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0F172A] text-white font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-3.5 text-left rounded-tl-xl">Produk</th>
                          <th className="py-3 px-2.5 text-right">DGS</th>
                          <th className="py-3 px-2.5 text-right">RBS</th>
                          <th className="py-3 px-2.5 text-right">DPS</th>
                          <th className="py-3 px-2.5 text-right">DSS</th>
                          <th className="py-3 px-3 text-right">Total</th>
                          <th className="py-3 px-3.5 text-right rounded-tr-xl">Nilai (Rp Jt)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {filteredProduk.map((r) => {
                          const isSelected = selectedRows.produkDivisi === r.produk;
                          return (
                            <tr
                              key={r.produk}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRow('produkDivisi', isSelected ? null : r.produk);
                              }}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/90 font-semibold'
                                  : 'bg-white hover:bg-blue-50/40'
                              }`}
                            >
                              <td
                                className={`py-2.5 px-3.5 font-semibold text-slate-800 ${
                                  r.isItalic ? 'italic text-slate-600' : ''
                                }`}
                              >
                                {r.produk}
                              </td>
                              <td
                                className={`py-2.5 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'DGS'
                                )}`}
                              >
                                {fmtNum(r.dgs)}
                              </td>
                              <td
                                className={`py-2.5 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'RBS'
                                )}`}
                              >
                                {fmtNum(r.rbs)}
                              </td>
                              <td
                                className={`py-2.5 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'DPS'
                                )}`}
                              >
                                {fmtNum(r.dps)}
                              </td>
                              <td
                                className={`py-2.5 px-2.5 text-right tabular-nums text-slate-700 ${divColHighlight(
                                  'DSS'
                                )}`}
                              >
                                {fmtNum(r.dss)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {fmtNum(r.total)}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 tabular-nums">
                                {fmtNilai(r.nilai)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#EFF6FF] border-t-2 border-slate-300 font-extrabold text-slate-900">
                          <td className="py-3 px-3.5">TOTAL</td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(produkTotal.dgs)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(produkTotal.rbs)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(produkTotal.dps)}
                          </td>
                          <td className="py-3 px-2.5 text-right tabular-nums">
                            {fmtNum(produkTotal.dss)}
                          </td>
                          <td className="py-3 px-3 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNum(produkTotal.total)}
                          </td>
                          <td className="py-3 px-3.5 text-right text-[#1D4ED8] tabular-nums">
                            {fmtNilai(produkTotal.nilai)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </TableSectionBox>

                {/* Tabel 9: Daftar Order yang Bergerak */}
                <TableSectionBox
                  id="orderBergerak"
                  title="Daftar Order yang Bergerak"
                  subtitle='Otomatis dari kolom STATUS = "MOVE" (maks. 12 baris)'
                  badgeText={`${filteredOrderBergerak.length} ORDER MOVE`}
                  isOpen={openCharts.orderBergerak}
                  onToggle={() => toggleChart('orderBergerak')}
                  onOpenModal={(id, title, subtitle, chart) =>
                    setModalChart({ id, title, subtitle, chart })
                  }
                  chartElement={<ChartOrderBergerak rows={filteredOrderBergerak} />}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0F172A] text-white font-bold uppercase text-[10.5px] tracking-wider">
                          <th className="py-3 px-3.5 text-left rounded-tl-xl">Pelanggan</th>
                          <th className="py-3 px-2.5 text-left">Produk</th>
                          <th className="py-3 px-2.5 text-center">Status 13/10</th>
                          <th className="py-3 px-2.5 text-center">Status 15/10</th>
                          <th className="py-3 px-2.5 text-center">Divisi</th>
                          <th className="py-3 px-3 text-right rounded-tr-xl">Baris</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {filteredOrderBergerak.map((r) => (
                          <tr
                            key={r.baris}
                            className="bg-white hover:bg-blue-50/40 transition-colors"
                          >
                            <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                              {r.pelanggan}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-700">{r.produk}</td>
                            <td className="py-2.5 px-2.5 text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold leading-none ${
                                  STATUS_BADGE[r.statusBefore] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {r.statusBefore}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold leading-none ${
                                  STATUS_BADGE[r.statusAfter] || 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {r.statusAfter}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-md text-[10.5px] font-bold leading-none ${
                                  DIVISI_COLORS[r.divisi]?.badge || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {r.divisi}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                              {r.baris}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TableSectionBox>
              </div>
            </div>
          )}
        </div>

        {/* Footer Catatan di dalam Main Card */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-start gap-3">
          <div className="size-7 rounded-lg bg-blue-50 text-[#2563EB] grid place-items-center shrink-0 mt-0.5">
            <Info size={14} />
          </div>
          <div className="text-[11px] text-slate-500 space-y-1">
            <b className="text-slate-700 uppercase tracking-wider block">
              Catatan Dashboard Monitoring Order SJT:
            </b>
            {CATATAN_DASHBOARD.map((note, idx) => (
              <p key={idx}>• {note}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Upload Report Modal */}
      <UploadOrderModal open={showUpload} onClose={() => setShowUpload(false)} />

      {/* Modal Grafik Layar Penuh */}
      {modalChart &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setModalChart(null)}
          >
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 animate-[fadeIn_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="bg-blue-50 text-[#1D4ED8] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Visualisasi Grafik Interaktif
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
                    {modalChart.title}
                  </h3>
                  <p className="text-xs text-slate-500">{modalChart.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalChart(null)}
                  className="size-8.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 grid place-items-center cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-3">{modalChart.chart}</div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
