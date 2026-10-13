import { useMemo, useState, Fragment } from 'react';
import { filterOptions, modes, topPelangganBySegmen } from '../data/edkData';
import { ExportButton, exportCSV, ShareDropdown } from '../components/ui';
import FilterDropdown from '../components/FilterDropdown';
import {
  Filter,
  Upload,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Check,
  Building2,
  ArrowUpDown,
  AlignLeft,
  ChevronDown
} from 'lucide-react';

const formatRupiah = (val) => {
  if (val === undefined || val === null || val === '-') return '-';
  const isNegative = val < 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('id-ID');
  return isNegative ? `-${formatted}` : formatted;
};

const cellFmt = (v) => {
  if (v === undefined || v === null || v === '-') return '-';
  return v.toLocaleString('id-ID');
};

function UploadModal({ open, onClose }) {
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleUpload = () => {
    if (!files.length) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setFiles([]);
        onClose();
      }, 1500);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Report EDK</h2>
            <p className="text-xs text-slate-500 mt-0.5">Format yang didukung: XLSX, CSV, PDF (maks 10MB)</p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              drag ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
          >
            <div className="mx-auto size-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mb-3">
              <Upload size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Drag & drop file report atau klik untuk pilih</p>
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx), CSV (.csv), atau PDF</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
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
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
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
            {done && <><Check size={14} /> Berhasil</>}
            {uploading && <><span className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengunggah...</>}
            {!done && !uploading && <><Upload size={14} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const AM_GROUP_SUBTOTALS = {
  'Segmen DGS': { order: 172, abon: 65138000, auto: 0, inprog: 0 },
  'Segmen DPS': { order: 183, abon: 84220000, auto: 0, inprog: 39 },
  'Segmen DSS': { order: 145, abon: 76884000, auto: 20, inprog: 9 },
  'Segmen RBS': { order: 120, abon: 54200000, auto: 0, inprog: 12 }
};

export default function Edk() {
  const [mode, setMode] = useState('Nama AM');
  const [activeSegmen, setActiveSegmen] = useState('DGS');
  const [showUpload, setShowUpload] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  // Filter States
  const [selectedPeriode, setSelectedPeriode] = useState([]);
  const [selectedSegmen, setSelectedSegmen] = useState([]);
  const [selectedNamaAm, setSelectedNamaAm] = useState([]);
  const [selectedFlagging, setSelectedFlagging] = useState([]);
  const [sortOrder, setSortOrder] = useState('Sort by'); // 'Sort by', 'A-Z', 'Z-A'

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedPeriode([]);
    setSelectedNamaAm([]);
    setSelectedFlagging([]);
    setPageIndex(0);

    if (newMode === 'Nama CC') {
      setSelectedSegmen(['DGS']);
      setActiveSegmen('DGS');
      setSortOrder('A-Z');
    } else {
      setSelectedSegmen([]);
      setSortOrder('Sort by');
    }
  };

  const handleSegmenFilterChange = (segs) => {
    setSelectedSegmen(segs);
    if (segs.length > 0 && ['RBS', 'DGS', 'DPS', 'DSS'].includes(segs[0])) {
      setActiveSegmen(segs[0]);
    } else if (segs.length === 0) {
      setActiveSegmen('DGS');
    }
  };

  const resetFilters = () => {
    setSelectedPeriode([]);
    if (mode === 'Nama CC') {
      setSelectedSegmen(['DGS']);
      setActiveSegmen('DGS');
      setSortOrder('A-Z');
    } else {
      setSelectedSegmen([]);
      setSortOrder('Sort by');
    }
    setSelectedNamaAm([]);
    setSelectedFlagging([]);
    setPageIndex(0);
  };

  // Top 10 View is active ONLY for Nama CC
  const isTop10View = mode === 'Nama CC';

  // Top 10 data for active segment (Nama CC)
  const top10List = useMemo(() => {
    let list = topPelangganBySegmen[activeSegmen] || topPelangganBySegmen['DGS'] || [];
    let enriched = list.map((r) => {
      const to = (r.lc || 0) + (r.lp || 0) + (r.tc || 0) + (r.tp || 0) + (r.k || 0) + (r.b || 0);
      const ta2 = (r.la || 0) + (r.lpa || 0) + (r.ta || 0) + (r.tpa || 0) + (r.ka || 0) + (r.ba || 0);
      return { ...r, to, ta2 };
    });

    if (sortOrder === 'Z-A') {
      return [...enriched].sort((a, b) => b.l.localeCompare(a.l));
    }
    return enriched;
  }, [activeSegmen, sortOrder]);

  const top10TotalAbonemen = useMemo(() => {
    return top10List.reduce((acc, r) => acc + (r.ta2 || 0), 0);
  }, [top10List]);

  // General dataset for Segmen, Periode EDK & Nama AM
  const data = useMemo(() => {
    let list = modes[mode] || [];

    if (selectedPeriode.length > 0) {
      list = list.filter((r) => selectedPeriode.includes(r.periode) || selectedPeriode.includes(r.l));
    }
    if (selectedSegmen.length > 0) {
      list = list.filter((r) => selectedSegmen.includes(r.segmen) || selectedSegmen.includes(r.subgroup) || selectedSegmen.includes(r.l));
    }
    if (selectedNamaAm.length > 0) {
      list = list.filter((r) => selectedNamaAm.includes(r.namaAm) || selectedNamaAm.includes(r.l));
    }
    if (selectedFlagging.length > 0) {
      list = list.filter((r) => selectedFlagging.includes(r.flagging));
    }

    return list.map((r) => {
      const to = (r.lc || 0) + (r.lp || 0) + (r.tc || 0) + (r.tp || 0) + (r.k || 0) + (r.b || 0);
      const ta2 = (r.la || 0) + (r.lpa || 0) + (r.ta || 0) + (r.tpa || 0) + (r.ka || 0) + (r.ba || 0);
      return { ...r, to, ta2 };
    });
  }, [mode, selectedPeriode, selectedSegmen, selectedNamaAm, selectedFlagging]);

  // Grand Total for Periode EDK & Segmen
  const grandTotal = useMemo(() => {
    const list = modes[mode] || [];
    return list.reduce(
      (acc, r) => ({
        lc: acc.lc + (r.lc || 0),
        la: acc.la + (r.la || 0),
        lp: acc.lp + (r.lp || 0),
        lpa: acc.lpa + (r.lpa || 0),
        tc: acc.tc + (r.tc || 0),
        ta: acc.ta + (r.ta || 0),
        tp: acc.tp + (r.tp || 0),
        tpa: acc.tpa + (r.tpa || 0),
        k: acc.k + (r.k || 0),
        ka: acc.ka + (r.ka || 0),
        k_auto: acc.k_auto + (r.k_auto || 0),
        k_prog: acc.k_prog + (r.k_prog || 0),
        b: acc.b + (r.b || 0),
        ba: acc.ba + (r.ba || 0),
        to: acc.to + ((r.lc || 0) + (r.lp || 0) + (r.tc || 0) + (r.tp || 0) + (r.k || 0) + (r.b || 0)),
        ta2: acc.ta2 + ((r.la || 0) + (r.lpa || 0) + (r.ta || 0) + (r.tpa || 0) + (r.ka || 0) + (r.ba || 0))
      }),
      { lc: 0, la: 0, lp: 0, lpa: 0, tc: 0, ta: 0, tp: 0, tpa: 0, k: 0, ka: 0, k_auto: 0, k_prog: 0, b: 0, ba: 0, to: 0, ta2: 0 }
    );
  }, [mode]);

  // Groups for Nama AM
  const amGroups = useMemo(() => {
    if (mode !== 'Nama AM') return [];
    const list = data;
    const groups = [];
    const map = new Map();

    list.forEach((item) => {
      const groupKey = item.subgroup || 'Segmen DGS';
      if (!map.has(groupKey)) {
        const groupObj = {
          name: groupKey,
          subtotal: AM_GROUP_SUBTOTALS[groupKey] || item.subtotalData || { order: 0, abon: 0, auto: 0, inprog: 0 },
          items: []
        };
        map.set(groupKey, groupObj);
        groups.push(groupObj);
      }
      map.get(groupKey).items.push(item);
    });

    return groups;
  }, [mode, data]);

  // Active count for pagination
  const activeCount = isTop10View ? top10List.length : mode === 'Nama AM' ? 19 : data.length;

  return (
    <div id="edk-main-content" className="space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 tracking-tight">
            EDK Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring status NCX, OBL, update terakhir, dan total EDK
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time Indicator Pill */}
          <div className="bg-white border border-slate-200/90 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-2xs">
            <span className="size-2 rounded-full bg-[#2563EB]" />
            <span>Update Terkini Real-time</span>
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => {}}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Filter size={14} className="text-slate-500" />
            <span>Filter</span>
          </button>

          {/* Upload Report Button */}
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Upload Report</span>
          </button>

          {/* Export Dropdown Button */}
          <ExportButton
            onClick={() => exportCSV(isTop10View ? top10List : data, `EDK_Monitoring_${mode}`)}
            filename={`EDK_Monitoring_${mode}`}
          />

          {/* Salin & Bagikan Dropdown Button */}
          <ShareDropdown
            buttonLabel="Salin & Bagikan"
            captureSelector="#edk-main-content"
            tableSelector="table"
          />
        </div>
      </div>

      {/* 2. KPI Cards (Presisi Sesuai Semua Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Order */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            TOTAL ORDER
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            426
          </p>
          <p className="text-xs mt-1.5 flex items-center gap-1 text-emerald-600 font-semibold">
            <span>+12%</span>
            <span className="text-slate-400 font-normal">dari periode sebelumnya</span>
          </p>
        </div>

        {/* Total Abonemen */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            TOTAL ABONEMEN
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            Rp 328.221.859
          </p>
          <p className="text-xs mt-1.5 flex items-center gap-1 text-emerald-600 font-semibold">
            <span>+8%</span>
            <span className="text-slate-400 font-normal">dari periode sebelumnya</span>
          </p>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            IN PROGRESS
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            211
          </p>
          <p className="text-xs mt-1.5 text-slate-500">
            <span className="font-bold text-slate-800">49.5%</span>{' '}
            <span className="text-slate-400 font-normal">dari total order</span>
          </p>
        </div>

        {/* Complete */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            COMPLETE
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            215
          </p>
          <p className="text-xs mt-1.5 text-slate-500">
            <span className="font-bold text-slate-800">50.5%</span>{' '}
            <span className="text-slate-400 font-normal">dari total order</span>
          </p>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-wrap items-end justify-between gap-3">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-end gap-2.5">
          <FilterDropdown
            label="Periode EDK"
            options={filterOptions.periode}
            selected={selectedPeriode}
            onChange={setSelectedPeriode}
            multiColumn
          />

          <FilterDropdown
            label="Segmen"
            options={filterOptions.segmen}
            selected={selectedSegmen}
            onChange={handleSegmenFilterChange}
          />

          <FilterDropdown
            label="Nama AM"
            options={filterOptions.namaAm}
            selected={selectedNamaAm}
            onChange={setSelectedNamaAm}
          />

          <FilterDropdown
            label="Flagging Last Update"
            options={filterOptions.flagging}
            selected={selectedFlagging}
            onChange={setSelectedFlagging}
          />

          {/* Tampilkan Sort / Nama Pelanggan hanya pada mode selain Nama AM */}
          {mode !== 'Nama AM' && (
            <FilterDropdown
              label="Nama Pelanggan"
              options={['Sort by', 'Nama (A-Z)', 'Nama (Z-A)']}
              selected={[sortOrder]}
              onChange={(val) => setSortOrder(val[0] || 'Sort by')}
              isSort
            />
          )}

          <button
            type="button"
            onClick={resetFilters}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer h-[32px]"
          >
            <RotateCcw size={13} className="text-slate-500" />
            <span>Reset Filter</span>
          </button>
        </div>

        {/* Right: Mode Switcher Pills */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 shrink-0">
          {['Segmen', 'Periode EDK', 'Nama AM', 'Nama CC'].map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all rounded-lg cursor-pointer ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table Card */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Status Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#2563EB]" />
            <span className="text-slate-500 font-medium">Last Update :</span>
            <b className="font-bold text-slate-800">10 Oktober 2026</b>
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            {isTop10View ? (
              <>
                Top 10 Pelanggan <span className="mx-1">›</span> Berdasarkan Total Abonemen <span className="mx-1">›</span> Per Segmen
              </>
            ) : (
              <>
                Parent Group <span className="mx-1">→</span> Sub-Status <span className="mx-1">→</span> Metrik
              </>
            )}
          </div>
        </div>

        {/* Top 10 Pelanggan Banner Card (Hanya untuk Nama CC sesuai Screenshot 2 & 3) */}
        {isTop10View && (
          <div className="p-5 pb-0">
            <div className="bg-gradient-to-r from-[#0F4FC2] via-[#1A54C8] to-[#1E52BF] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Building2 size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                    Top 10 Pelanggan – Segmen {activeSegmen}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    Berdasarkan total abonemen terbesar (Rp) dari data EDX Treg3 September 2026
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">
                  TOTAL ABONEMEN (TOP 10)
                </p>
                <p className="text-2xl md:text-[26px] font-extrabold tracking-tight mt-0.5 text-white">
                  Rp {top10TotalAbonemen.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full text-xs border-collapse border-spacing-0">
            <thead className="bg-white shadow-2xs">
              {/* ======================================================== */}
              {/* MODE A: TOP 10 PELANGGAN (NAMA CC) */}
              {/* ======================================================== */}
              {isTop10View ? (
                <>
                  <tr>
                    <th
                      rowSpan={3}
                      className="sticky left-0 z-30 bg-slate-50 px-3 py-2.5 text-center font-bold text-xs text-slate-800 border-r border-b border-slate-300 w-10 align-middle shadow-[2px_0_4px_rgba(0,0,0,0.02)]"
                    >
                      #
                    </th>
                    <th
                      rowSpan={3}
                      className="sticky left-10 z-30 bg-slate-50 px-3.5 py-2.5 text-left font-bold text-xs text-slate-800 border-r border-b border-slate-300 min-w-[260px] align-middle shadow-[2px_0_4px_rgba(0,0,0,0.02)]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Nama Pelanggan</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th
                      colSpan={4}
                      className="bg-[#0284C7] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      LANJUT
                    </th>
                    <th
                      colSpan={4}
                      className="bg-[#1E3A8A] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      TIDAK LANJUT
                    </th>
                    <th
                      colSpan={2}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      BUKAN WITEL SOLO JT
                    </th>
                    <th
                      colSpan={2}
                      className="bg-[#2563EB] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      KONFIRMASI AM
                    </th>
                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2"
                    >
                      TOTAL EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      Semua Status
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      Semua Status
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5">
                      Semua Status
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-white text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200 font-bold">Order</th>
                    <th className="py-1.5 px-2 text-center font-bold">Abonemen</th>
                  </tr>
                </>
              ) : mode === 'Nama AM' ? (
                /* ======================================================== */
                /* MODE B: NAMA AM (PERSIS SESUAI SCREENSHOT TERBARU) */
                /* ======================================================== */
                <>
                  <tr>
                    <th
                      rowSpan={3}
                      className="sticky left-0 z-30 bg-white px-3.5 py-2.5 text-left font-bold text-xs text-slate-800 border-r border-b border-slate-300 min-w-[220px] align-middle shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                    >
                      Nama AM
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Tidak Lanjut
                    </th>

                    <th
                      colSpan={2}
                      className="bg-slate-100 text-slate-800 font-bold text-center text-xs py-2 border-r border-slate-300"
                    >
                      Bukan Witel Solo JT
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Konfirmasi AM
                    </th>

                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2"
                    >
                      Total EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-300 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>

                    {/* Konfirmasi AM sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      AUTO RENEWAL
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-300 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      IN PROGRESS
                    </th>

                    {/* Total EDK sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center bg-white text-slate-600 font-bold text-[10px] align-middle">
                      Abonemen
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-white text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen (Rp)</th>
                  </tr>
                </>
              ) : mode === 'Segmen' ? (
                /* ======================================================== */
                /* MODE C: SEGMEN REKAPITULASI */
                /* ======================================================== */
                <>
                  <tr>
                    <th
                      rowSpan={3}
                      className="sticky left-0 z-30 bg-white px-3.5 py-2.5 text-center font-bold text-xs text-slate-800 border-r border-b border-slate-300 min-w-[130px] align-middle shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                    >
                      Segmen
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Tidak Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Konfirmasi AM
                    </th>

                    <th
                      colSpan={2}
                      className="bg-slate-100 text-slate-800 font-bold text-center text-xs py-2 border-r border-slate-300"
                    >
                      Bukan Witel Solo JT
                    </th>

                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2"
                    >
                      Total EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>

                    {/* Konfirmasi AM sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      AUTO RENEWAL
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-300 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      IN PROGRESS
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-300 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>

                    {/* Total EDK sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center bg-white text-slate-600 font-bold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-white text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen (Rp)</th>
                  </tr>
                </>
              ) : (
                /* ======================================================== */
                /* MODE D: PERIODE EDK (SCREENSHOT 1) */
                /* ======================================================== */
                <>
                  <tr>
                    <th
                      rowSpan={3}
                      className="sticky left-0 z-30 bg-white px-3.5 py-2.5 text-center font-bold text-xs text-slate-800 border-r border-b border-slate-300 min-w-[140px] align-middle shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                    >
                      Periode EDK
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Tidak Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2 border-r border-white/20"
                    >
                      Konfirmasi AM
                    </th>

                    <th
                      colSpan={2}
                      className="bg-slate-100 text-slate-800 font-bold text-center text-xs py-2"
                    >
                      Bukan Witel Solo JT
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-200">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-50 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-slate-300">
                      In Progress
                    </th>

                    {/* Konfirmasi AM sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      AUTO RENEWAL
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-300 bg-white text-slate-600 font-bold text-[10px] align-middle">
                      IN PROGRESS
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-200 bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Order
                    </th>
                    <th rowSpan={2} className="py-1.5 px-2 text-center bg-white text-slate-600 font-semibold text-[10px] align-middle">
                      Abonemen (Rp)
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-white text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300">Abonemen (Rp)</th>
                  </tr>
                </>
              )}
            </thead>

            {/* Table Body */}
            <tbody>
              {/* ======================================================== */}
              {/* BODY A: TOP 10 PELANGGAN (NAMA CC) */}
              {/* ======================================================== */}
              {isTop10View ? (
                top10List.map((r, idx) => (
                  <tr key={r.l + idx} className="h-10 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
                    <td className="px-2.5 py-2 text-center font-bold text-xs text-slate-500 sticky left-0 z-10 bg-white border-r border-slate-300">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-2 text-left font-bold text-xs text-slate-800 sticky left-10 z-10 bg-white border-r border-slate-300 whitespace-nowrap">
                      {r.l}
                    </td>

                    {/* Lanjut Complete */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {cellFmt(r.lc)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {formatRupiah(r.la)}
                    </td>

                    {/* Lanjut In Progress */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {cellFmt(r.lp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                      {formatRupiah(r.lpa)}
                    </td>

                    {/* Tidak Lanjut Complete */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {cellFmt(r.tc)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {formatRupiah(r.ta)}
                    </td>

                    {/* Tidak Lanjut In Progress */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {cellFmt(r.tp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                      {formatRupiah(r.tpa)}
                    </td>

                    {/* Bukan Witel Solo JT */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {cellFmt(r.b)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                      {formatRupiah(r.ba)}
                    </td>

                    {/* Konfirmasi AM */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                      {cellFmt(r.k)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                      {formatRupiah(r.ka)}
                    </td>

                    {/* Total EDK */}
                    <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-slate-900 border-r border-slate-200">
                      {cellFmt(r.to)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-slate-900">
                      {formatRupiah(r.ta2)}
                    </td>
                  </tr>
                ))
              ) : mode === 'Nama AM' ? (
                /* ======================================================== */
                /* BODY B: NAMA AM GROUPED (PERSIS SESUAI SCREENSHOT TERBARU) */
                /* ======================================================== */
                amGroups.map((group) => (
                  <Fragment key={group.name}>
                    {/* Subtotal Group Header Row */}
                    <tr className="h-10 bg-slate-50/70 border-b border-slate-200">
                      <td className="px-3.5 py-2 text-left sticky left-0 z-10 bg-slate-50 border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="size-4 rounded bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                            −
                          </span>
                          <span className="font-bold text-xs text-[#1D4ED8]">{group.name}</span>
                          <span className="text-[11px] text-slate-500 font-normal">({group.items.length} Account Manager)</span>
                        </div>
                      </td>

                      {/* Middle blank cells (under Lanjut & Tidak Lanjut: 8 kolom) */}
                      <td colSpan={8} className="border-r border-slate-300" />

                      {/* Subtotal Label under Bukan Witel Solo JT (2 kolom) */}
                      <td colSpan={2} className="px-3 py-2 text-right font-bold text-xs text-[#1D4ED8] border-r border-slate-300 whitespace-nowrap">
                        Subtotal {group.name}
                      </td>

                      {/* Konfirmasi AM Subtotals (4 kolom) */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-200">
                        {group.subtotal.order || '-'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-200">
                        {group.subtotal.abon ? formatRupiah(group.subtotal.abon) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-200">
                        {group.subtotal.auto !== undefined ? group.subtotal.auto : '-'}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-300">
                        {group.subtotal.inprog !== undefined ? group.subtotal.inprog : '-'}
                      </td>

                      {/* Total EDK empty for subtotal header (2 kolom) */}
                      <td colSpan={2} />
                    </tr>

                    {/* Member Rows */}
                    {group.items.map((am) => (
                      <tr key={am.l} className="h-10 border-b border-slate-100 hover:bg-blue-50/40 transition-colors bg-white">
                        <td className="px-3.5 py-2 text-left sticky left-0 z-10 bg-white border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)] whitespace-nowrap">
                          <div className="flex items-center gap-2 pl-3">
                            <span className="size-1.5 rounded-full bg-[#1D4ED8] inline-block shrink-0" />
                            <span className="text-xs font-medium text-slate-800">{am.l}</span>
                          </div>
                        </td>

                        {/* Lanjut Complete */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.lc)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {formatRupiah(am.la)}
                        </td>

                        {/* Lanjut In Progress */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.lp)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {formatRupiah(am.lpa)}
                        </td>

                        {/* Tidak Lanjut Complete */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.tc)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {formatRupiah(am.ta)}
                        </td>

                        {/* Tidak Lanjut In Progress */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.tp)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {formatRupiah(am.tpa)}
                        </td>

                        {/* Bukan Witel Solo JT */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.b)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {formatRupiah(am.ba)}
                        </td>

                        {/* Konfirmasi AM */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.k)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {formatRupiah(am.ka)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(am.k_auto)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {cellFmt(am.k_prog)}
                        </td>

                        {/* Total EDK (Persis Sesuai Screenshot) */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-slate-900 border-r border-slate-200">
                          {cellFmt(am.to)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-slate-900">
                          {formatRupiah(am.ta2)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              ) : mode === 'Segmen' ? (
                /* ======================================================== */
                /* BODY C: SEGMEN REKAPITULASI */
                /* ======================================================== */
                <>
                  {data.map((r) => (
                    <tr key={r.l} className="h-10 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
                      <td className="px-3.5 py-2 text-center font-bold text-xs text-slate-800 sticky left-0 z-10 bg-white border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)] whitespace-nowrap">
                        {r.l}
                      </td>

                      {/* Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.lc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.la)}
                      </td>

                      {/* Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.lp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.lpa)}
                      </td>

                      {/* Tidak Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.tc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.ta)}
                      </td>

                      {/* Tidak Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.tp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.tpa)}
                      </td>

                      {/* Konfirmasi AM */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.k)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.ka)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.k_auto)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {cellFmt(r.k_prog)}
                      </td>

                      {/* Bukan Witel Solo JT */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.b)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.ba)}
                      </td>

                      {/* Total EDK */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-slate-900 border-r border-slate-200">
                        {cellFmt(r.to)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-slate-900">
                        {formatRupiah(r.ta2)}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Row for Segmen */}
                  <tr className="h-11 bg-[#EFF6FF] border-t-2 border-slate-300 font-bold text-xs text-[#1D4ED8]">
                    <td className="px-3.5 py-2 text-left sticky left-0 z-10 bg-[#EFF6FF] border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)] whitespace-nowrap">
                      WITEL SOLO JT <span className="text-[10px] text-slate-500 font-semibold">TOTAL</span>
                    </td>

                    {/* Lanjut Complete: 237 | 790.283.739 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.lc)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                      {formatRupiah(grandTotal.la)}
                    </td>

                    {/* Lanjut In Progress: 143 | 293.822.739 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.lp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                      {formatRupiah(grandTotal.lpa)}
                    </td>

                    {/* Tidak Lanjut Complete: 120 | 451.131.473 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.tc)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                      {formatRupiah(grandTotal.ta)}
                    </td>

                    {/* Tidak Lanjut In Progress: 68 | 157.166.816 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.tp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                      {formatRupiah(grandTotal.tpa)}
                    </td>

                    {/* Konfirmasi AM: 302 | 1.101.000.000 | 68 | 58 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.k)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                      Rp 1.101.000.000
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.k_auto)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-300">
                      {cellFmt(grandTotal.k_prog)}
                    </td>

                    {/* Bukan Witel Solo JT: 101 | 232.657.000 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.b)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                      {formatRupiah(grandTotal.ba)}
                    </td>

                    {/* Total EDK */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.to)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatRupiah(grandTotal.ta2)}
                    </td>
                  </tr>
                </>
              ) : (
                /* ======================================================== */
                /* BODY D: PERIODE EDK (SCREENSHOT 1) */
                /* ======================================================== */
                <>
                  {data.map((r) => (
                    <tr key={r.l} className="h-10 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
                      <td className="px-3.5 py-2 text-center font-bold text-xs text-slate-800 sticky left-0 z-10 bg-white border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)] whitespace-nowrap">
                        {r.l}
                      </td>

                      {/* Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.lc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.la)}
                      </td>

                      {/* Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.lp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.lpa)}
                      </td>

                      {/* Tidak Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.tc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.ta)}
                      </td>

                      {/* Tidak Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.tp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.tpa)}
                      </td>

                      {/* Konfirmasi AM */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.k)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.ka)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.k_auto)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {cellFmt(r.k_prog)}
                      </td>

                      {/* Bukan Witel Solo JT */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.b)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700">
                        {formatRupiah(r.ba)}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Row for Periode EDK */}
                  <tr className="h-11 bg-[#EFF6FF] border-t-2 border-slate-300 font-bold text-xs text-[#1D4ED8]">
                    <td className="px-3.5 py-2 text-left sticky left-0 z-10 bg-[#EFF6FF] border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)] whitespace-nowrap">
                      WITEL SOLO JT <span className="text-[10px] text-slate-500 font-semibold">TOTAL</span>
                    </td>

                    {/* Lanjut Complete: 34 | 45.140.262 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.lc)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                      {formatRupiah(grandTotal.la)}
                    </td>

                    {/* Lanjut In Progress: 127 | 152.203.093 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.lp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                      {formatRupiah(grandTotal.lpa)}
                    </td>

                    {/* Tidak Lanjut Complete: 110 | -31.364.937 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.tc)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                      {formatRupiah(grandTotal.ta)}
                    </td>

                    {/* Tidak Lanjut In Progress: 43 | 61.240.660 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.tp)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                      {formatRupiah(grandTotal.tpa)}
                    </td>

                    {/* Konfirmasi AM: 50 | 155.754.668 | 0 | 48 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.k)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                      {formatRupiah(grandTotal.ka)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.k_auto)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-300">
                      {cellFmt(grandTotal.k_prog)}
                    </td>

                    {/* Bukan Witel Solo JT: 0 | 0 */}
                    <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                      {cellFmt(grandTotal.b)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatRupiah(grandTotal.ba)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Menampilkan{' '}
            <span className="font-bold text-slate-800">
              {activeCount > 0 ? pageIndex * pageSize + 1 : 0}–
              {Math.min((pageIndex + 1) * pageSize, activeCount)}
            </span>{' '}
            dari <span className="font-bold text-slate-800">{activeCount}</span>{' '}
            {isTop10View
              ? `data pelanggan (Segmen ${activeSegmen})`
              : mode === 'Nama AM'
              ? 'data AM'
              : mode === 'Segmen'
              ? 'data segmen'
              : 'data'}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {[10, 25, 50, 100].map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">data per halaman</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                className="size-7 rounded-lg border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                className="size-7 rounded-lg font-bold text-xs bg-[#2563EB] text-white shadow-2xs flex items-center justify-center cursor-pointer"
              >
                1
              </button>

              <button
                type="button"
                disabled={true}
                className="size-7 rounded-lg border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Report Modal */}
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
