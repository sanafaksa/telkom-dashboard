import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Filter,
  FileDown,
  Upload,
  Download,
  ChevronDown,
  Check,
  X,
  FileSpreadsheet,
  Lightbulb,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import * as Q from '../data/quadrantData';
import { exportCSV, ShareDropdown } from '../components/ui';
import { QuadrantGrid, GrandTotalCard } from '../components/Quadrant';
import { createPortal } from 'react-dom';
import {
  aggregateMasterData,
  buildQuadrantData,
  getFilterOptions,
  downloadSummaryTemplate,
  fetchAggFromApi,
  syncAggToApi,
  DEFAULT_QUADRANT_AGG
} from '../data/quadrantXlsx';
import FilterDropdown from '../components/FilterDropdown';

const STORAGE_KEY = 'telkom_quadrant_agg_v2';

function loadInitialAgg() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.months?.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_QUADRANT_AGG;
}

let cachedAgg = loadInitialAgg();

export default function Quadrant() {
  const { view } = useParams();
  const defaultData = Q[view];

  // Filters per view: witel & moving -> Bulan; telda -> Region + Bulan; segment -> Segment + Bulan.
  const isTeldaView = view === 'telda';
  const isSegmentView = view === 'segment';
  const isMoving = view === 'moving';

  const defaultFilters = (v, opts, prevMonth) => {
    const pickMonth =
      prevMonth && opts.month.includes(prevMonth)
        ? [prevMonth]
        : opts.month.includes('Aug')
          ? ['Aug']
          : opts.month.length
            ? [opts.month[opts.month.length - 1]]
            : ['Aug'];
    if (v === 'telda') {
      return {
        telda: [opts.telda.includes('BLORA') ? 'BLORA' : opts.telda[0]].filter(Boolean),
        unit: [],
        month: pickMonth
      };
    }
    if (v === 'segment') {
      return {
        telda: [],
        unit: [opts.unit.find((u) => u.toLowerCase() === 'business') || opts.unit[0]].filter(Boolean),
        month: pickMonth
      };
    }
    return { telda: [], unit: [], month: pickMonth };
  };

  const [aggData, setAggData] = useState(() => cachedAgg);
  const [filters, setFilters] = useState(() =>
    defaultFilters(view, getFilterOptions(cachedAgg, view))
  );
  const [quadrantData, setQuadrantData] = useState(() =>
    defaultData ? buildQuadrantData(view, cachedAgg, defaultData, defaultFilters(view, getFilterOptions(cachedAgg, view))) : null
  );
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [autoDownloadTemplate, setAutoDownloadTemplate] = useState(true);
  const [toast, setToast] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef(null);

  // Re-sync view data when view parameter changes while keeping uploaded/aggregated data intact
  useEffect(() => {
    if (!Q[view]) return;
    const opts = getFilterOptions(aggData, view);
    const nextFilters = defaultFilters(view, opts, filters.month?.[0]);
    setFilters(nextFilters);
    setQuadrantData(buildQuadrantData(view, aggData, Q[view], nextFilters));
  }, [view]);

  // Fetch latest data from Laravel MySQL API when available
  useEffect(() => {
    let active = true;
    fetchAggFromApi()
      .then((remoteAgg) => {
        if (!active || !remoteAgg?.months?.length) return;
        cachedAgg = remoteAgg;
        setAggData(remoteAgg);
        const opts = getFilterOptions(remoteAgg, view);
        const nextFilters = defaultFilters(view, opts, filters.month?.[0]);
        setFilters(nextFilters);
        if (Q[view]) {
          setQuadrantData(buildQuadrantData(view, remoteAgg, Q[view], nextFilters));
        }
      })
      .catch(() => {
        /* fallback to local/default data when backend is offline */
      });
    return () => {
      active = false;
    };
  }, []);

  // Close filter panel when clicking outside
  useEffect(() => {
    if (!showFilter) return;
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilter]);

  const filterOptions = getFilterOptions(aggData, view);

  const applyFilters = (next) => {
    setFilters(next);
    try {
      setQuadrantData(buildQuadrantData(view, aggData, defaultData, next));
    } catch (err) {
      showNotification(err.message);
    }
  };

  if (!quadrantData) {
    return <p className="p-8 text-slate-500">Tampilan tidak ditemukan.</p>;
  }

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const persistAgg = (nextAgg) => {
    cachedAgg = nextAgg;
    setAggData(nextAgg);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ months: nextAgg.months }));
    } catch {
      /* ignore storage quota */
    }
  };

  // 1. Download Template Ringkas (.xlsx) containing all months, regions, segments & movements
  const handleDownloadTemplate = async () => {
    try {
      const rowCount = await downloadSummaryTemplate(aggData, 'Template_Kuadran_Ringkas_SJT.xlsx');
      showNotification(`Template Ringkas Excel (${rowCount} baris) berhasil diunduh!`);
    } catch {
      showNotification('Gagal mengunduh template.');
    }
  };

  // 2. Upload and Parse (Master Data Excel, Template Ringkas Excel/CSV, or Legacy CSV)
  const processStructuredFile = async (file, shouldExportTemplate = false) => {
    setUploadError(null);
    setProcessing(0);
    try {
      const agg = await aggregateMasterData(file, setProcessing);
      persistAgg(agg);
      const opts = getFilterOptions(agg, view);
      const nextFilters = defaultFilters(view, opts, filters.month?.[0]);
      const next = buildQuadrantData(view, agg, defaultData, nextFilters);
      setFilters(nextFilters);
      setQuadrantData(next);

      let extraMsg = '';
      try {
        const synced = await syncAggToApi(agg, file.name);
        if (synced?.months?.length) {
          persistAgg({ ...agg, months: synced.months });
        }
        extraMsg += ` • Tersimpan di MySQL (${synced.rowCount} baris)`;
      } catch {
        /* backend offline, local state already updated */
      }
      if (shouldExportTemplate && !agg.template) {
        const count = await downloadSummaryTemplate(agg, 'Template_Kuadran_Ringkas_SJT.xlsx');
        extraMsg += ` • Template (${count} baris) diunduh`;
      }

      setShowUpload(false);
      setUploadFiles([]);
      const monthNames = agg.months.map((m) => m.bulan).join(', ');
      showNotification(
        `Data (${monthNames}) berhasil diterapkan${extraMsg}!`
      );
    } catch (err) {
      setUploadError(err.message || 'Gagal memproses file.');
    } finally {
      setProcessing(null);
    }
  };

  const parseUploadedFile = (file, shouldExportTemplate = false) => {
    if (/\.xls[xm]$/i.test(file.name)) {
      processStructuredFile(file, shouldExportTemplate);
      return;
    }

    // Check if CSV is the new Summary Template (BULAN, ..., KW_AKHIR, JUMLAH) or legacy CSV
    setUploadError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error('File template kosong atau format tidak valid.');
        }

        const headerLine = lines[0];
        const delimiter = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine
          .split(delimiter)
          .map((h) => h.trim().toUpperCase().replace(/^["']|["']$/g, ''));

        if (headers.includes('BULAN') && (headers.includes('KW_AKHIR') || headers.includes('KW_IH'))) {
          processStructuredFile(file, shouldExportTemplate);
          return;
        }

        const cleanNum = (str) => {
          if (str === undefined || str === null || str === '') return 0;
          const normalized = str.toString().replace(/\s/g, '').replace(/,/g, '.');
          return Number(normalized) || 0;
        };

        const isMovingFormat =
          isMoving ||
          headers.some(
            (h) => h.includes('DARI_KW') || h.includes('PINDAH') || h === 'NEW' || h === 'NEW_VAL'
          );

        const parsedItems = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 3) continue;

          const rowMap = {};
          headers.forEach((h, idx) => {
            rowMap[h] = cols[idx] !== undefined ? cols[idx] : '';
          });

          const code = rowMap['KODE_KUADRAN'] || cols[0] || `KW${i}`;
          const name = rowMap['NAMA_KUADRAN'] || cols[1] || `Kuadran ${i}`;
          const desc = rowMap['DESKRIPSI'] || cols[2] || '';

          const last =
            rowMap['LAST_MONTH'] !== undefined ? cleanNum(rowMap['LAST_MONTH']) : cleanNum(cols[3]);
          let val = rowMap['REAL'] !== undefined ? cleanNum(rowMap['REAL']) : cleanNum(cols[4]);

          const mom = last > 0 ? Number((((val - last) / last) * 100).toFixed(1)) : 0;

          if (isMovingFormat) {
            const kwNum = code.replace(/\D/g, '') || String(i);

            const from1 = cleanNum(rowMap['DARI_KW1'] ?? rowMap['KW1'] ?? cols[5]);
            const from2 = cleanNum(rowMap['DARI_KW2'] ?? rowMap['KW2'] ?? cols[6]);
            const from3 = cleanNum(rowMap['DARI_KW3'] ?? rowMap['KW3'] ?? cols[7]);
            const from4 = cleanNum(rowMap['DARI_KW4'] ?? rowMap['KW4'] ?? cols[8]);
            const newVal = cleanNum(rowMap['NEW'] ?? rowMap['NEW_VAL'] ?? cols[9]);

            let cells = [];
            if (kwNum === '1') {
              cells = [['1', from1], ['2-1', from2], ['3-1', from3], ['4-1', from4]];
            } else if (kwNum === '2') {
              cells = [['2', from2], ['1-2', from1], ['3-2', from3], ['4-2', from4]];
            } else if (kwNum === '3') {
              cells = [['3', from3], ['1-3', from1], ['2-3', from2], ['4-3', from4]];
            } else if (kwNum === '4') {
              cells = [['4', from4], ['1-4', from1], ['2-4', from2], ['3-4', from3]];
            } else {
              cells = [['1', from1], ['2', from2], ['3', from3], ['4', from4]];
            }

            if (!val && (from1 || from2 || from3 || from4 || newVal)) {
              val = from1 + from2 + from3 + from4 + newVal;
            }

            const prevItem = defaultData?.items?.find((it) => it.code === code);
            const prevNew = prevItem?.newVal || 0;
            const newMom =
              prevNew > 0 ? Number((((newVal - prevNew) / prevNew) * 100).toFixed(1)) : mom || 0;

            parsedItems.push({
              code,
              name,
              desc,
              last,
              value: val,
              mom,
              cells,
              newVal,
              newMom
            });
          } else {
            parsedItems.push({
              code,
              name,
              desc,
              last,
              value: val,
              mom
            });
          }
        }

        if (!parsedItems.length) {
          throw new Error('Tidak ada data valid yang dapat dibaca dari template.');
        }

        const totalLast = parsedItems.reduce((acc, it) => acc + (it.last || 0), 0);
        const totalReal = parsedItems.reduce((acc, it) => acc + (it.value || 0), 0);
        const totalMom =
          totalLast > 0 ? Number((((totalReal - totalLast) / totalLast) * 100).toFixed(1)) : 0;

        setQuadrantData((prev) => ({
          ...prev,
          items: parsedItems,
          total: {
            last: totalLast,
            real: totalReal,
            mom: totalMom
          }
        }));

        setShowUpload(false);
        setUploadFiles([]);
        showNotification(
          `Data ${isMoving ? 'kuadran moving' : 'kuadran'} berhasil diperbarui dari template!`
        );
      } catch (err) {
        setUploadError(err.message || 'Gagal memproses file template.');
      }
    };

    reader.onerror = () => {
      setUploadError('Gagal membaca file.');
    };

    reader.readAsText(file);
  };

  const handleExport = () => {
    if (isMoving) {
      const exportItems = quadrantData.items.map((it) => {
        let from1 = 0,
          from2 = 0,
          from3 = 0,
          from4 = 0;
        if (it.cells) {
          it.cells.forEach(([k, v]) => {
            if (k === '1' || k === '1-2' || k === '1-3' || k === '1-4') from1 = v;
            if (k === '2' || k === '2-1' || k === '2-3' || k === '2-4') from2 = v;
            if (k === '3' || k === '3-1' || k === '3-2' || k === '3-4') from3 = v;
            if (k === '4' || k === '4-1' || k === '4-2' || k === '4-3') from4 = v;
          });
        }
        return {
          KODE_KUADRAN: it.code,
          NAMA_KUADRAN: it.name,
          DESKRIPSI: it.desc,
          LAST_MONTH: it.last,
          REAL: it.value,
          'MoM (%)': it.mom,
          DARI_KW1: from1,
          DARI_KW2: from2,
          DARI_KW3: from3,
          DARI_KW4: from4,
          NEW: it.newVal || 0,
          'NEW_MoM (%)': it.newMom || 0
        };
      });
      exportCSV(exportItems, 'Kuadran_Moving_Dashboard');
    } else {
      exportCSV(
        quadrantData.items.map(({ cells, ...r }) => r),
        view || 'kuadran'
      );
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
          <Check size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header matching the reference screenshot */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {quadrantData.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Komposisi Kuadran & pergerakan • Source : Pivot
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Filter size={14} className="text-slate-500" />
              <span>Filter</span>
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full mt-2 z-40 w-[300px] bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 space-y-3 animate-[fadeIn_0.15s_ease-out]">
                {isTeldaView && (
                  <FilterDropdown
                    label="Region"
                    options={filterOptions.telda}
                    selected={filters.telda}
                    isSort
                    onChange={(telda) => applyFilters({ ...filters, telda })}
                  />
                )}
                {isSegmentView && (
                  <FilterDropdown
                    label="Segment"
                    options={filterOptions.unit}
                    selected={filters.unit}
                    isSort
                    onChange={(unit) => applyFilters({ ...filters, unit })}
                  />
                )}
                <FilterDropdown
                  label="Bulan"
                  options={filterOptions.month}
                  selected={filters.month}
                  isSort
                  onChange={(month) => applyFilters({ ...filters, month })}
                />
              </div>
            )}
          </div>

          {/* Dedicated Download Template Button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-white border border-blue-200 hover:bg-blue-50/50 text-[#2563EB] text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Download Template Ringkas Kuadran SJT (.xlsx)"
          >
            <FileDown size={14} className="text-[#2563EB]" />
            <span>Download Template</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Upload Report</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} className="opacity-80" />
          </button>

          <ShareDropdown className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer" />
        </div>
      </header>

      {/* Kuadran Grid */}
      <QuadrantGrid items={quadrantData.items} />

      {/* Insight and Legend Row */}
      <div className="grid md:grid-cols-[3fr_2fr] gap-4 mt-6">
        {/* Key Insight Card */}
        <div className="rounded-2xl p-4.5 bg-[#EFF6FF] border border-blue-200/70 flex items-start gap-3.5 shadow-2xs">
          <div className="size-8 rounded-full bg-blue-100 text-[#2563EB] grid place-items-center shrink-0 mt-0.5">
            <Lightbulb size={16} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Key Insight</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{Q.insight}</p>
          </div>
        </div>

        {/* Status Performa Card */}
        <div className="rounded-2xl p-4.5 bg-white border border-slate-200 shadow-2xs">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Status Performa</h4>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#10B981]" />
              On Track
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#F59E0B]" />
              Need Attention
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#EF4444]" />
              Below Target
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#0F172A]" />
              No Change
            </span>
          </div>
        </div>
      </div>

      {/* Grand Total Performance Card */}
      {quadrantData.total && <GrandTotalCard t={quadrantData.total} />}

      {/* Upload Modal with Automatic Master-Data-to-Template Summarizer */}
      {showUpload &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Upload & Ringkas Data Kuadran SJT
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unggah Master Data Excel (otomatis diringkas ke template) atau Template Ringkas
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadFiles([]);
                    setUploadError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <label className="border-2 border-dashed border-slate-200 rounded-xl p-7 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-colors">
                  <Upload size={28} className="text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    Pilih File Master Data (.xlsx) atau Template Ringkas (.xlsx / .csv)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Mendukung Master Data 100rb+ baris (Jul, Aug, Sep, Oct, Nov, Dec) & Template Ringkas
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xlsm"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files.length) {
                        setUploadFiles(Array.from(e.target.files));
                        setUploadError(null);
                      }
                    }}
                  />
                </label>

                {uploadFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                          <span className="truncate font-medium text-slate-700">{f.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {(f.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-summarize Master Data into lightweight Template option */}
                <label className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoDownloadTemplate}
                    onChange={(e) => setAutoDownloadTemplate(e.target.checked)}
                    className="mt-0.5 accent-[#2563EB] cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Sparkles size={13} className="text-[#2563EB]" />
                      Ringkas otomatis Master Data menjadi file Template (.xlsx)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                      Saat mengunggah Master Data besar, sistem otomatis mengunduh hasil ringkasannya (~25 KB) agar ke depannya karyawan cukup memakai file ringkas tersebut.
                    </span>
                  </div>
                </label>

                {/* Link to download template directly */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Butuh template siap pakai?</span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-[#2563EB] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown size={13} />
                    <span>Unduh Template Ringkas (.xlsx)</span>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadFiles([]);
                    setUploadError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  disabled={!uploadFiles.length || processing !== null}
                  onClick={() => {
                    if (uploadFiles.length > 0) {
                      parseUploadedFile(uploadFiles[0], autoDownloadTemplate);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all cursor-pointer ${
                    uploadFiles.length && processing === null
                      ? 'bg-[#2563EB] hover:bg-blue-700'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {processing !== null
                    ? `Memproses… ${processing}%`
                    : autoDownloadTemplate
                      ? 'Terapkan & Ringkas Template'
                      : 'Terapkan Data'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
