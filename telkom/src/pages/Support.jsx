import {useState} from 'react';
import {
  Filter,
  Share2,
  ChevronDown,
  Download,
  Menu,
  Upload,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  File
} from 'lucide-react';
import {agenda, agendaSummary, units} from '../data/supportData';
import {exportCSV} from '../components/ui';

export default function Support() {
  const [copied, setCopied] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadDone, setUploadDone] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const exportData = agenda.map(r => ({
      'NO': r.no,
      'NAMA AGENDA KOORDINASI': r.name + (r.sub ? ` ${r.sub}` : ''),
      'OPEN': r.open,
      '% OPEN': r.pctOpen,
      'NEED DISCUSS': r.discuss,
      '% DISCUSS': r.pctDiscuss,
      'ON PROGRESS': r.progress,
      '% PROGRESS': r.pctProgress,
      'DONE': r.done,
      '% DONE': r.pctDone,
      'TOTAL': r.total
    }));
    exportCSV(exportData, 'Report-Follow-Up-Support-Needed');
  };

  const renderVal = (val, isRed = false) => {
    if (val === 0) {
      return <span className="text-slate-300 font-normal">0</span>;
    }
    return <span className={isRed ? 'text-red-600 font-bold' : 'text-slate-800 font-bold'}>{val}</span>;
  };

  const renderPct = (pct, isRed = false) => {
    if (pct === '0%') {
      return <span className="text-slate-300 font-normal">0%</span>;
    }
    return <span className={isRed ? 'text-red-600 font-bold' : 'text-slate-500 font-medium'}>{pct}</span>;
  };

  return (
    <>
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            MoM & Support Needed
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Komposisi Kuadran & pergerakan • Source : Pivot
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Filter size={14} className="text-slate-500" />
            <span>Filter</span>
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
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} className="opacity-80" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            {copied ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Share2 size={14} className="text-slate-500" />
            )}
            <span>{copied ? 'Tersalin' : 'Salin & Bagikan'}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
      </header>

      {/* Card 1: Report Follow Up Support Needed — By Agenda */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs mb-6">
        {/* Navy Blue Header Bar */}
        <div className="bg-[#0B1E48] px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
              <Menu size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Report Follow Up Support Needed — By Agenda
              </h2>
              <p className="text-xs text-white/75 mt-0.5">
                Distribusi status kebutuhan per agenda rapat koordinasi strategis
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-white/95 bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-lg">
            Total {agendaSummary.totalCategories} Kategori Agenda Terdata
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12 font-semibold">NO</th>
                <th className="py-3 px-3 text-center min-w-[200px] font-bold">NAMA AGENDA KOORDINASI</th>
                <th className="py-3 px-3 text-center font-extrabold text-red-600 bg-red-50/40">OPEN</th>
                <th className="py-3 px-3 text-center font-extrabold text-red-600 bg-red-50/40">% OPEN</th>
                <th className="py-3 px-3 text-center font-bold text-slate-700">NEED DISCUSS</th>
                <th className="py-3 px-3 text-center font-semibold text-slate-500">% DISCUSS</th>
                <th className="py-3 px-3 text-center font-bold text-slate-700">ON PROGRESS</th>
                <th className="py-3 px-3 text-center font-semibold text-slate-500">% PROGRESS</th>
                <th className="py-3 px-3 text-center font-bold text-slate-700">DONE</th>
                <th className="py-3 px-3 text-center font-semibold text-slate-500">% DONE</th>
                <th className="py-3 px-3 text-center font-extrabold text-slate-900">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agenda.map(r => (
                <tr key={r.no} className="hover:bg-slate-50/50 transition-colors">
                  <td className={`py-3 px-3 text-center ${r.highlightNo ? 'text-red-600 font-bold' : 'text-slate-600 font-medium'}`}>
                    {r.no}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center justify-center gap-1.5 text-center">
                      {r.tag === 'bar' && (
                        <span className="w-1.5 h-3.5 bg-red-600 rounded-2xs shrink-0" aria-hidden="true" />
                      )}
                      {r.tag === 'dot' && (
                        <span className="size-2 rounded-full bg-red-600 shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900">{r.name}</span>
                        {r.sub && (
                          <span className="block text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                            {r.sub}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center bg-red-50/35">
                    {renderVal(r.open, true)}
                  </td>
                  <td className="py-3 px-3 text-center bg-red-50/35">
                    {renderPct(r.pctOpen, true)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderVal(r.discuss)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderPct(r.pctDiscuss)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderVal(r.progress)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderPct(r.pctProgress)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderVal(r.done)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderPct(r.pctDone)}
                  </td>
                  <td className={`py-3 px-3 text-center ${r.highlightTotal ? 'text-red-600 font-bold bg-red-50/35' : 'text-slate-900 font-bold'}`}>
                    {r.total}
                  </td>
                </tr>
              ))}

              {/* Total Keseluruhan Row */}
              <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                <td colSpan={2} className="py-3.5 px-4 text-center font-extrabold text-slate-900 tracking-wide text-xs">
                  TOTAL KESELURUHAN
                </td>
                <td className="py-3.5 px-3 text-center bg-red-50/40 font-extrabold text-red-600 text-sm">
                  {agendaSummary.totalOpen}
                </td>
                <td className="py-3.5 px-3 text-center bg-red-50/40 font-extrabold text-red-600 text-xs">
                  {agendaSummary.pctOpen}
                </td>
                <td className="py-3.5 px-3 text-center font-extrabold text-slate-900 text-sm">
                  {agendaSummary.totalDiscuss}
                </td>
                <td className="py-3.5 px-3 text-center font-bold text-slate-700 text-xs">
                  {agendaSummary.pctDiscuss}
                </td>
                <td className="py-3.5 px-3 text-center font-extrabold text-slate-900 text-sm">
                  {agendaSummary.totalProgress}
                </td>
                <td className="py-3.5 px-3 text-center font-bold text-slate-700 text-xs">
                  {agendaSummary.pctProgress}
                </td>
                <td className="py-3.5 px-3 text-center font-extrabold text-slate-900 text-sm">
                  {agendaSummary.totalDone}
                </td>
                <td className="py-3.5 px-3 text-center font-bold text-slate-700 text-xs">
                  {agendaSummary.pctDone}
                </td>
                <td className="py-3.5 px-3 text-center font-extrabold text-slate-900 text-base">
                  {agendaSummary.grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Note Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-start gap-2.5">
          <span className="size-3.5 rounded-2xs bg-red-600 shrink-0 mt-0.5 inline-block" aria-hidden="true" />
          <div>
            <p className="text-xs text-slate-700 leading-normal">
              <strong className="text-slate-900">Catatan:</strong> {agendaSummary.note}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sinkronisasi terakhir: {agendaSummary.lastSync}
            </p>
          </div>
        </div>
      </section>

      {/* Card 2: Report Follow Up Support Needed — By Unit */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Report Follow Up Support Needed — By Unit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian beban eskalasi dukungan berdasarkan unit operasional dan fungsional
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md tracking-wider">
            UNIT ENTERPRISE TERKAIT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {units.map(u => (
            <div
              key={u.name}
              className={`rounded-2xl p-5 bg-white shadow-2xs flex flex-col justify-between ${
                u.isTop ? 'border-2 border-blue-600' : 'border border-slate-200'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wide ${u.isTop ? 'text-blue-600' : 'text-slate-400'}`}>
                  {u.category}
                </p>
                <h4 className="font-bold text-slate-900 text-sm mt-1 mb-4">
                  {u.name}
                </h4>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className={`text-3xl font-extrabold leading-none ${u.isTop ? 'text-blue-600' : 'text-slate-900'}`}>
                    {u.count}
                  </span>
                  <span className={`block text-xs font-bold mt-1 ${u.isTop ? 'text-blue-600' : 'text-slate-900'}`}>
                    Item
                  </span>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${
                  u.isTop
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : 'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {u.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Upload Report MoM</h3>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadDone(false);
                  setUploadFiles([]);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-colors">
                <Upload size={28} className="text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Pilih file Excel / CSV</span>
                <span className="text-[11px] text-slate-400 mt-1">Maksimal 10MB</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files.length) {
                      setUploadFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </label>

              {uploadFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                      <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate flex-1 font-medium text-slate-700">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadDone(false);
                  setUploadFiles([]);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={!uploadFiles.length}
                onClick={() => {
                  setUploadDone(true);
                  setTimeout(() => {
                    setShowUpload(false);
                    setUploadDone(false);
                    setUploadFiles([]);
                  }, 1200);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all cursor-pointer ${
                  uploadDone
                    ? 'bg-emerald-500'
                    : uploadFiles.length
                    ? 'bg-[#2563EB] hover:bg-blue-700'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {uploadDone ? 'Berhasil Diunggah!' : 'Unggah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
