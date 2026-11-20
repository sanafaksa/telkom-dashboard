import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../lib/useBodyScrollLock';
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ExportButton, ShareDropdown } from '../components/ui';
import DiscardDraftDialog from '../components/DiscardDraftDialog';
import { clearDraftFiles, loadDraftFiles, saveDraftFiles, setDraftActive, useOpenDraftIntent } from '../lib/draft';
import { PSAK_TYPES, computePsakTotal, fetchPsakData, uploadPsakFiles } from '../data/psakData';

const PSAK_DRAFT_FILE = 'koreksi-psak-upload-file';

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

// Modal upload Excel: file dibaca di browser, lalu hasilnya disimpan ke database
function UploadPsakModal({ open, onClose, onLoaded }) {
  useBodyScrollLock(open);
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const inputRef = useRef(null);

  // Draft: file yang sudah dipilih dipulihkan saat modal dibuka (file besar tidak dimuat saat halaman dibuka)
  const draftReady = useRef(false);
  useEffect(() => {
    if (!open || draftReady.current) return undefined;
    let alive = true;
    loadDraftFiles(PSAK_DRAFT_FILE).then((restored) => {
      if (!alive) return;
      if (restored.length) setFiles(restored);
      draftReady.current = true;
    });
    return () => {
      alive = false;
    };
  }, [open]);

  // Selama modal terbuka, draft ini tidak muncul di popup "draft belum disimpan"
  useEffect(() => {
    setDraftActive(PSAK_DRAFT_FILE, open);
    return () => setDraftActive(PSAK_DRAFT_FILE, false);
  }, [open]);

  useEffect(() => {
    if (!draftReady.current) return;
    if (files.length) saveDraftFiles(PSAK_DRAFT_FILE, files);
    else clearDraftFiles(PSAK_DRAFT_FILE);
  }, [files]);

  if (!open) return null;

  // Satu atau banyak file sekaligus; file yang sama (nama + ukuran + tanggal) tidak ditambahkan dua kali
  const pick = (list) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    const valid = picked.filter((f) => /\.xlsx$/i.test(f.name));
    setError(valid.length < picked.length ? 'Ada file yang bukan .xlsx (dilewati)' : '');
    if (!valid.length) return;
    setFiles((prev) => {
      const sameKey = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
      const added = valid.filter((f) => !prev.some((p) => sameKey(p, f)));
      return [...prev, ...added];
    });
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const close = () => {
    setError('');
    setLoading(false);
    setConfirmDiscard(false);
    onClose();
  };

  // Menutup modal saat ada file belum diupload: minta konfirmasi, lalu draft dibuang
  const requestClose = () => {
    if (files.length && !loading) setConfirmDiscard(true);
    else close();
  };

  const discardAndClose = () => {
    setFiles([]);
    clearDraftFiles(PSAK_DRAFT_FILE);
    close();
  };

  // Semua file dibaca lalu digabung per segmen; jika satu file gagal, upload dibatalkan dan pesannya menyebut file tersebut
  const submit = async () => {
    if (!files.length) return;
    setLoading(true);
    setProgress(0);
    setError('');
    try {
      // File dikirim mentah ke server; server menghitung dan menyimpan. Error dari server tampil di modal.
      await onLoaded(files, setProgress);
      setFiles([]);
      close();
    } catch (err) {
      setError(err.message || 'Gagal memproses file.');
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={requestClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Rekap Koreksi PSAK</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Excel/CSV dengan kolom Segmen, Reverse, Correction, Net & PSAK Type
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              drag ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="mx-auto size-12 rounded-xl grid place-items-center mb-3 bg-slate-100 text-slate-400">
              <Upload size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {drag ? 'Lepaskan file di sini' : 'Drag & drop file atau klik untuk pilih'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Pilih 4 file: DGS, DPS, DSS, RBS (.xlsx) · dihitung di server</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${f.size}-${f.lastModified}`}
                  className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold text-slate-800 truncate flex-1">{f.name}</p>
                  <span className="text-[11px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={loading}
                    className="size-6 rounded-md hover:bg-slate-200 grid place-items-center text-slate-400 hover:text-slate-600 disabled:opacity-40 cursor-pointer"
                    aria-label={`Hapus ${f.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-500">Disimpan ke database dan dipakai bersama semua pengguna</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!files.length || loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {loading
                ? progress < 1
                  ? `Mengunggah ${Math.round(progress * 100)}%`
                  : 'Menghitung di server...'
                : 'Upload'}
            </button>
          </div>
        </div>
        {confirmDiscard && (
          <DiscardDraftDialog onCancel={() => setConfirmDiscard(false)} onDiscard={discardAndClose} />
        )}
      </div>
    </div>,
    document.body
  );
}

// Format angka sama seperti tabel EDK: pemisah ribuan titik, negatif pakai minus
const fmtRp = (n) => (n || 0).toLocaleString('id-ID');

// Gaya header & sel disamakan dengan tabel EDK Monitoring
const GROUP_TH = 'text-white font-bold text-center text-xs py-2.5 px-3 border-r border-white/20 whitespace-nowrap align-middle';
const HEAD = {
  reverse: `${GROUP_TH} bg-[#1E293B]`,
  correction: `${GROUP_TH} bg-[#1D4ED8]`,
  net: `${GROUP_TH} bg-[#0F172A]`,
  psak: `${GROUP_TH} bg-[#1D4ED8]`
};
const SUB_TH =
  'bg-slate-100 text-slate-700 font-bold text-center text-[11px] py-1.5 px-2.5 border-r border-b border-slate-300 whitespace-nowrap';
const STICKY_SHADOW = 'shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]';

// Kolom terakhir tiap grup memakai garis lebih tegas (border-slate-300) seperti EDK
function NumCell({ value, strong = false, groupEnd = false }) {
  return (
    <td
      className={`px-3 py-2 text-right tabular-nums text-xs whitespace-nowrap border-r ${
        groupEnd ? 'border-slate-300' : 'border-slate-200'
      } ${strong ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}
    >
      {fmtRp(value)}
    </td>
  );
}

export default function KoreksiJurbalPsak() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  useOpenDraftIntent('koreksi-psak-upload-file', () => setShowUpload(true));
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPsakData()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setLoadError('Gagal memuat data dari server.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const period = data?.period ?? { reverse: '', correction: '' };
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const source = data?.source ?? null;
  const total = useMemo(() => computePsakTotal(rows), [rows]);
  const reverseLabel = `Reverse ${period.reverse}`.trim();
  const correctionLabel = `Correction ${period.correction}`.trim();

  const flash = (msg, tone = 'ok') => {
    setNotice({ msg, tone });
    setTimeout(() => setNotice(null), 3500);
  };

  // Dipanggil modal upload: server menghitung dan menyimpan hasil. Jika gagal, error dilempar ke modal.
  const handleLoaded = async (files, onProgress) => {
    const saved = await uploadPsakFiles(files, onProgress);
    setData(saved);
    setLoadError('');
    flash(`${saved.rows.length} segmen tersimpan dari ${files.length} file`);
  };

  const lastPsakKey = PSAK_TYPES[PSAK_TYPES.length - 1].key;

  const renderRow = (r) => (
    <tr key={r.segmen} className="h-10 border-b border-slate-200/80 hover:bg-blue-50/40 transition-colors bg-white">
      <td
        className={`px-4 py-2.5 text-center font-bold text-xs text-slate-800 sticky left-0 z-10 bg-white border-r-2 border-slate-300 ${STICKY_SHADOW} whitespace-nowrap`}
      >
        {r.segmen}
      </td>
      <NumCell value={r.reverse} groupEnd />
      <NumCell value={r.correction} groupEnd />
      <NumCell value={r.net} strong groupEnd />
      {PSAK_TYPES.map(({ key }) => (
        <NumCell key={key} value={r.psak[key]} groupEnd={key === lastPsakKey} />
      ))}
    </tr>
  );

  // Baris total: gaya "Witel Solo JT Total" seperti EDK
  const totalCell = (value, groupEnd = false) => (
    <td
      className={`px-3 py-2 text-right tabular-nums whitespace-nowrap border-r ${
        groupEnd ? 'border-slate-300' : 'border-slate-200'
      }`}
    >
      {fmtRp(value)}
    </td>
  );

  const colCount = 4 + PSAK_TYPES.length;

  return (
    <div id="psak-main-content" className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 tracking-tight">
            Koreksi & Jurbal PSAK
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {period.reverse || period.correction
              ? `${reverseLabel}, ${correctionLabel}, dan rincian koreksi per tipe PSAK`
              : 'Rincian koreksi per tipe PSAK'}{' '}
            Witel Solo Jateng Timur
          </p>
        </div>

        {/* Tombol aksi tidak ikut di Copy as Picture / Export PDF */}
        <div data-html2canvas-ignore="true" className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Upload Excel</span>
          </button>
          <ExportButton
            filename={`Koreksi_Jurbal_PSAK_${period.correction || 'data'}`}
            title={`Koreksi & Jurbal PSAK – Witel Solo JT${period.correction ? ` (${correctionLabel})` : ''}`}
            tableSelector="#psak-main-content table"
            pdfSelector="#psak-main-content"
          />
          <ShareDropdown buttonLabel="Salin & Bagikan" captureSelector="#psak-main-content" />
        </div>
      </div>

      {/* Tabel utama (gaya EDK Monitoring) */}
      <section id="psak-table-section" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Status bar sticky, seperti EDK */}
        <div className="sticky top-16 z-40 rounded-t-2xl bg-white px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <span className="text-slate-500 font-medium">Periode :</span>
            <b className="font-bold text-slate-800">
              {period.reverse || period.correction ? `${reverseLabel} · ${correctionLabel}` : 'Belum ada data'}
            </b>
            <span className="text-slate-400 hidden sm:inline">· Net = Reverse + Correction (Rp)</span>
            {loading && <span className="text-slate-400">Memuat data…</span>}
          </div>

          {source && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                <FileSpreadsheet size={12} />
                Terakhir diperbarui · {fmtDateTime(source.uploadedAt)}
              </span>
            </div>
          )}
        </div>

        {loadError && (
          <div className="mx-5 mt-5 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700">
            <AlertCircle size={15} className="shrink-0 mt-px" />
            <span>{loadError}</span>
          </div>
        )}

        <div className="relative z-0 m-5 overflow-auto max-h-[70vh] rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[1300px] text-xs border-collapse border-spacing-0 [&_td]:!border-slate-100 [&_th]:!border-slate-200">
            {/* z-20: header di atas sel kolom kiri (z-10) */}
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th
                  rowSpan={2}
                  className={`sticky left-0 z-30 bg-slate-100 px-4 py-3 text-center font-bold text-xs text-slate-800 border-r-2 border-b border-slate-300 min-w-[140px] align-middle ${STICKY_SHADOW} whitespace-nowrap`}
                >
                  Segmen
                </th>
                <th rowSpan={2} className={`${HEAD.reverse} border-b border-slate-300 min-w-[130px]`}>
                  {reverseLabel}
                </th>
                <th rowSpan={2} className={`${HEAD.correction} border-b border-slate-300 min-w-[140px]`}>
                  {correctionLabel}
                </th>
                <th rowSpan={2} className={`${HEAD.net} border-b border-slate-300 min-w-[130px]`}>
                  Net
                </th>
                <th colSpan={PSAK_TYPES.length} className={HEAD.psak}>
                  PSAK Type
                </th>
              </tr>
              <tr>
                {PSAK_TYPES.map(({ key, label }) => (
                  <th key={key} className={`${SUB_TH} min-w-[110px]`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-xs text-slate-500">
                    {loading ? 'Memuat data…' : 'Belum ada data. Klik "Upload Excel" untuk menampilkan rekap.'}
                  </td>
                </tr>
              )}

              {rows.map((r) => renderRow(r))}

              {/* Summary row */}
              {rows.length > 0 && (
                <tr className="h-11 bg-[#EFF6FF] border-t-2 border-slate-300 font-bold text-xs text-[#1D4ED8]">
                  <td
                    className={`px-4 py-2.5 text-left sticky left-0 z-10 bg-[#EFF6FF] border-r-2 border-slate-300 ${STICKY_SHADOW} whitespace-nowrap`}
                  >
                    Witel Solo JT <span className="text-[10px] text-slate-500 font-semibold">Total</span>
                  </td>
                  {totalCell(total.reverse, true)}
                  {totalCell(total.correction, true)}
                  {totalCell(total.net, true)}
                  {PSAK_TYPES.map(({ key }) => (
                    <td
                      key={key}
                      className={`px-3 py-2 text-right tabular-nums whitespace-nowrap border-r ${
                        key === lastPsakKey ? 'border-slate-300' : 'border-slate-200'
                      }`}
                    >
                      {fmtRp(total.psak[key])}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer (gaya EDK) */}
        <div className="px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
          Menampilkan <b className="text-slate-800">{rows.length ? `1–${rows.length}` : '0'}</b> dari{' '}
          <b className="text-slate-800">{rows.length}</b> data segmen
        </div>
      </section>

      <UploadPsakModal open={showUpload} onClose={() => setShowUpload(false)} onLoaded={handleLoaded} />

      {notice && (
        <div
          data-html2canvas-ignore="true"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 text-white text-xs font-semibold rounded-xl shadow-2xl max-w-md ${
            notice.tone === 'warn' ? 'bg-amber-600' : 'bg-slate-900/95'
          }`}
        >
          {notice.tone === 'warn' ? <AlertCircle size={15} className="shrink-0" /> : <Check size={15} className="text-emerald-400 shrink-0" />}
          <span>{notice.msg}</span>
        </div>
      )}
    </div>
  );
}
