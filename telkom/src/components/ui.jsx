import {Filter,Upload,Download,Share2,Lightbulb,Check,X,FileText,FileSpreadsheet,File,Trash2,Image,Table,Link,ChevronDown} from 'lucide-react';import {useState,useRef,useCallback,useEffect} from 'react';
export const fmt=n=>n.toLocaleString('id-ID');
// Ringkas nominal Rupiah: >= 1 miliar → "M", >= 1 juta → "Jt" (contoh: 1,65 M / 571,6 Jt)
export const fmtRupiahSingkat = (val) => {
  const num = Number(val);
  if (val === undefined || val === null || Number.isNaN(num)) return '-';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
  return `${sign}${abs.toLocaleString('id-ID')}`;
};
export { default as ShareDropdown } from './ShareDropdown';
import ShareDropdown from './ShareDropdown';

import { collectSheets, exportXlsx, exportCsv, exportDocx, exportPdf } from '../lib/exporters';
export function ShareButton(props) {
  return <ShareDropdown {...props} />;
}
import {createPortal} from 'react-dom';

export function ExportButton({
  filename = 'export-report',
  title,
  tableSelector = 'table',
  pdfSelector,
  sheets,
  onExportXlsx,
  onExportCsv,
  prepareExport // opsional: () => restoreFn, mis. tampilkan semua tabel dulu sebelum export data
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const docTitle = title || filename.replace(/_/g, ' ');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Jalankan export dengan status "Memproses..." + pesan sukses/gagal yang seragam
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const run = async (label, fn, { usePrepare = true } = {}) => {
    setOpen(false);
    setBusy(true);
    let restore = null;
    try {
      // Tunggu dropdown tertutup (penting untuk PDF yang memotret halaman)
      await nextFrame();
      if (usePrepare && prepareExport) {
        restore = prepareExport();
        await nextFrame();
      }
      const ok = await fn();
      showFeedback(ok === false ? 'Data tabel tidak ditemukan' : `Export ${label} berhasil`);
    } catch (err) {
      console.error(err);
      showFeedback(err?.message ? `Gagal export ${label}: ${err.message}` : `Gagal export ${label}`);
    } finally {
      if (typeof restore === 'function') restore();
      setBusy(false);
    }
  };

  // sheets boleh berupa array atau fungsi (dievaluasi saat tombol diklik)
  const resolveSheets = () => (typeof sheets === 'function' ? sheets() : sheets);

  const handleExportXLSX = () =>
    run('XLSX', async () => {
      if (onExportXlsx) return onExportXlsx();
      const list = collectSheets({ sheets: resolveSheets(), tableSelector });
      if (!list.length) return false;
      await exportXlsx(list, filename, docTitle);
    });

  const handleExportCSV = () =>
    run('CSV', async () => {
      if (onExportCsv) return onExportCsv();
      const list = collectSheets({ sheets: resolveSheets(), tableSelector });
      if (!list.length) return false;
      exportCsv(list, filename);
    });

  const handleExportDOCX = () =>
    run('DOCX', async () => exportDocx({ sheets: resolveSheets(), tableSelector }, filename, docTitle));

  // PDF = apa yang sedang tampil di layar (tanpa prepareExport)
  const handleExportPDF = () =>
    run(
      'PDF',
      async () => {
        const target =
          (pdfSelector && document.querySelector(pdfSelector)) || document.querySelector('main') || document.body;
        await exportPdf(target, filename, docTitle);
      },
      { usePrepare: false }
    );

  const options = [
    {
      label: 'Export DOCX',
      icon: FileText,
      iconColor: 'text-blue-500',
      action: handleExportDOCX
    },
    {
      label: 'Export XLSX',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-600',
      action: handleExportXLSX
    },
    {
      label: 'Export CSV',
      icon: Table,
      iconColor: 'text-teal-600',
      action: handleExportCSV
    },
    {
      label: 'Export PDF',
      icon: FileText,
      iconColor: 'text-rose-500',
      action: handleExportPDF
    }
  ];

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={busy}
        className="bg-[#2563EB] hover:bg-blue-700 disabled:opacity-70 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
      >
        <span>{busy ? 'Memproses...' : 'Export'}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div data-html2canvas-ignore="true" className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200/90 shadow-xl z-50 py-1.5 animate-[fadeIn_0.15s_ease-out]">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={opt.action}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left text-xs font-semibold text-slate-700 cursor-pointer group"
            >
              <opt.icon size={16} className={`${opt.iconColor} shrink-0`} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div data-html2canvas-ignore="true" className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg z-50 whitespace-nowrap animate-[fadeIn_0.15s_ease-out]">
          {feedback}
        </div>
      )}
    </div>
  );
}

