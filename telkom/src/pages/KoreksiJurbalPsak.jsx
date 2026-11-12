import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, FileSpreadsheet, RotateCcw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ExportButton, ShareDropdown } from '../components/ui';
import {
  PSAK_TYPES,
  computePsakTotal,
  loadPsakData,
  resetPsakData,
} from '../data/psakData';
import { koreksiJurbalApi } from '../features/koreksiJurbal/api';

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

// Modal upload Excel: beberapa file sekaligus (satu file per segmen), dikirim satu per satu
// ke backend (POST /koreksi-jurbal/uploads). Segmen tiap file dikenali otomatis di server.
const MAX_MB = 200;

const fmtSize = (bytes) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

// 422 import / validasi: ambil pesan pertama yang bermasalah
const uploadError = (err) => {
  const first = err.data?.errors?.[0];
  const detail = Array.isArray(first?.messages)
    ? `${first.row ? `Baris ${first.row}: ` : ''}${first.messages.join(', ')}`
    : Object.values(err.data?.errors ?? {})[0]?.[0];
  return detail || err.message || 'Upload gagal.';
};

function UploadPsakModal({ open, onClose, onUploaded }) {
  // items: [{ id, file, status: 'pending' | 'uploading' | 'done' | 'error', message }]
  const [items, setItems] = useState([]);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  if (!open) return null;

  const pick = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const rejected = [];
    const accepted = [];
    files.forEach((f) => {
      if (!/\.xlsx$/i.test(f.name)) rejected.push(`${f.name}: format harus .xlsx`);
      // Di atas batas server, PHP membuang request tanpa pesan jelas: tolak lebih awal
      else if (f.size > MAX_MB * 1024 * 1024) rejected.push(`${f.name}: ${fmtSize(f.size)} melebihi batas ${MAX_MB} MB`);
      else accepted.push(f);
    });

    setItems((prev) => {
      // Item yang sudah selesai/gagal dari percobaan sebelumnya dibuang saat memilih file baru
      const keep = prev.filter((it) => it.status === 'pending');
      const known = new Set(keep.map((it) => `${it.file.name}|${it.file.size}`));
      const added = accepted
        .filter((f) => !known.has(`${f.name}|${f.size}`))
        .map((f) => ({ id: `${f.name}|${f.size}|${f.lastModified}`, file: f, status: 'pending', message: '' }));
      return [...keep, ...added];
    });
    setError(rejected.join(' · '));
  };

  const remove = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const close = () => {
    if (loading) return;
    setItems([]);
    setError('');
    onClose();
  };

  const update = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const submit = async () => {
    const queue = items.filter((it) => it.status === 'pending');
    if (!queue.length) return;
    setLoading(true);
    setError('');

    // Satu per satu: tiap file bisa ratusan MB, batas server per request
    const uploads = [];
    let failed = 0;
    for (const it of queue) {
      update(it.id, { status: 'uploading', message: '' });
      try {
        const res = await koreksiJurbalApi.upload(it.file);
        uploads.push(res.data);
        update(it.id, { status: 'done', message: 'Diterima, diproses di server' });
      } catch (err) {
        failed++;
        update(it.id, { status: 'error', message: uploadError(err) });
      }
    }

    setLoading(false);
    if (uploads.length) onUploaded(uploads);
    if (!failed) {
      setItems([]);
      onClose();
    }
  };

  const pendingCount = items.filter((it) => it.status === 'pending').length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Rekap Koreksi PSAK</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Excel raw data segmen DGS, DPS, DSS, dan RBS (jenis file dikenali otomatis)
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 cursor-pointer disabled:cursor-not-allowed"
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
              if (!loading) pick(e.dataTransfer.files);
            }}
            onClick={() => !loading && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              multiple
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
              {drag ? 'Lepaskan file di sini' : 'Drag & drop file atau klik untuk pilih (bisa lebih dari satu)'}
            </p>
            <p className="text-xs text-slate-400 mt-1">.xlsx · maks. {MAX_MB} MB per file · satu file per segmen</p>
          </div>

          {items.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${
                    it.status === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <FileSpreadsheet size={18} className="text-emerald-600 shrink-0 mt-px" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{it.file.name}</p>
                    {it.message && (
                      <p className={`text-[11px] mt-0.5 ${it.status === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {it.message}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 mt-px">{fmtSize(it.file.size)}</span>
                  {it.status === 'uploading' && <Loader2 size={14} className="animate-spin text-blue-600 shrink-0 mt-px" />}
                  {it.status === 'done' && <Check size={14} className="text-emerald-600 shrink-0 mt-px" />}
                  {(it.status === 'pending' || it.status === 'error') && !loading && (
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                      aria-label={`Hapus ${it.file.name}`}
                    >
                      <X size={14} />
                    </button>
                  )}
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
          <span className="text-[11px] text-slate-500">File disimpan ke server sebagai riwayat upload</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
            >
              {items.some((it) => it.status === 'error') ? 'Tutup' : 'Batal'}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!pendingCount || loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {loading ? 'Mengunggah...' : pendingCount > 1 ? `Upload ${pendingCount} file` : 'Upload'}
            </button>
          </div>
        </div>
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
  const [data, setData] = useState(() => loadPsakData());
  const [showUpload, setShowUpload] = useState(false);
  const [notice, setNotice] = useState(null);

  const { period, rows, source } = data;
  const total = useMemo(() => computePsakTotal(rows), [rows]);
  const reverseLabel = `Reverse ${period.reverse}`;
  const correctionLabel = `Correction ${period.correction}`;
  const PSAK_PERIOD = period;

  const noticeTimer = useRef(null);
  // ms = null → notice tetap tampil (dipakai selama import berjalan)
  const flash = (msg, tone = 'ok', ms = 3500) => {
    clearTimeout(noticeTimer.current);
    setNotice({ msg, tone });
    if (ms) noticeTimer.current = setTimeout(() => setNotice(null), ms);
  };

  // Tabel diisi dari rekap server (upload terbaru per segmen). Belum ada upload → data contoh.
  const loadSummary = useCallback(async () => {
    try {
      const res = await koreksiJurbalApi.summary();
      if (!res?.rows?.length) return;
      const latest = res.rows.reduce((a, r) => (r.source.uploadedAt > a.source.uploadedAt ? r : a));
      const segmen = res.rows.map((r) => r.segmen).join(', ');
      const missing = res.missing?.length ? ` · belum ada: ${res.missing.join(', ')}` : '';
      setData({
        period: { reverse: res.period.reverse, correction: res.period.correction },
        rows: res.rows,
        source: { filename: `Upload ${segmen}${missing}`, uploadedAt: latest.source.uploadedAt, server: true }
      });
    } catch {
      // server tidak bisa dihubungi: tetap tampilkan data yang ada
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Import berjalan di queue server: pantau status lewat GET uploads sampai done/failed.
  // Beberapa file diproses berurutan di queue: tabel di-refresh setiap ada file yang selesai.
  const handleUploaded = async (uploads) => {
    const waiting = new Map(uploads.map((u) => [u.id, u]));
    const done = [];
    const failed = [];
    const progress = () =>
      flash(
        `Memproses ${uploads.length} file... ${done.length + failed.length}/${uploads.length} selesai` +
          (done.length ? ` (${done.join(', ')})` : ''),
        'ok',
        null
      );
    progress();

    const deadline = Date.now() + 60 * 60 * 1000;
    while (waiting.size && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      let list;
      try {
        list = (await koreksiJurbalApi.uploads()).data ?? [];
      } catch {
        continue; // gangguan jaringan sesaat: coba lagi
      }

      let changed = false;
      for (const current of list) {
        if (!waiting.has(current.id) || current.status === 'processing') continue;
        waiting.delete(current.id);
        changed = true;
        if (current.status === 'done') {
          done.push(current.segmen);
        } else {
          const e = current.first_error;
          const detail = e ? `${e.row ? `Baris ${e.row}: ` : ''}${e.messages?.join(', ')}` : 'Import gagal';
          failed.push(`${current.original_name}: ${detail}`);
        }
      }
      if (changed) {
        if (done.length) await loadSummary();
        progress();
      }
    }

    if (waiting.size) {
      flash(`${waiting.size} file masih diproses. Cek lagi nanti.`, 'warn');
    } else if (failed.length) {
      const ok = done.length ? `Berhasil: ${done.join(', ')}. ` : '';
      flash(`${ok}Gagal: ${failed.join(' · ')}`, 'warn', 15000);
    } else {
      flash(`Segmen ${done.join(', ')} berhasil dimuat ke tabel`);
    }
  };

  const handleReset = () => {
    setData(resetPsakData());
    flash('Data dikembalikan ke data contoh');
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

  return (
    <div id="psak-main-content" className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 tracking-tight">
            Koreksi & Jurbal PSAK
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reverse {PSAK_PERIOD.reverse}, Correction {PSAK_PERIOD.correction}, dan rincian koreksi per tipe PSAK
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
            filename={`Koreksi_Jurbal_PSAK_${PSAK_PERIOD.correction}`}
            title={`Koreksi & Jurbal PSAK – Witel Solo JT (${correctionLabel})`}
            tableSelector="#psak-main-content table"
            pdfSelector="#psak-main-content"
          />
          <ShareDropdown buttonLabel="Salin & Bagikan" captureSelector="#psak-main-content" />
        </div>
      </div>

      {/* Tabel utama */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Status bar (gaya EDK) */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <span className="text-slate-500 font-medium">Periode :</span>
            <b className="font-bold text-slate-800">
              {reverseLabel} · {correctionLabel}
            </b>
            <span className="text-slate-400 hidden sm:inline">· Net = Reverse + Correction (Rp)</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {source ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                <FileSpreadsheet size={12} />
                {source.filename} · {fmtDateTime(source.uploadedAt)}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">Data contoh</span>
            )}
            {source && !source.server && (
              <button
                type="button"
                data-html2canvas-ignore="true"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                title="Hapus data upload dan kembali ke data contoh"
              >
                <RotateCcw size={11} />
                Kembalikan data contoh
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1300px] text-xs border-collapse border-spacing-0">
            <thead className="bg-white">
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
              {rows.map((r) => renderRow(r))}

              {/* Summary row */}
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
            </tbody>
          </table>
        </div>

        {/* Footer (gaya EDK) */}
        <div className="px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
          Menampilkan <b className="text-slate-800">1–{rows.length}</b> dari{' '}
          <b className="text-slate-800">{rows.length}</b> data segmen
        </div>
      </section>

      <UploadPsakModal open={showUpload} onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />

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
