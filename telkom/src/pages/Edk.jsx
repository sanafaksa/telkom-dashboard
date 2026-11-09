import { useMemo, useState, Fragment, useRef } from 'react';
import { ExportButton, ShareDropdown } from '../components/ui';
import FilterDropdown from '../components/FilterDropdown';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  Download,
  History
  ,Eye
} from 'lucide-react';
import { useEdkFilters } from '../features/edk/useEdkFilters';
import {
  useEdkCards,
  useEdkOptions,
  useEdkSummary,
  useEdkTopCustomers,
  useUploadEdk,
  useEdkPopulations,
  useEdkCustomerDetails
} from '../features/edk/queries';
import { edkApi } from '../features/edk/api';
import UploadHistoryModal from '../features/edk/UploadHistoryModal';
import { isAdmin } from '../features/auth/auth';

const formatLastUpdate = (date) => {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatRupiah = (val) => {
  if (val === undefined || val === null || val === '-') return '-';
  const isNegative = val < 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('id-ID');
  return isNegative ? `-${formatted}` : formatted;
};

const formatRupiahShort = (val) => {
  if (val === undefined || val === null || val === '-') return '-';
  const abs = Math.abs(Number(val));
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6)  return `${sign}${Math.round(abs / 1e6).toLocaleString('id-ID')} jt`;
  return `${sign}${abs.toLocaleString('id-ID')}`;
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

// ───────────────────────── Konstanta & helper API ─────────────────────────

const MODE_TO_TAB = { Segmen: 'segmen', 'Periode EDK': 'periode', 'Nama AM': 'am', Status: 'cc' };
const TAB_TO_MODE = { segmen: 'Segmen', periode: 'Periode EDK', am: 'Nama AM', cc: 'Status' };
const STATUS_TABS = [
  { value: 'lanjut', label: 'Lanjut' },
  { value: 'tidak_lanjut', label: 'Tidak Lanjut' },
  { value: 'konfirmasi_am', label: 'Konfirmasi AM' },
  { value: 'bukan_witel_solo_jt', label: 'Bukan Witel Solo JT' }
];
const STATUS_PROGRESS = {
  lanjut: [['all', 'All'], ['complete', 'Complete'], ['in_progress', 'In Progress']],
  tidak_lanjut: [['all', 'All'], ['complete', 'Complete'], ['in_progress', 'In Progress']],
  konfirmasi_am: [['all', 'All'], ['autorenewal', 'Auto Renewal'], ['in_progress', 'In Progress']],
  bukan_witel_solo_jt: [['all', 'All'], ['complete', 'Complete'], ['in_progress', 'In Progress']]
};

const FLAG_LABEL = { NEW: 'Baru', UPDATED: 'Berubah', UNCHANGED: 'Tidak Berubah' };
const FLAG_KEY = { Baru: 'NEW', Berubah: 'UPDATED', 'Tidak Berubah': 'UNCHANGED' };

const splitList = (v) => (v ? String(v).split(',').filter(Boolean) : []);

const sumBy = (items, key) => items.reduce((acc, it) => acc + (it[key] || 0), 0);

const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function StatusPanel({
  status,
  onStatusChange,
  progress,
  onProgressChange,
  rows,
  totalAbonemen,
  isLoading,
  error,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  detailKey,
  detailQuery,
  onOpenDetail,
  onCloseDetail,
  onDashboardModeChange
}) {
  const visibleRows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const statusLabel = STATUS_TABS.find((item) => item.value === status)?.label ?? status;

  const formatProgress = (value) => ({
    COMPLETE: 'Complete',
    IN_PROGRESS: 'In Progress',
    AUTO_RENEWAL: 'Auto Renewal'
  }[value] ?? value);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="px-5 pt-4 flex justify-end">
        <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80">
          {['Segmen', 'Periode EDK', 'Nama AM', 'Status'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onDashboardModeChange(item)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer ${item === 'Status' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600 hover:bg-white/70'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        <div className="bg-gradient-to-r from-[#0F4FC2] via-[#1A54C8] to-[#1E52BF] text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">Top 10 Pelanggan - Nama CC</h2>
            <p className="text-xs text-white/80 mt-1">ENTERPRISE SOLO · Distribusi abonemen dan utilisasi layanan per Customer Code</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl md:text-[26px] font-extrabold tracking-tight mt-0.5">Rp {formatRupiahShort(totalAbonemen)}</p>

            <p className="text-2xl md:text-[26px] font-extrabold tracking-tight mt-0.5">Rp {Number(totalAbonemen || 0).toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-y border-slate-100">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onStatusChange(item.value)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${status === item.value ? 'bg-[#1D4ED8] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span className="font-semibold">Progress</span>
          <select
            value={progress}
            onChange={(e) => onProgressChange(e.target.value)}
            className="h-8 min-w-[140px] px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#1D8BCB]"
          >
            {STATUS_PROGRESS[status].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="px-5 py-3 text-xs text-slate-500 flex items-center gap-2">
        <span className="size-2 rounded-full bg-[#2563EB]" />
        <span className="font-semibold text-slate-700">{statusLabel}</span>
        <span>· Top 10 pelanggan berdasarkan abonemen</span>
      </div>

      {isLoading ? (
        <div className="px-5 py-16 text-center text-sm text-slate-400">Memuat data Status…</div>
      ) : error ? (
        <div className="px-5 py-16 text-center text-sm text-rose-600">{error.message}</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-16 text-center text-sm text-slate-400">Tidak ada pelanggan pada kombinasi Status dan Progress ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 text-center font-bold w-12">#</th>
                <th className="px-4 py-3 text-left font-bold">Nama Pelanggan / Akun Entitas</th>
                <th className="px-4 py-3 text-right font-bold">Order</th>
                <th className="px-4 py-3 text-right font-bold">Abonemen (Rp)</th>
                <th className="px-4 py-3 text-left font-bold">Status Progress</th>
                <th className="px-5 py-3 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.customer_key ?? `${row.nama_pelanggan}-${index}`} className="border-t border-slate-100 hover:bg-blue-50/30">
                  <td className="px-5 py-3 text-center text-slate-500">{pageIndex * pageSize + index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{row.nama_pelanggan || row.l || '(Kosong)'}</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {[row.segmen && `Segmen ${row.segmen}`, row.nama_am && `AM ${row.nama_am}`].filter(Boolean).join(' · ') || 'Metadata tidak tersedia'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">{cellFmt(row.total_order ?? row.to)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">{formatRupiah(row.total_abonemen ?? row.ta2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {String(row.progress ?? '').split(',').filter(Boolean).map((value) => (
                        <span
                          key={value}
                          className={`px-2 py-1 rounded-full border font-semibold ${value === 'IN_PROGRESS' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                        >
                          {formatProgress(value)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button type="button" onClick={() => onOpenDetail(row.customer_key ?? row.nama_pelanggan)} className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer" title="Lihat detail">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
        <span>Menampilkan {rows.length ? pageIndex * pageSize + 1 : 0}–{Math.min((pageIndex + 1) * pageSize, rows.length)} dari {rows.length} pelanggan</span>
        <div className="flex items-center gap-2">
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="h-8 px-2 border border-slate-200 rounded-lg bg-white cursor-pointer">
            {[5, 10].map((size) => <option key={size} value={size}>{size} baris</option>)}
          </select>
          <button type="button" disabled={pageIndex === 0} onClick={() => onPageChange(Math.max(0, pageIndex - 1))} className="size-8 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"><ChevronLeft size={14} className="mx-auto" /></button>
          <span>{pageIndex + 1}/{totalPages}</span>
          <button type="button" disabled={pageIndex >= totalPages - 1} onClick={() => onPageChange(Math.min(totalPages - 1, pageIndex + 1))} className="size-8 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"><ChevronRight size={14} className="mx-auto" /></button>
        </div>
      </div>

      {detailKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseDetail} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div><h3 className="font-bold text-slate-900">Detail Pelanggan</h3><p className="text-xs text-slate-500 mt-1">{detailKey}</p></div>
              <button type="button" onClick={onCloseDetail} className="size-8 grid place-items-center rounded-lg hover:bg-slate-100 cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-5 overflow-auto max-h-[60vh]">
              {detailQuery.isFetching ? <p className="py-10 text-center text-sm text-slate-400">Memuat detail…</p> : detailQuery.error ? <p className="py-10 text-center text-sm text-rose-600">{detailQuery.error.message}</p> : detailQuery.data?.rows?.length ? (
                <table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">SID</th><th className="px-3 py-2 text-left">Periode</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Order</th><th className="px-3 py-2 text-right">Abonemen</th></tr></thead><tbody>{detailQuery.data.rows.map((item) => <tr key={`${item.sid}-${item.periode_edk}`} className="border-t border-slate-100"><td className="px-3 py-2">{item.sid}</td><td className="px-3 py-2">{item.periode_edk ?? '-'}</td><td className="px-3 py-2">{item.status_utama} · {item.status_detail}</td><td className="px-3 py-2 text-right">{item.order_qty}</td><td className="px-3 py-2 text-right">{formatRupiah(item.abonemen)}</td></tr>)}</tbody></table>
              ) : <p className="py-10 text-center text-sm text-slate-400">Detail tidak ditemukan.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Baris API (snake_case) → bentuk lama yang dipakai JSX tabel (lc, la, lp, ... to, ta2) */
const toRow = (r) => {
  const x = r ?? {};
  return {
    ...x,
    l: x.label ?? x.nama_pelanggan ?? '-',
    lc: x.lanjut_complete_order ?? 0,
    la: x.lanjut_complete_abonemen ?? 0,
    lp: x.lanjut_in_progress_order ?? 0,
    lpa: x.lanjut_in_progress_abonemen ?? 0,
    tc: x.tidak_lanjut_complete_order ?? 0,
    ta: x.tidak_lanjut_complete_abonemen ?? 0,
    tp: x.tidak_lanjut_in_progress_order ?? 0,
    tpa: x.tidak_lanjut_in_progress_abonemen ?? 0,
    k_auto: x.konfirmasi_am_auto_renewal_order ?? 0,
    k_auto_a: x.konfirmasi_am_auto_renewal_abonemen ?? 0,
    k_prog: x.konfirmasi_am_in_progress_order ?? 0,
    k_prog_a: x.konfirmasi_am_in_progress_abonemen ?? 0,
    b: x.bukan_witel_order ?? 0,
    ba: x.bukan_witel_abonemen ?? 0,
    to: x.total_order ?? 0,
    ta2: x.total_abonemen ?? 0
  };
};

/** Error dari API upload → { message, rows: [{row, messages}], list: [], total } */
const toUploadError = (err) => {
  const data = err?.data;
  if (!err?.status) {
    return { message: 'Tidak dapat terhubung ke server. Pastikan backend Laravel berjalan.', rows: [], list: [] };
  }
  if (Array.isArray(data?.errors)) {
    return { message: data.message, rows: data.errors, list: [], total: data.total_errors ?? data.errors.length };
  }
  if (data?.errors && typeof data.errors === 'object') {
    return { message: data.message, rows: [], list: Object.values(data.errors).flat() };
  }
  return { message: data?.message || err.message || 'Gagal mengunggah file.', rows: [], list: [] };
};

function DeltaText({ value }) {
  if (value === null || value === undefined) {
    return <p className="text-xs mt-1.5 text-slate-400">Belum ada pembanding</p>;
  }
  const up = value >= 0;
  return (
    <p className={`text-xs mt-1.5 flex items-center gap-1 font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      <span>
        {up ? '+' : ''}
        {value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
      </span>
      <span className="text-slate-400 font-normal">dari upload sebelumnya</span>
    </p>
  );
}

// ───────────────────────── Modal Upload ─────────────────────────

function UploadModal({ open, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(false);
  const [reportDate, setReportDate] = useState(todayLocal());
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const uploadMutation = useUploadEdk();
  const uploading = uploadMutation.isPending;
  const periodYear = Number(reportDate.slice(0, 4));
  const uploadPeriodOptions = Number.isInteger(periodYear)
    ? [
        { value: 'old', label: `<${periodYear}` },
        ...Array.from({ length: 12 }, (_, index) => {
          const month = String(index + 1).padStart(2, '0');
          return { value: `${periodYear}${month}`, label: `${periodYear}${month}` };
        })
      ]
    : [];
  const activeUploadPeriod = uploadPeriodOptions.some((option) => option.value === selectedPeriod)
    ? selectedPeriod
    : '';
  const canUpload = files.length > 0 && !!reportDate && !!activeUploadPeriod && !uploading;

  if (!open) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) {
      setFiles(Array.from(e.dataTransfer.files).slice(0, 1));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files).slice(0, 1));
    }
  };

  const handleClose = () => {
    setUploadError(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    setUploadError(null);

    try {
      await uploadMutation.mutateAsync({ file: files[0], reportDate });
      onUploaded?.(activeUploadPeriod);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setFiles([]);
        onClose();
      }, 1200);
    } catch (err) {
      setUploadError(toUploadError(err));
    }
  };

  const handleTemplate = () => {
    edkApi.template().catch((err) => setUploadError(toUploadError(err)));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Report EDK</h2>
            <p className="text-xs text-slate-500 mt-0.5">Format yang didukung: XLSX (maks 10MB)</p>
          </div>
          <button
            onClick={handleClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Laporan (Last Update)</span>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#1D8BCB]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">Periode EDK</span>
              <select
                aria-label="Periode EDK untuk filter setelah upload"
                value={activeUploadPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-[9px] text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#1D8BCB]"
              >
                <option value="">Pilih salah satu</option>
                {uploadPeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mb-3 text-[11px] text-slate-400">
            Gunakan sheet DATA_EDK dan format 9 kolom dari template EDK di bawah. Nilai PERIODE_EDK per baris tetap dibaca dari Excel; pilihan di atas hanya menjadi filter awal setelah upload.
          </p>

          {uploadError && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="font-semibold">{uploadError.message}</p>

              {uploadError.list.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {uploadError.list.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}

              {uploadError.rows.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {uploadError.rows.map((e, i) => (
                    <div key={`${e.row}-${i}`}>
                      <span className="font-bold">Baris {e.row}:</span> {e.messages.join(' ')}
                    </div>
                  ))}
                  {uploadError.total > uploadError.rows.length && (
                    <p className="italic">…dan {uploadError.total - uploadError.rows.length} baris lainnya</p>
                  )}
                </div>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".xlsx"
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
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx)</p>
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

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-start gap-3">
            <span className="text-xs font-semibold text-slate-600">Template EDK</span>
            <button
              type="button"
              onClick={handleTemplate}
              className="h-[34px] px-3 text-xs font-semibold text-[#2563EB] hover:bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Download size={13} /> Unduh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleClose}
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
                : canUpload
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

// ───────────────────────── Halaman EDK ─────────────────────────

export default function Edk() {
  const { filters, tab, setFilter, setTab, resetFilters: resetUrlFilters } = useEdkFilters();
  const mode = TAB_TO_MODE[tab] ?? 'Segmen';
  const isStatusView = mode === 'Status';
  const isTop10View = isStatusView;

  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const canManage = isAdmin();
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState('Sort by');
  const [statusTab, setStatusTab] = useState('lanjut');
  const [statusProgress, setStatusProgress] = useState({
    lanjut: 'all',
    tidak_lanjut: 'all',
    konfirmasi_am: 'all',
    bukan_witel_solo_jt: 'all'
  });
  const [statusPageSize, setStatusPageSize] = useState(5);
  const [statusPageIndex, setStatusPageIndex] = useState(0);
  const [detailKey, setDetailKey] = useState(null);

  // ── Opsi dropdown dari /edk/options ──
  const { data: options } = useEdkOptions(filters.upload_id);
  const { data: populations } = useEdkPopulations();

  const populationOptions = useMemo(
    () => {
      const completed = (populations ?? []).filter((upload) => upload.status === 'done');
      const uploadsPerMonth = completed.reduce((counts, upload) => {
        const monthKey = upload.report_date?.slice(0, 7) ?? `upload-${upload.id}`;
        counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
        return counts;
      }, new Map());

      return completed.map((upload) => {
        const monthKey = upload.report_date?.slice(0, 7) ?? `upload-${upload.id}`;
        const date = upload.report_date ? new Date(`${upload.report_date}T00:00:00`) : null;
        const month = date
          ? date.toLocaleDateString('id-ID', { month: 'short' })
          : null;
        const uploadDate = upload.created_at ? new Date(upload.created_at) : null;
        const versionLabel = (uploadsPerMonth.get(monthKey) ?? 0) > 1
          ? upload.is_active
            ? ' · Aktif'
            : ` · ${uploadDate ? uploadDate.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : `#${upload.id}`}`
          : '';
        return {
          value: String(upload.id),
          label: date
            ? `${monthKey.replace('-', '')} - ${month}${versionLabel}`
            : `Populasi ${upload.id}${versionLabel}`,
          upload
        };
      });
    },
    [populations]
  );

  const activePopulationId = populationOptions.find((item) => item.upload.is_active)?.value ?? '';
  const selectedPopulationId = filters.upload_id ?? activePopulationId;

  const filterOptions = useMemo(
    () => ({
      periode: (options?.periode ?? []).map((o) => o.label),
      segmen: options?.segmen ?? [],
      namaAm: [...new Set((options?.am ?? []).map((a) => a.nama_am))],
      flagging: Object.values(FLAG_LABEL)
    }),
    [options]
  );

  const periodeMaps = useMemo(() => {
    const list = options?.periode ?? [];
    return {
      toLabel: Object.fromEntries(list.map((o) => [o.value, o.label])),
      toValue: Object.fromEntries(list.map((o) => [o.label, o.value]))
    };
  }, [options]);

  // ── Filter terpilih (sumbernya URL, format "a,b,c") ──
  const selectedPeriode = useMemo(
    () => splitList(filters.periode).map((v) => periodeMaps.toLabel[v] ?? v),
    [filters.periode, periodeMaps]
  );
  const selectedSegmen = useMemo(() => splitList(filters.segmen), [filters.segmen]);
  const selectedNamaAm = useMemo(() => splitList(filters.am), [filters.am]);
  const selectedFlagging = useMemo(
    () => splitList(filters.flag).map((f) => FLAG_LABEL[f] ?? f),
    [filters.flag]
  );

  const applyFilter = (key, values) => {
    setFilter(key, values.join(','));
    setPageIndex(0);
    setStatusPageIndex(0);
    setDetailKey(null);
  };
  const selectPopulation = (uploadId) => {
    setFilter('upload_id', uploadId);
    setPageIndex(0);
    setStatusPageIndex(0);
    setDetailKey(null);
  };
  const setSelectedPeriode = (labels) => applyFilter('periode', labels.map((l) => periodeMaps.toValue[l] ?? l));
  const handleSegmenFilterChange = (segs) => applyFilter('segmen', segs);
  const setSelectedNamaAm = (names) => applyFilter('am', names);
  const setSelectedFlagging = (labels) => applyFilter('flag', labels.map((l) => FLAG_KEY[l] ?? l));

  const activeSegmen = selectedSegmen[0] ?? 'DGS';

  const handleModeChange = (newMode) => {
    setTab(MODE_TO_TAB[newMode]);
    setSortOrder('Sort by');
    setPageIndex(0);
    setStatusPageIndex(0);
    setDetailKey(null);
  };

  const resetFilters = () => {
    resetUrlFilters();
    setSortOrder('Sort by');
    setPageIndex(0);
    setStatusPageIndex(0);
    setDetailKey(null);
  };

  const hasActiveFilters =
    Object.keys(filters).some((k) => k !== 'upload_id') || (sortOrder !== 'Sort by' && sortOrder !== '');

  // ── Data dari API ──
  const summaryTab = isTop10View ? 'segmen' : tab;
  const summaryQ = useEdkSummary(summaryTab, filters);
  const cardsQ = useEdkCards(filters);
  const activeStatusProgress = statusProgress[statusTab] ?? 'all';
  const topQ = useEdkTopCustomers(
    { ...filters, status: statusTab, progress: activeStatusProgress },
    { limit: 10, enabled: isTop10View }
  );
  const detailQ = useEdkCustomerDetails(
    { ...filters, status: statusTab, progress: activeStatusProgress },
    detailKey,
    { enabled: isStatusView }
  );

  // keepPreviousData: abaikan data tab lama selama data tab baru belum datang
  const summary = summaryQ.data?.by === summaryTab ? summaryQ.data : null;
  const lastUpdate = summary?.last_update ? new Date(summary.last_update) : null;

  const isLoading = summaryQ.isFetching || cardsQ.isFetching || (isTop10View && topQ.isFetching);
  const apiError = summaryQ.error ?? cardsQ.error ?? (isTop10View ? topQ.error : null);

  const data = useMemo(
    () => (isTop10View ? [] : (summary?.rows ?? []).map(toRow)),
    [summary, isTop10View]
  );

  const grandTotal = useMemo(() => toRow(summary?.total), [summary]);

  // ── Top 10 pelanggan (tab Status) ──
  const top10List = useMemo(() => {
    const list = (topQ.data?.rows ?? []).map(toRow);
    if (sortOrder === 'Nama (A-Z)') return [...list].sort((a, b) => a.l.localeCompare(b.l));
    if (sortOrder === 'Nama (Z-A)') return [...list].sort((a, b) => b.l.localeCompare(a.l));
    if (sortOrder === 'Order Terbanyak') return [...list].sort((a, b) => b.to - a.to);
    return list; // default & "Abonemen Tertinggi" sudah urut dari backend
  }, [topQ.data, sortOrder]);

  const top10TotalAbonemen = topQ.data?.total_abonemen ?? 0;

  const handleStatusChange = (nextStatus) => {
    setStatusTab(nextStatus);
    setStatusPageIndex(0);
    setDetailKey(null);
  };

  const handleStatusProgressChange = (nextProgress) => {
    setStatusProgress((current) => ({ ...current, [statusTab]: nextProgress }));
    setStatusPageIndex(0);
    setDetailKey(null);
  };

  // ── Grup Nama AM + subtotal per segmen ──
  const amGroups = useMemo(() => {
    if (mode !== 'Nama AM') return [];

    const map = new Map();
    data.forEach((item) => {
      const name = `Segmen ${item.segmen ?? '(Kosong)'}`;
      if (!map.has(name)) map.set(name, { name, items: [] });
      map.get(name).items.push(item);
    });

    const groups = [...map.values()];
    groups.forEach((g) => {
      if (sortOrder === 'Nama (A-Z)') g.items.sort((a, b) => a.l.localeCompare(b.l));
      if (sortOrder === 'Nama (Z-A)') g.items.sort((a, b) => b.l.localeCompare(a.l));
      g.subtotal = {
        auto_order: sumBy(g.items, 'k_auto'),
        auto_abon: sumBy(g.items, 'k_auto_a'),
        inprog_order: sumBy(g.items, 'k_prog'),
        inprog_abon: sumBy(g.items, 'k_prog_a')
      };
    });

    return groups;
  }, [mode, data, sortOrder]);

  const activeCount = isTop10View ? top10List.length : data.length;

  // ── KPI cards dari /edk/cards ──
  const kpiMetrics = useMemo(() => {
    const c = cardsQ.data;
    const pct = (v) => (v === null || v === undefined ? '0%' : `${v.toFixed(1)}%`);
    return {
      totalOrder: c?.total_order?.value ?? 0,
      totalAbonemen: c?.total_abonemen?.value ?? 0,
      inProgress: c?.in_progress?.value ?? 0,
      inProgressPercent: pct(c?.in_progress?.pct_of_total),
      complete: c?.complete?.value ?? 0,
      completePercent: pct(c?.complete?.pct_of_total),
      orderDelta: c?.total_order?.delta_pct ?? null,
      abonemenDelta: c?.total_abonemen?.delta_pct ?? null
    };
  }, [cardsQ.data]);

  // ── Export & link ──
  // Export dari server (data lengkap semua halaman tabel), format sesuai pilihan
  const exportFromServer = (format) => edkApi.exportFile(filters, isTop10View ? 'segmen' : tab, format);

  const getReportLink = () => {
    const url = new URL(window.location.href);
    if (summary?.upload_id) url.searchParams.set('upload_id', summary.upload_id);
    return url.toString();
  };
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

        {/* Tombol aksi tidak ikut di Copy as Picture / Export PDF */}
        <div data-html2canvas-ignore="true" className="flex flex-wrap items-center gap-2.5">
          {/* Upload Report Button (khusus admin) */}
          {canManage && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <Upload size={14} className="text-slate-500" />
              <span>Upload Report</span>
            </button>
          )}

          {/* Riwayat Upload Button */}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <History size={14} className="text-slate-500" />
            <span>Riwayat Upload</span>
          </button>

          {/* Export Dropdown Button */}
          <ExportButton
            onExportXlsx={() => exportFromServer('xlsx')}
            onExportCsv={() => exportFromServer('csv')}
            filename={`EDK_Monitoring_${mode}`}
            title={`EDK Monitoring – ${mode}`}
            tableSelector="#edk-main-content table"
            pdfSelector="#edk-main-content"
          />

          {/* Salin & Bagikan Dropdown Button */}
          <ShareDropdown
            buttonLabel="Salin & Bagikan"
            captureSelector="#edk-main-content"
            getLink={getReportLink}
          />
        </div>
      </div>

      {/* Banner: tampilan dikunci ke snapshot tertentu */}
      {filters.upload_id && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <span>
            Tampilan dikunci ke snapshot <b>#{filters.upload_id}</b>
            {lastUpdate ? <> (laporan {formatLastUpdate(lastUpdate)})</> : null}.
          </span>
          <button
            type="button"
            onClick={() => selectPopulation('')}
            className="font-bold text-amber-900 hover:underline cursor-pointer"
          >
            Kembali ke data aktif
          </button>
        </div>
      )}

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
          <DeltaText value={kpiMetrics.orderDelta} />
        </div>

        {/* Total Abonemen */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            TOTAL ABONEMEN
          </p>
          <p className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-1">
              Rp {formatRupiahShort(kpiMetrics.totalAbonemen)}
          </p>
          <DeltaText value={kpiMetrics.abonemenDelta} />
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
          <label className="flex-1 min-w-[190px]">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">Bulan Populasi EDK</span>
            <select
              value={selectedPopulationId}
              onChange={(e) => selectPopulation(e.target.value)}
              disabled={populationOptions.length === 0}
              className="w-full h-[32px] px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#1D8BCB] disabled:bg-slate-50 disabled:text-slate-400"
            >
              {populationOptions.length === 0 ? (
                <option value="">Belum ada populasi sukses</option>
              ) : (
                populationOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))
              )}
            </select>
          </label>

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
          {mode !== 'Nama AM' && !isStatusView && (
            <FilterDropdown
              label="Nama Pelanggan"
              options={['Sort by', 'Nama (A-Z)', 'Nama (Z-A)', 'Order Terbanyak', 'Abonemen Tertinggi']}
              selected={[sortOrder]}
              onChange={(val) => setSortOrder(val[0] || 'Sort by')}
              isSort
              className="flex-1 min-w-[130px]"
            />
          )}

          {isStatusView && (
            <label className="flex-1 min-w-[190px]">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Cari Nama Pelanggan</span>
              <input
                type="search"
                aria-label="Cari Nama Pelanggan"
                value={filters.q ?? ''}
                onChange={(e) => {
                  setFilter('q', e.target.value);
                  setStatusPageIndex(0);
                  setDetailKey(null);
                }}
                placeholder="Nama pelanggan..."
                className="w-full h-[32px] px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#1D8BCB]"
              />
            </label>
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
      {isStatusView ? (
        <StatusPanel
          status={statusTab}
          onStatusChange={handleStatusChange}
          progress={activeStatusProgress}
          onProgressChange={handleStatusProgressChange}
          rows={top10List}
          totalAbonemen={top10TotalAbonemen}
          isLoading={topQ.isFetching}
          error={topQ.error}
          pageIndex={statusPageIndex}
          pageSize={statusPageSize}
          onPageChange={setStatusPageIndex}
          onPageSizeChange={(size) => {
            setStatusPageSize(size);
            setStatusPageIndex(0);
          }}
          detailKey={detailKey}
          detailQuery={detailQ}
          onOpenDetail={setDetailKey}
          onCloseDetail={() => setDetailKey(null)}
          onDashboardModeChange={handleModeChange}
        />
      ) : (
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Status Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <span className="text-slate-500 font-medium">Last Update :</span>
            <b className="font-bold text-slate-800">
              {lastUpdate ? formatLastUpdate(lastUpdate) : 'Belum ada update'}
            </b>
            {isLoading && <span className="text-slate-400">Memuat data…</span>}
            {apiError && (
              <span className="text-rose-600 font-semibold">
                {apiError.status === 404
                  ? 'Belum ada data. Silakan upload report EDK.'
                  : apiError.message}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 shrink-0">
              {['Segmen', 'Periode EDK', 'Nama AM', 'Status'].map((m) => {
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeChange(m)}
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

        {/* Top 10 Pelanggan Banner Card (sementara; akan diganti panel Status) */}
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
                    Berdasarkan total abonemen terbesar (Rp) • data update {lastUpdate ? formatLastUpdate(lastUpdate) : '-'}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">
                  TOTAL ABONEMEN (TOP 10)
                </p>
                <p className="text-2xl md:text-[26px] font-extrabold tracking-tight mt-0.5 text-white">
                  Rp {formatRupiahShort(top10TotalAbonemen)}

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
                            <span className="font-bold text-xs text-[#1D4ED8]">Subtotal {group.name}</span>
                            <span className="text-[11px] text-slate-500 font-normal">({group.items.length} Account Manager)</span>
                          </div>
                        </td>

                        {/* Middle blank cells under Lanjut & Tidak Lanjut: 8 kolom */}
                        <td colSpan={8} className="border-r border-slate-300" />

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
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
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

          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {[10, 25, 50, 100].map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">data per halaman</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                className="size-8 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                className="size-8 rounded-xl font-bold text-xs bg-[#2563EB] text-white shadow-2xs flex items-center justify-center cursor-pointer"
              >
                1
              </button>

              <button
                type="button"
                disabled={true}
                className="size-8 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Upload Report Modal */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={(period) => {
          selectPopulation('');
          setFilter('periode', period ?? '');
        }}
      />

      {showHistory && (
        <UploadHistoryModal
          canActivate={canManage}
          onClose={() => setShowHistory(false)}
          viewingId={filters.upload_id ? Number(filters.upload_id) : null}
          onView={(id) => {
            selectPopulation(id ? String(id) : '');
          }}
        />
      )}
    </div>
  );
}