function UploadModal({open,onClose}){
  const [files,setFiles]=useState([]);
  const [drag,setDrag]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [done,setDone]=useState(false);
  const inputRef=useRef(null);

  const accept='.csv,.xlsx,.xls,.pdf';
  const maxSize=10*1024*1024; // 10MB

  const addFiles=useCallback((newFiles)=>{
    const valid=Array.from(newFiles).filter(f=>{
      const ext='.'+f.name.split('.').pop().toLowerCase();
      return ['.csv','.xlsx','.xls','.pdf'].includes(ext) && f.size<=maxSize;
    });
    setFiles(prev=>[...prev,...valid]);
    setDone(false);
  },[]);

  const handleDrop=useCallback(e=>{
    e.preventDefault();setDrag(false);
    if(e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  },[addFiles]);

  const removeFile=i=>setFiles(prev=>prev.filter((_,idx)=>idx!==i));

  const formatSize=bytes=>{
    if(bytes<1024) return bytes+' B';
    if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB';
    return (bytes/(1024*1024)).toFixed(1)+' MB';
  };

  const getIcon=name=>{
    const ext=name.split('.').pop().toLowerCase();
    if(ext==='pdf') return <FileText size={18} className="text-red-500"/>;
    if(['xlsx','xls','csv'].includes(ext)) return <FileSpreadsheet size={18} className="text-emerald-600"/>;
    return <File size={18} className="text-slate-400"/>;
  };

  const handleUpload=()=>{
    if(!files.length) return;
    setUploading(true);
    // Simulate upload
    setTimeout(()=>{
      setUploading(false);
      setDone(true);
      setTimeout(()=>{
        setFiles([]);setDone(false);onClose();
      },1500);
    },1800);
  };

  const handleClose=()=>{setFiles([]);setDone(false);setUploading(false);onClose();};

  if(!open) return null;

  return createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden/>
    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]" onClick={e=>e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Upload Report</h2>
          <p className="text-xs text-slate-500 mt-0.5">Format yang didukung: CSV, XLSX, PDF (maks 10MB)</p>
        </div>
        <button onClick={handleClose} className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Tutup"><X size={18}/></button>
      </div>

      {/* Drop Zone */}
      <div className="px-6 py-5">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${drag?'border-red-400 bg-red-50':'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}
          onDragOver={e=>{e.preventDefault();setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={handleDrop}
          onClick={()=>inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={e=>{if(e.target.files.length) addFiles(e.target.files);e.target.value='';}}/>
          <div className={`mx-auto size-12 rounded-xl grid place-items-center mb-3 transition-colors ${drag?'bg-red-100 text-red-500':'bg-slate-100 text-slate-400'}`}>
            <Upload size={22}/>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {drag?'Lepaskan file di sini':'Drag & drop file atau klik untuk pilih'}
          </p>
          <p className="text-xs text-slate-400 mt-1">CSV, XLSX, PDF • Maksimal 10MB per file</p>
        </div>

        {/* File List */}
        {files.length>0&&<div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {files.map((f,i)=>(
            <div key={f.name+i} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 group">
              {getIcon(f.name)}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                <p className="text-[11px] text-slate-400">{formatSize(f.size)}</p>
              </div>
              {!uploading&&<button onClick={()=>removeFile(i)} className="size-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 grid place-items-center text-slate-400 transition-all cursor-pointer" aria-label="Hapus"><Trash2 size={14}/></button>}
            </div>
          ))}
        </div>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <span className="text-xs text-slate-500">{files.length?`${files.length} file dipilih`:''}</span>
        <div className="flex gap-2">
          <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">Batal</button>
          <button
            onClick={handleUpload}
            disabled={!files.length||uploading}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              done?'bg-emerald-500 text-white':
              files.length&&!uploading?'bg-red-600 hover:bg-red-700 text-white shadow-sm':
              'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {done&&<><Check size={14}/>Berhasil</>}
            {uploading&&<><span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Mengunggah...</>}
            {!done&&!uploading&&<><Upload size={14}/>Upload</>}
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body
  )
}

export function PageHeader({title,sub,onExport,actions}){const [showUpload,setShowUpload]=useState(false);return <><header className="flex flex-wrap items-end justify-between gap-3 mb-6">
<div><h1 className="text-[32px] leading-9 font-bold tracking-tight">{title}</h1><p className="text-mute mt-1">{sub}</p></div>
<div className="flex flex-wrap gap-2">{actions??<><button className="btn cursor-pointer"><Filter size={14}/>Filter</button><button className="btn cursor-pointer" onClick={()=>setShowUpload(true)}><Upload size={14}/>Upload Report</button><ExportButton onClick={onExport}/><ShareButton/></>}</div></header>
<UploadModal open={showUpload} onClose={()=>setShowUpload(false)}/></>}
export const STATUS={ok:['On Track','bg-ok'],warn:['Need Attention','bg-warn'],bad:['Below Target','bg-bad'],none:['No Change','bg-ink']};
export const statusOf=m=>m>0?'ok':m<0?'bad':'none';
export function StatusLegend(){return <div className="card p-4"><b>Status Performa</b><ul className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-mute">{Object.values(STATUS).map(([l,c])=><li key={l} className="flex items-center gap-1.5"><i className={`size-2.5 rounded-full ${c}`}/>{l}</li>)}</ul></div>}
export function StatusBadge({s}){const c={Done:'bg-emerald-50 text-emerald-700','In-Progress':'bg-blue-50 text-blue-700','Not Yet':'bg-red-50 text-red-600'}[s];return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c}`}>{s}</span>}
export function KeyInsight({text}){return <div className="card p-4 flex gap-3 bg-gradient-to-r from-white to-red-100 border-red-100"><span className="size-8 shrink-0 rounded-full bg-red-100 text-brand grid place-items-center"><Lightbulb size={16}/></span><div><b>Key Insight</b><p className="text-xs text-mute mt-0.5">{text}</p></div></div>}
export function KpiCard({label,value,note,tone='text-ok'}){return <div className="card p-5"><p className="text-xs text-mute font-medium">{label}</p><p className="text-3xl font-bold mt-1">{value}</p><p className={`text-xs mt-1 ${tone}`}>{note}</p></div>}
export function ProgressBar({v,c='bg-brand'}){return <div className="h-1.5 w-full rounded-full bg-slate-100"><div className={`h-full rounded-full ${c}`} style={{width:v+'%'}}/></div>}
export function exportCSV(rows, name = 'export') {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const escapeCell = (val) => {
    const str = String(val ?? '')
      .replace(/\r?\n+/g, ' | ')
      .replace(/\s+/g, ' ')
      .trim();
    return `"${str.replace(/"/g, '""')}"`;
  };
  const headerLine = keys.map(escapeCell).join(',');
  const dataLines = rows.map((r) => keys.map((k) => escapeCell(r[k])).join(','));
  // 'sep=,' instructs Microsoft Excel (both ID and EN locales) to split columns by comma automatically
  const csvContent = '\uFEFFsep=,\r\n' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
