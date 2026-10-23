import { useEffect, useMemo, useState, Fragment, useRef } from 'react';
import { filterOptions, modes, topPelangganBySegmen } from '../data/edkData';
import { ExportButton, exportCSV, ShareDropdown } from '../components/ui';
import FilterDropdown from '../components/FilterDropdown';
import { createPortal } from "react-dom";
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

const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const buildUploadError = (data, fallback) => {
  const parts = [data?.message || fallback];

  if (Array.isArray(data?.errors)) {
    parts.push(...data.errors.slice(0, 5));
  } else if (data?.errors && typeof data.errors === 'object') {
    parts.push(...Object.values(data.errors).flat().slice(0, 5));
  }

  if (Array.isArray(data?.missing_headers)) {
    parts.push('Kolom hilang: ' + data.missing_headers.join(', '));
  }

  return parts.join('\n');
};

function UploadModal({ open, onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [uploadPeriod, setUploadPeriod] = useState('');
  const [uploadError, setUploadError] = useState('');
  const periodMonth = Number(uploadPeriod.slice(4, 6));
  const periodValid = /^\d{6}$/.test(uploadPeriod) && periodMonth >= 1 && periodMonth <= 12;
  const canUpload = files.length > 0 && periodValid && !uploading;

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

    const handleUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('period', uploadPeriod);

    try {
      const response = await fetch('http://localhost:8000/api/edk/import/preview', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setUploadError(buildUploadError(errorData, 'Gagal mengunggah file'));
        return;
      }

      const result = await response.json();

      const storeResponse = await fetch('http://localhost:8000/api/edk/import/store', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });

      if (!storeResponse.ok) {
        const storeError = await storeResponse.json().catch(() => null);
        setUploadError(buildUploadError(storeError, 'Gagal menyimpan data EDK'));
        return;
      }

      if (onSuccess) onSuccess(result.preview);

      setDone(true);
      setTimeout(() => {
        setDone(false);
        setFiles([]);
        setUploadPeriod('');
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error server:', error);
      setUploadError('Tidak dapat terhubung ke server (http://localhost:8000).');
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Report EDK</h2>
            <p className="text-xs text-slate-500 mt-0.5">Format yang didukung: XLSX (maks 20MB)</p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
                  <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Periode EDK (YYYYMM)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={uploadPeriod}
              onChange={(e) => setUploadPeriod(e.target.value.replace(/\D/g, ''))}
              placeholder="cth: 202610"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#1D8BCB]"
            />
          </div>
          {uploadError && (
            <div className="mb-3 whitespace-pre-line text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {uploadError}
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".xlsx,.xls"
          />

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
            onClick={() => fileInputRef.current.click()}
          >
            <div className="mx-auto size-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mb-3">
              <Upload size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Drag & drop file report atau klik untuk pilih</p>
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx, .xls)</p>
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
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
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
    </div>,
    document.body
  );
}

const AM_GROUP_SUBTOTALS = {
  'Segmen DGS': { auto_order: 8, auto_abon: 5065520, inprog_order: 92, inprog_abon: 419951755 },
  'Segmen DPS': { auto_order: 2, auto_abon: 24000000, inprog_order: 35, inprog_abon: 107131000 },
  'Segmen DSS': { auto_order: 0, auto_abon: 0, inprog_order: 47, inprog_abon: 997567284 },
  'Segmen RBS': { auto_order: 42, auto_abon: 91275064, inprog_order: 97, inprog_abon: 177754711 }
};

export default function Edk() {
  const [mode, setMode] = useState('Segmen');
  const [activeSegmen, setActiveSegmen] = useState('DGS');
  const [showUpload, setShowUpload] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [apiSegmen, setApiSegmen] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  
  useEffect(() => {
    const fetchEdkMonthly = async () => {
      try {
        setApiLoading(true);
        setApiError('');

        const response = await fetch(
          'http://127.0.0.1:8000/api/edk/monthly'
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || 'Gagal mengambil data EDK.'
          );
        }

        setApiSegmen(result.data || []);
      } catch (error) {
        setApiError(error.message || 'Gagal terhubung ke server.');
      } finally {
        setApiLoading(false);
      }
    };

    fetchEdkMonthly();
  }, [refreshKey]);

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
      setSortOrder('Sort by');
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
      setSortOrder('Sort by');
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

  // Check if any filter is currently active
  const hasActiveFilters = useMemo(() => {
    const isDefaultSegmen = isTop10View && selectedSegmen.length === 1 && selectedSegmen[0] === 'DGS';
    return (
      selectedPeriode.length > 0 ||
      (!isDefaultSegmen && selectedSegmen.length > 0) ||
      selectedNamaAm.length > 0 ||
      selectedFlagging.length > 0 ||
      (sortOrder !== 'Sort by' && sortOrder !== '')
    );
  }, [selectedPeriode, selectedSegmen, selectedNamaAm, selectedFlagging, sortOrder, isTop10View]);

  // Top 10 data for active segment (Nama CC)
  const top10List = useMemo(() => {
    let list = topPelangganBySegmen[activeSegmen] || topPelangganBySegmen['DGS'] || [];
    let enriched = list.map((r) => {
      const to = (r.lc || 0) + (r.lp || 0) + (r.tc || 0) + (r.tp || 0) + (r.k || 0) + (r.b || 0);
      const ta2 = (r.la || 0) + (r.lpa || 0) + (r.ta || 0) + (r.tpa || 0) + (r.ka || 0) + (r.ba || 0);
      return { ...r, to, ta2 };
    });

    if (selectedPeriode.length > 0) {
      enriched = enriched.filter((r) => selectedPeriode.includes(r.periode));
    }
    if (selectedFlagging.length > 0) {
      enriched = enriched.filter((r) => selectedFlagging.includes(r.flagging));
    }

    if (sortOrder === 'Nama (A-Z)' || sortOrder === 'A-Z' || sortOrder === 'Sort: Nama (A-Z)') {
      return [...enriched].sort((a, b) => a.l.localeCompare(b.l));
    }
    if (sortOrder === 'Nama (Z-A)' || sortOrder === 'Z-A' || sortOrder === 'Sort: Nama (Z-A)') {
      return [...enriched].sort((a, b) => b.l.localeCompare(a.l));
    }
    if (sortOrder === 'Order Terbanyak' || sortOrder === 'Sort: Order Terbanyak') {
      return [...enriched].sort((a, b) => (b.to || 0) - (a.to || 0));
    }
    if (sortOrder === 'Abonemen Tertinggi' || sortOrder === 'Sort: Abonemen Tertinggi') {
      return [...enriched].sort((a, b) => (b.ta2 || 0) - (a.ta2 || 0));
    }
    return enriched;
  }, [activeSegmen, sortOrder, selectedPeriode, selectedFlagging]);

  const top10TotalAbonemen = useMemo(() => {
    return top10List.reduce((acc, r) => acc + (r.ta2 || 0), 0);
  }, [top10List]);

  // General dataset for Segmen, Periode EDK & Nama AM
  const data = useMemo(() => {
    let list =
  mode === 'Segmen' && apiSegmen.length > 0
    ? apiSegmen.map((r) => ({
        ...r,
        l: r.segment,
        segmen: r.segment,
        lc: Number(r.lanjut_complete_order) || 0,
        la: Number(r.lanjut_complete_abonemen_rp) || 0,
        lp: Number(r.lanjut_in_progress_order) || 0,
        lpa: Number(r.lanjut_in_progress_abonemen_rp) || 0,
        tc: Number(r.tidak_lanjut_complete_order) || 0,
        ta: Number(r.tidak_lanjut_complete_abonemen_rp) || 0,
        tp: Number(r.tidak_lanjut_in_progress_order) || 0,
        tpa: Number(r.tidak_lanjut_in_progress_abonemen_rp) || 0,
        b: Number(r.bukan_witel_solo_jt_order) || 0,
        ba: Number(r.bukan_witel_solo_jt_abonemen_rp) || 0,
        k: Number(r.konfirmasi_am_order) || 0,
        ka: Number(r.konfirmasi_am_abonemen_rp) || 0,
        k_auto: Number(r.konfirmasi_am_auto_renewal) || 0,
        k_prog: Number(r.konfirmasi_am_in_progress) || 0,
        k_auto_a: Number(r.konfirmasi_am_auto_renewal_abonemen_rp) || 0,
        k_prog_a: Number(r.konfirmasi_am_in_progress_abonemen_rp) || 0,
      }))
    : modes[mode] || [];

    if (selectedPeriode.length > 0) {
      list = list.filter((r) => selectedPeriode.includes(r.periode) || selectedPeriode.includes(r.l));
    }
    if (selectedSegmen.length > 0) {
      list = list.filter((r) => {
        if (selectedSegmen.includes(r.segmen)) return true;
        if (selectedSegmen.includes(r.l)) return true;
        if (r.subgroup && selectedSegmen.some((s) => r.subgroup.includes(s))) return true;
        return false;
      });
    }
    if (selectedNamaAm.length > 0) {
      list = list.filter((r) => selectedNamaAm.includes(r.namaAm) || selectedNamaAm.includes(r.l));
    }
    if (selectedFlagging.length > 0) {
      list = list.filter((r) => selectedFlagging.includes(r.flagging));
    }

    
return list.map((r) => {
  const sumOrder =
    (r.lc || 0) + (r.lp || 0) + (r.tc || 0) + (r.tp || 0) + (r.k || 0) + (r.b || 0);

  const apiTotal = Number(r.total_order) || 0;
  const to = mode === 'Segmen' && apiTotal > 0 ? apiTotal : sumOrder;

  const ta2 =
    (r.la || 0) + (r.lpa || 0) + (r.ta || 0) + (r.tpa || 0) + (r.ka || 0) + (r.ba || 0);

  return { ...r, to, ta2 };
});

  }, [mode, apiSegmen, selectedPeriode, selectedSegmen, selectedNamaAm, selectedFlagging]);

  // Grand Total for Periode EDK & Segmen
  
const grandTotal = useMemo(() => {
    const useApi = mode === 'Segmen' && apiSegmen.length > 0;

    const list = useApi
      ? apiSegmen.map((r) => ({
          lc: Number(r.lanjut_complete_order) || 0,
          la: Number(r.lanjut_complete_abonemen_rp) || 0,
          lp: Number(r.lanjut_in_progress_order) || 0,
          lpa: Number(r.lanjut_in_progress_abonemen_rp) || 0,
          tc: Number(r.tidak_lanjut_complete_order) || 0,
          ta: Number(r.tidak_lanjut_complete_abonemen_rp) || 0,
          tp: Number(r.tidak_lanjut_in_progress_order) || 0,
          tpa: Number(r.tidak_lanjut_in_progress_abonemen_rp) || 0,
          k: Number(r.konfirmasi_am_order) || 0,
          ka: Number(r.konfirmasi_am_abonemen_rp) || 0,
          k_auto: Number(r.konfirmasi_am_auto_renewal) || 0,
          k_prog: Number(r.konfirmasi_am_in_progress) || 0,
          k_auto_a: Number(r.konfirmasi_am_auto_renewal_abonemen_rp) || 0,
          k_prog_a: Number(r.konfirmasi_am_in_progress_abonemen_rp) || 0,
          b: Number(r.bukan_witel_solo_jt_order) || 0,
          ba: Number(r.bukan_witel_solo_jt_abonemen_rp) || 0,
        }))
      : modes[mode] || [];

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
      k_auto_a: (acc.k_auto_a || 0) + (r.k_auto_a || 0),
      k_prog_a: (acc.k_prog_a || 0) + (r.k_prog_a || 0),
      b: acc.b + (r.b || 0),
      ba: acc.ba + (r.ba || 0),
      to:
        acc.to +
        (r.lc || 0) +
        (r.lp || 0) +
        (r.tc || 0) +
        (r.tp || 0) +
        (r.k || 0) +
        (r.b || 0),
      ta2:
        acc.ta2 +
        (r.la || 0) +
        (r.lpa || 0) +
        (r.ta || 0) +
        (r.tpa || 0) +
        (r.ka || 0) +
        (r.ba || 0),
    }),
    {
  lc: 0, la: 0, lp: 0, lpa: 0,
  tc: 0, ta: 0, tp: 0, tpa: 0,
  k: 0, ka: 0, k_auto: 0, k_prog: 0,
  k_auto_a: 0, k_prog_a: 0,
  b: 0, ba: 0, to: 0, ta2: 0,
}
  );
}, [mode, apiSegmen]);


  // Groups for Nama AM (with dynamic subtotal recalculation when filters active)
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
          items: []
        };
        map.set(groupKey, groupObj);
        groups.push(groupObj);
      }
      map.get(groupKey).items.push(item);
    });

    groups.forEach((g) => {
      if (!hasActiveFilters && AM_GROUP_SUBTOTALS[g.name]) {
        g.subtotal = AM_GROUP_SUBTOTALS[g.name];
      } else {
        const auto_order = g.items.reduce((acc, it) => acc + (it.k_auto || 0), 0);
        const auto_abon = g.items.reduce((acc, it) => acc + (it.k_auto_a || 0), 0);
        const inprog_order = g.items.reduce((acc, it) => acc + (it.k_prog || 0), 0);
        const inprog_abon = g.items.reduce((acc, it) => acc + (it.k_prog_a || 0), 0);
        g.subtotal = { auto_order, auto_abon, inprog_order, inprog_abon };
      }
    });

    return groups;
  }, [mode, data, hasActiveFilters]);

  // Active count for pagination
  const activeCount = isTop10View ? top10List.length : data.length;

  // Dynamic KPI Metrics reacting to filters
  const kpiMetrics = useMemo(() => {
    if (!hasActiveFilters && mode === 'Nama AM') {
      return {
        totalOrder: 426,
        totalAbonemen: 328221859,
        inProgress: 211,
        inProgressPercent: '49.5%',
        complete: 215,
        completePercent: '50.5%'
      };
    }

    const currentList = isTop10View ? top10List : data;
    const totalOrder = currentList.reduce((acc, r) => acc + (r.to || 0), 0);
    const totalAbonemen = currentList.reduce((acc, r) => acc + (r.ta2 || 0), 0);
    const inProgress = currentList.reduce(
      (acc, r) => acc + ((r.lp || 0) + (r.tp || 0) + (r.k_prog || 0)),
      0
    );
    const complete = currentList.reduce(
      (acc, r) => acc + ((r.lc || 0) + (r.tc || 0) + (r.k_auto || 0)),
      0
    );

    const inProgressPercent =
      totalOrder > 0 ? `${((inProgress / totalOrder) * 100).toFixed(1)}%` : '0%';
    const completePercent =
      totalOrder > 0 ? `${((complete / totalOrder) * 100).toFixed(1)}%` : '0%';

    return {
      totalOrder,
      totalAbonemen,
      inProgress,
      inProgressPercent,
      complete,
      completePercent
    };
  }, [hasActiveFilters, mode, isTop10View, top10List, data]);

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

      {/* 2. KPI Cards (Dinamis Bereaksi Terhadap Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Order */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            TOTAL ORDER
          </p>
          <p className="text-[28px] font-bold text-slate-900 tracking-tight mt-1">
            {cellFmt(kpiMetrics.totalOrder)}
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
            Rp {formatRupiah(kpiMetrics.totalAbonemen)}
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
            {cellFmt(kpiMetrics.inProgress)}
          </p>
          <p className="text-xs mt-1.5 text-slate-500">
            <span className="font-bold text-slate-800">{kpiMetrics.inProgressPercent}</span>{' '}
            <span className="text-slate-400 font-normal">dari total order</span>
          </p>
        </div>

        {/* Complete */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            COMPLETE
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
            {cellFmt(kpiMetrics.complete)}
          </p>
          <p className="text-xs mt-1.5 text-slate-500">
            <span className="font-bold text-slate-800">{kpiMetrics.completePercent}</span>{' '}
            <span className="text-slate-400 font-normal">dari total order</span>
          </p>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-end gap-3 w-full">
          <FilterDropdown
            label="Periode EDK"
            options={filterOptions.periode}
            selected={selectedPeriode}
            onChange={setSelectedPeriode}
            multiColumn
            className="flex-1 min-w-[130px]"
          />

          <FilterDropdown
            label="Segmen"
            options={filterOptions.segmen}
            selected={selectedSegmen}
            onChange={handleSegmenFilterChange}
            className="flex-1 min-w-[110px]"
          />

          <FilterDropdown
            label="Nama AM"
            options={filterOptions.namaAm}
            selected={selectedNamaAm}
            onChange={setSelectedNamaAm}
            className="flex-1 min-w-[130px]"
          />

          <FilterDropdown
            label="Flagging Last Update"
            options={filterOptions.flagging}
            selected={selectedFlagging}
            onChange={setSelectedFlagging}
            className="flex-1 min-w-[150px]"
          />

          {/* Tampilkan Sort / Nama Pelanggan hanya pada mode selain Nama AM */}
          {mode !== 'Nama AM' && (
            <FilterDropdown
              label="Nama Pelanggan"
              options={['Sort by', 'Nama (A-Z)', 'Nama (Z-A)', 'Order Terbanyak', 'Abonemen Tertinggi']}
              selected={[sortOrder]}
              onChange={(val) => setSortOrder(val[0] || 'Sort by')}
              isSort
              className="flex-1 min-w-[130px]"
            />
          )}

          <button
            type="button"
            onClick={resetFilters}
            className={`font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer h-[32px] shrink-0 ${
              hasActiveFilters
                ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200 hover:bg-blue-100 shadow-2xs font-bold'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 shadow-2xs'
            }`}
          >
            <RotateCcw size={13} className={hasActiveFilters ? 'text-[#1D4ED8]' : 'text-slate-500'} />
            <span className="whitespace-nowrap">Reset Filter</span>
            {hasActiveFilters && (
              <span className="size-1.5 rounded-full bg-[#1D4ED8]" />
            )}
          </button>
        </div>
      </div>

      {/* 4. Table Card */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Status Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#2563EB]" />
            <span className="text-slate-500 font-medium">Last Update :</span>
            <b className="font-bold text-slate-800">10 Oktober 2026</b>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
              {['Segmen', 'Periode EDK', 'Nama AM', 'Nama CC'].map((m) => {
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeChange(m)}
                    className={`px-3 py-1 text-[11px] font-semibold transition-all rounded-md cursor-pointer ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/60'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 10 Pelanggan Banner Card (Hanya untuk Nama CC sesuai Screenshot 2 & 3) */}
        {isTop10View && (
          <div className="p-5 pb-5">
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
        <div className={`overflow-x-auto w-full ${isTop10View ? 'border-t border-slate-200/90' : ''}`}>
          <table className="w-full min-w-[1550px] text-xs border-collapse border-spacing-0">
            <thead className="bg-white">
              {/* ======================================================== */}
              {/* MODE A: TOP 10 PELANGGAN (NAMA CC) */}
              {/* ======================================================== */}
              {isTop10View ? (
                <>
                  <tr>
                    <th
                      rowSpan={3}
                      className="sticky left-0 z-30 bg-slate-100 text-center font-bold text-xs text-slate-800 border-r border-b border-slate-300 w-12 min-w-[48px] max-w-[48px] align-middle shadow-[1px_0_0_0_#cbd5e1]"
                    >
                      #
                    </th>
                    <th
                      rowSpan={3}
                      onClick={() => {
                        setSortOrder((prev) => (prev === 'Nama (A-Z)' ? 'Nama (Z-A)' : 'Nama (A-Z)'));
                      }}
                      className="sticky left-[48px] z-30 bg-slate-100 px-3.5 py-2.5 text-left font-bold text-xs text-slate-800 border-r-2 border-b border-slate-300 min-w-[260px] align-middle shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] cursor-pointer select-none hover:bg-slate-200/80 transition-colors"
                      title="Klik untuk urutkan A-Z / Z-A"
                    >
                      <div className="flex items-center justify-between">
                        <span>Nama Pelanggan</span>
                        <div className="flex items-center gap-1">
                          {sortOrder === 'Nama (A-Z)' && <span className="text-[10px] text-blue-600 font-bold">(A-Z)</span>}
                          {sortOrder === 'Nama (Z-A)' && <span className="text-[10px] text-blue-600 font-bold">(Z-A)</span>}
                          <ArrowUpDown
                            size={12}
                            className={`transition-colors ${
                              sortOrder === 'Nama (A-Z)' || sortOrder === 'Nama (Z-A)'
                                ? 'text-blue-600'
                                : 'text-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    </th>
                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Lanjut
                    </th>
                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Tidak Lanjut
                    </th>
                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Konfirmasi AM
                    </th>
                    <th
                      colSpan={2}
                      className="bg-slate-200 text-slate-800 font-bold text-center text-xs py-2.5 border-r border-slate-300 whitespace-nowrap"
                    >
                      Bukan Witel Solo JT
                    </th>
                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2.5 whitespace-nowrap"
                    >
                      Total EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-2 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-2 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-2 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-2 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Konfirmasi AM sub-headers Level 2 */}
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-2 border-r border-b border-slate-300 whitespace-nowrap">
                      Auto Renewal
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-2 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-2 px-3 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap min-w-[70px]">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-3 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap min-w-[115px]">
                      Abonemen (Rp)
                    </th>

                    {/* Total EDK sub-headers */}
                    <th rowSpan={2} className="py-2 px-3 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap min-w-[70px]">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-3 text-center border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap min-w-[120px]">
                      Abonemen (Rp)
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-slate-50/70 text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[65px]">Order</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[115px]">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[65px]">Order</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap min-w-[115px]">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[65px]">Order</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[115px]">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[65px]">Order</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[115px]">Abonemen (Rp)</th>

                    {/* Konfirmasi AM sub-headers Level 3 */}
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[65px]">Order</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[115px]">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[65px]">Order</th>
                    <th className="py-1.5 px-2.5 text-center border-r border-b border-slate-300 whitespace-nowrap min-w-[115px]">Abonemen (Rp)</th>
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
                      onClick={() => {
                        setSortOrder((prev) => (prev === 'Nama (A-Z)' ? 'Nama (Z-A)' : 'Nama (A-Z)'));
                      }}
                      className="sticky left-0 z-30 bg-slate-100 px-4 py-3 text-left font-bold text-xs text-slate-800 border-r-2 border-b border-slate-300 min-w-[220px] align-middle shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap cursor-pointer select-none hover:bg-slate-200/80 transition-colors"
                      title="Klik untuk urutkan A-Z / Z-A"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>Nama AM</span>
                          {sortOrder === 'Nama (A-Z)' && <span className="text-[10px] text-blue-600 font-bold">(A-Z)</span>}
                          {sortOrder === 'Nama (Z-A)' && <span className="text-[10px] text-blue-600 font-bold">(Z-A)</span>}
                          <ArrowUpDown
                            size={12}
                            className={`transition-colors ${
                              sortOrder === 'Nama (A-Z)' || sortOrder === 'Nama (Z-A)'
                                ? 'text-blue-600'
                                : 'text-slate-400'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">Account Manager</span>
                      </div>
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Tidak Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Konfirmasi AM
                    </th>

                    <th
                      colSpan={2}
                      className="bg-slate-200 text-slate-800 font-bold text-center text-xs py-2.5 border-r border-slate-300 whitespace-nowrap"
                    >
                      Bukan Witel Solo JT
                    </th>

                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2.5 whitespace-nowrap"
                    >
                      Total EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Konfirmasi AM sub-headers Level 2 */}
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Auto Renewal
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap">
                      Abonemen (Rp)
                    </th>

                    {/* Total EDK sub-headers */}
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap">
                      Abonemen
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-slate-50/70 text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>

                    {/* Konfirmasi AM sub-headers Level 3 */}
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
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
                      className="sticky left-0 z-30 bg-slate-100 px-4 py-3 text-center font-bold text-xs text-slate-800 border-r-2 border-b border-slate-300 min-w-[130px] align-middle shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap"
                    >
                      Segmen
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Tidak Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Konfirmasi AM
                    </th>

                    <th
                      colSpan={2}
                      className="bg-slate-200 text-slate-800 font-bold text-center text-xs py-2.5 border-r border-slate-300 whitespace-nowrap"
                    >
                      Bukan Witel Solo JT
                    </th>

                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2.5 whitespace-nowrap"
                    >
                      Total EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Konfirmasi AM sub-headers Level 2 */}
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Auto Renewal
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap">
                      Abonemen (Rp)
                    </th>

                    {/* Total EDK sub-headers */}
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap">
                      Abonemen (Rp)
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-slate-50/70 text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>

                    {/* Konfirmasi AM sub-headers Level 3 */}
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
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
                      className="sticky left-0 z-30 bg-slate-100 px-4 py-3 text-center font-bold text-xs text-slate-800 border-r-2 border-b border-slate-300 min-w-[140px] align-middle shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap"
                    >
                      Periode EDK
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1E293B] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Tidak Lanjut
                    </th>

                    <th
                      colSpan={4}
                      className="bg-[#1D4ED8] text-white font-bold text-center text-xs py-2.5 border-r border-white/20 whitespace-nowrap"
                    >
                      Konfirmasi AM
                    </th>

                    <th
                      colSpan={2}
                      className="bg-slate-200 text-slate-800 font-bold text-center text-xs py-2.5 border-r border-slate-300 whitespace-nowrap"
                    >
                      Bukan Witel Solo JT
                    </th>

                    <th
                      colSpan={2}
                      className="bg-[#0F172A] text-white font-bold text-center text-xs py-2.5 whitespace-nowrap"
                    >
                      Total EDK
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Complete
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Konfirmasi AM sub-headers Level 2 */}
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      Auto Renewal
                    </th>
                    <th colSpan={2} className="bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 border-r border-b border-slate-300 whitespace-nowrap">
                      In Progress
                    </th>

                    {/* Bukan Witel Solo JT sub-headers */}
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap">
                      Order
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-[10px] align-middle whitespace-nowrap">
                      Abonemen (Rp)
                    </th>

                    {/* Total EDK sub-headers */}
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-r border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap">
                      Total Order
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-center border-b border-slate-300 bg-slate-50 text-slate-800 font-bold text-[10px] align-middle whitespace-nowrap">
                      Total Abonemen (Rp)
                    </th>
                  </tr>

                  <tr className="border-b border-slate-300 bg-slate-50/70 text-slate-600 font-semibold text-[10px]">
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>

                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>

                    {/* Konfirmasi AM sub-headers Level 3 */}
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Order</th>
                    <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 whitespace-nowrap">Abonemen (Rp)</th>
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
                top10List.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-500 text-xs bg-white">
                      Tidak ada data pelanggan yang sesuai dengan filter yang dipilih.
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-[#1D4ED8] hover:underline font-bold cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  top10List.map((r, idx) => (
                    <tr key={r.l + idx} className="h-11 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
                      <td className="px-2.5 py-2.5 text-center font-bold text-xs text-slate-500 sticky left-0 z-10 bg-white border-r border-slate-300 w-12 min-w-[48px] max-w-[48px] shadow-[1px_0_0_0_#cbd5e1]">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5 text-left font-bold text-xs text-slate-800 sticky left-[48px] z-10 bg-white border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[260px]">
                        {toTitleCase(r.l)}
                      </td>

                      {/* Lanjut Complete */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.lc)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.la)}
                      </td>

                      {/* Lanjut In Progress */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.lp)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.lpa)}
                      </td>

                      {/* Tidak Lanjut Complete */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.tc)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.ta)}
                      </td>

                      {/* Tidak Lanjut In Progress */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.tp)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.tpa)}
                      </td>

                      {/* Konfirmasi AM Auto Renewal */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.k_auto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {formatRupiah(r.k_auto_a)}
                      </td>

                      {/* Konfirmasi AM In Progress */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.k_prog)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.k_prog_a)}
                      </td>

                      {/* Bukan Witel Solo JT */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                        {cellFmt(r.b)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                        {formatRupiah(r.ba)}
                      </td>

                      {/* Total EDK */}
                      <td className="px-3 py-2.5 text-center tabular-nums text-xs font-bold text-slate-900 border-r border-slate-200">
                        {cellFmt(r.to)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-bold text-slate-900">
                        {formatRupiah(r.ta2)}
                      </td>
                    </tr>
                  ))
                )
              ) : mode === 'Nama AM' ? (
                /* ======================================================== */
                /* BODY B: NAMA AM GROUPED (PERSIS SESUAI SCREENSHOT TERBARU) */
                /* ======================================================== */
                amGroups.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-500 text-xs bg-white">
                      Tidak ada Account Manager yang sesuai dengan filter yang dipilih.
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-[#1D4ED8] hover:underline font-bold cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  amGroups.map((group) => (
                    <Fragment key={group.name}>
                      {/* Subtotal Group Header Row */}
                      <tr className="h-10 bg-slate-50/70 border-b border-slate-200">
                        <td className="px-3.5 py-2 text-left sticky left-0 z-10 bg-slate-50 border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                              −
                            </span>
                            <span className="font-bold text-xs text-[#1D4ED8]">{group.name}</span>
                            <span className="text-[11px] text-slate-500 font-normal">({group.items.length} Account Manager)</span>
                          </div>
                        </td>

                        {/* Middle blank cells under Lanjut & Tidak Lanjut: 8 kolom */}
                        <td colSpan={8} className="px-3 py-2 text-right font-bold text-xs text-[#1D4ED8] border-r border-slate-300 whitespace-nowrap">
                          Subtotal {group.name}
                        </td>

                        {/* Konfirmasi AM Subtotals (4 kolom) */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-200">
                          {group.subtotal.auto_order || '-'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-200">
                          {group.subtotal.auto_abon ? formatRupiah(group.subtotal.auto_abon) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-200">
                          {group.subtotal.inprog_order || '-'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-[#1D4ED8] border-r border-slate-300">
                          {group.subtotal.inprog_abon ? formatRupiah(group.subtotal.inprog_abon) : '-'}
                        </td>

                        {/* Bukan Witel Solo JT empty for subtotal header (2 kolom) */}
                        <td colSpan={2} className="border-r border-slate-300" />

                        {/* Total EDK empty for subtotal header (2 kolom) */}
                        <td colSpan={2} />
                      </tr>

                      {/* Member Rows */}
                      {group.items.map((am) => (
                        <tr key={am.l} className="h-10 border-b border-slate-100 hover:bg-blue-50/40 transition-colors bg-white">
                          <td className="px-3.5 py-2 text-left sticky left-0 z-10 bg-white border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
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

                          {/* Konfirmasi AM Auto Renewal */}
                          <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                            {cellFmt(am.k_auto)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                            {formatRupiah(am.k_auto_a)}
                          </td>

                          {/* Konfirmasi AM In Progress */}
                          <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                            {cellFmt(am.k_prog)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                            {formatRupiah(am.k_prog_a)}
                          </td>

                          {/* Bukan Witel Solo JT */}
                          <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                            {cellFmt(am.b)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                            {formatRupiah(am.ba)}
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
                )
              ) : mode === 'Segmen' ? (
                /* ======================================================== */
                /* BODY C: SEGMEN REKAPITULASI */
                /* ======================================================== */
                data.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-500 text-xs bg-white">
                      Tidak ada data segmen yang sesuai dengan filter yang dipilih.
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-[#1D4ED8] hover:underline font-bold cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((r) => (
                      <tr key={r.l} className="h-10 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
                        <td className="px-4 py-2.5 text-center font-bold text-xs text-slate-800 sticky left-0 z-10 bg-white border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
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

                        {/* Konfirmasi AM Auto Renewal */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(r.k_auto)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {formatRupiah(r.k_auto_a)}
                        </td>

                        {/* Konfirmasi AM In Progress */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(r.k_prog)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {formatRupiah(r.k_prog_a)}
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
                      <td className="px-4 py-2.5 text-left sticky left-0 z-10 bg-[#EFF6FF] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        Witel Solo JT <span className="text-[10px] text-slate-500 font-semibold">Total</span>
                      </td>

                      {/* Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.lc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                        {formatRupiah(grandTotal.la)}
                      </td>

                      {/* Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.lp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                        {formatRupiah(grandTotal.lpa)}
                      </td>

                      {/* Tidak Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.tc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                        {formatRupiah(grandTotal.ta)}
                      </td>

                      {/* Tidak Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.tp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                        {formatRupiah(grandTotal.tpa)}
                      </td>

                      {/* Konfirmasi AM Auto Renewal */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.k_auto)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                        {formatRupiah(grandTotal.k_auto_a)}
                      </td>

                      {/* Konfirmasi AM In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.k_prog)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                        {formatRupiah(grandTotal.k_prog_a)}
                      </td>

                      {/* Bukan Witel Solo JT */}
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
                )
              ) : (
                /* ======================================================== */
                /* BODY D: PERIODE EDK (SCREENSHOT 1) */
                /* ======================================================== */
                data.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-500 text-xs bg-white">
                      Tidak ada data periode EDK yang sesuai dengan filter yang dipilih.
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-[#1D4ED8] hover:underline font-bold cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((r) => (
                      <tr key={r.l} className="h-10 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
                        <td className="px-4 py-2.5 text-center font-bold text-xs text-slate-800 sticky left-0 z-10 bg-white border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
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

                        {/* Konfirmasi AM Auto Renewal */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(r.k_auto)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {formatRupiah(r.k_auto_a)}
                        </td>

                        {/* Konfirmasi AM In Progress */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(r.k_prog)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {formatRupiah(r.k_prog_a)}
                        </td>

                        {/* Bukan Witel Solo JT */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(r.b)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700 border-r border-slate-300">
                          {formatRupiah(r.ba)}
                        </td>

                        {/* Total EDK */}
                        <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 border-r border-slate-200">
                          {cellFmt(r.to)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-slate-700">
                          {formatRupiah(r.ta2)}
                        </td>
                      </tr>
                    ))}

                    {/* Summary Row for Periode EDK */}
                    <tr className="h-11 bg-[#EFF6FF] border-t-2 border-slate-300 font-bold text-xs text-[#1D4ED8]">
                      <td className="px-4 py-2.5 text-left sticky left-0 z-10 bg-[#EFF6FF] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                        WITEL SOLO JT <span className="text-[10px] text-slate-500 font-semibold uppercase">TOTAL</span>
                      </td>

                      {/* Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.lc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                        {formatRupiah(grandTotal.la)}
                      </td>

                      {/* Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.lp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                        {formatRupiah(grandTotal.lpa)}
                      </td>

                      {/* Tidak Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.tc)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                        {formatRupiah(grandTotal.ta)}
                      </td>

                      {/* Tidak Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.tp)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                        {formatRupiah(grandTotal.tpa)}
                      </td>

                      {/* Konfirmasi AM Auto Renewal */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.k_auto)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">
                        {formatRupiah(grandTotal.k_auto_a)}
                      </td>

                      {/* Konfirmasi AM In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums border-r border-slate-200">
                        {cellFmt(grandTotal.k_prog)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums border-r border-slate-300">
                        {formatRupiah(grandTotal.k_prog_a)}
                      </td>

                      {/* Bukan Witel Solo JT */}
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
                )
              )}
            </tbody>
          </table>
        </div>

        {/* 5. ini pagination  */}
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
      <UploadModal 
        open={showUpload} 
        onClose={() => setShowUpload(false)} 
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
