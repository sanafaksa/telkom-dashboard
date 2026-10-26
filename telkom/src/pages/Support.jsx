import { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  ChevronDown,
  Download,
  Menu,
  Upload,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  Eye,
  Info,
  HelpCircle,
  FileCheck2,
  Pencil,
  Plus
} from 'lucide-react';
import {
  loadSavedSupportData,
  saveSupportData,
  resetSupportData,
  parseSupportCSV,
  parseSupportExcel,
  computeSupportMetrics,
  normalizeStatus,
  DEFAULT_SUPPORT_CSV
} from '../data/supportParser';
import { exportCSV, ShareDropdown } from '../components/ui';

export default function Support() {
  // Action plans data state (loaded from LocalStorage or default CSV)
  const [actionPlans, setActionPlans] = useState(() => {
    const loaded = loadSavedSupportData();
    return loaded.map((item, idx) => ({
      ...item,
      id: item.id !== undefined ? item.id : `plan_${idx + 1}`
    }));
  });
  const [metrics, setMetrics] = useState(() => computeSupportMetrics(actionPlans));

  // Search & Filter state for detail table
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [agendaFilter, setAgendaFilter] = useState('Semua');
  const [uicFilter, setUicFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Detail Modal & Direct All-Boxes Edit State
  const [detailItem, setDetailItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // Recalculate metrics & persist whenever actionPlans change
  useEffect(() => {
    const computed = computeSupportMetrics(actionPlans);
    setMetrics(computed);
    saveSupportData(actionPlans);
  }, [actionPlans]);

  // Open detail modal with all boxes directly editable
  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setEditFormData({ ...item });
    setEditSuccessMsg('');
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setDetailItem(null);
    setEditFormData({});
    setEditSuccessMsg('');
  };

  // Update field in edit form
  const handleFieldChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Save changes to item, close modal, and update list + localStorage
  const handleSaveAll = () => {
    if (!detailItem) return;

    const updatedData = {
      ...detailItem,
      ...editFormData
    };

    if (updatedData.status) {
      updatedData.status = normalizeStatus(updatedData.status);
    }

    if (updatedData.supportNeeded !== undefined && !String(updatedData.supportNeeded).trim()) {
      updatedData.supportNeeded = '-';
    }

    setActionPlans((prev) =>
      prev.map((item) => {
        const isMatch =
          (item.id !== undefined && item.id === detailItem.id) ||
          (item.no === detailItem.no && item.actionPlan === detailItem.actionPlan);
        return isMatch ? updatedData : item;
      })
    );

    setDetailItem(null);
    setEditFormData({});
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && detailItem) {
        handleCloseDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailItem]);

  // Unique list of agendas and UICs for filters
  const uniqueAgendas = useMemo(() => {
    const s = new Set(actionPlans.map((x) => x.agenda).filter(Boolean));
    return Array.from(s);
  }, [actionPlans]);

  const uniqueUics = useMemo(() => {
    const s = new Set();
    actionPlans.forEach((x) => {
      if (x.uic) {
        x.uic.split(',').forEach((u) => s.add(u.trim()));
      }
    });
    return Array.from(s).filter(Boolean);
  }, [actionPlans]);

  // Filtered action plan items
  const filteredPlans = useMemo(() => {
    return actionPlans.filter((item) => {
      const matchStatus =
        statusFilter === 'Semua' ||
        item.status === statusFilter;

      const matchAgenda =
        agendaFilter === 'Semua' || item.agenda === agendaFilter;

      const matchUic =
        uicFilter === 'Semua' ||
        (item.uic && item.uic.includes(uicFilter));

      const q = searchQ.trim().toLowerCase();
      const matchQuery =
        !q ||
        (item.actionPlan || '').toLowerCase().includes(q) ||
        (item.mainTopic || '').toLowerCase().includes(q) ||
        (item.agenda || '').toLowerCase().includes(q) ||
        (item.supportNeeded || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        (item.destinasiFu || '').toLowerCase().includes(q);

      return matchStatus && matchAgenda && matchUic && matchQuery;
    });
  }, [actionPlans, statusFilter, agendaFilter, uicFilter, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, page]);

  // Handle file upload (CSV or XLSX)
  const handleUploadSubmit = async () => {
    if (!uploadFiles.length) return;
    const file = uploadFiles[0];
    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      let parsed = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || file.type.includes('csv')) {
        const text = await file.text();
        parsed = parseSupportCSV(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parsed = await parseSupportExcel(file);
      } else {
        throw new Error('Format file tidak didukung. Harap unggah file .csv atau .xlsx / .xls');
      }

      if (!parsed || parsed.length === 0) {
        throw new Error('File tidak memiliki baris action plan yang dapat dibaca. Pastikan terdapat kolom ACTION PLAN atau STATUS.');
      }

      setActionPlans(parsed);
      setUploadSuccess(`Berhasil memuat ${parsed.length} butir Action Plan dari file "${file.name}"!`);
      setTimeout(() => {
        setShowUpload(false);
        setUploadSuccess('');
        setUploadFiles([]);
      }, 1500);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Gagal memproses file spreadsheet');
    } finally {
      setUploadLoading(false);
    }
  };

  // Reset to default sample CSV
  const handleResetDefault = () => {
    if (confirm('Kembalikan ke data default template MoM & Support Needed?')) {
      const def = resetSupportData();
      setActionPlans(def);
    }
  };

  // Export data
  const handleExport = () => {
    const exportData = actionPlans.map((r, i) => ({
      'NO': r.no || i + 1,
      'TGL': r.tgl,
      'AGENDA': r.agenda,
      'MAIN TOPIC': r.mainTopic,
      'UNIT/TELDA': r.unitTelda,
      'PESERTA': r.peserta,
      'ACTION PLAN': r.actionPlan,
      'UIC': r.uic,
      'DESTINASI FU': r.destinasiFu,
      'SUPPORT NEEDED': r.supportNeeded,
      'DEADLINE': r.deadline,
      'STATUS': r.status,
      'NOTES TO FOLLOW UP': r.notes
    }));
    exportCSV(exportData, `Report_Support_Needed_${new Date().toISOString().slice(0, 10)}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            DONE
          </span>
        );
      case 'IN PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
            IN PROGRESS
          </span>
        );
      case 'NEED DISCUSS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
            <span className="size-1.5 rounded-full bg-amber-500" />
            NEED DISCUSS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
            <span className="size-1.5 rounded-full bg-rose-500" />
            BELUM FU
          </span>
        );
    }
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

  const { agendaList, agendaSummary, unitsList } = metrics;

  return (
    <div id="support-main-content" className="space-y-6">
      {/* 1. Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              MoM &amp; Support Needed
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoring tindak lanjut MoM rapat koordinasi &amp; eskalasi support needed Regional 3
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#1447B8] to-[#2563EB] hover:from-[#0E3A9E] hover:to-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
          >
            <Upload size={14} />
            <span>Upload CSV / Excel</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetDefault}
            title="Kembalikan ke data template awal"
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-semibold p-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>

          {/* Full Page Share & Copy as Picture */}
          <ShareDropdown
            buttonLabel="Salin &amp; Bagikan"
            captureSelector="#support-main-content"
            tableSelector="table"
          />
        </div>
      </header>

      {/* 2. Card 1: Report Follow Up Support Needed — By Agenda */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
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
                Distribusi status kebutuhan per agenda rapat koordinasi strategis (Dihitung Otomatis dari CSV/Excel)
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
                <th className="py-3 px-3 text-left min-w-[200px] font-bold">NAMA AGENDA KOORDINASI</th>
                <th className="py-3 px-3 text-center font-extrabold text-red-600 bg-red-50/40">OPEN / BELUM FU</th>
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
              {agendaList.map((r) => (
                <tr key={r.name} className="hover:bg-slate-50/60 transition-colors">
                  <td className={`py-3 px-3 text-center ${r.highlightNo ? 'text-red-600 font-bold' : 'text-slate-600 font-medium'}`}>
                    {r.no}
                  </td>
                  <td className="py-3 px-3 text-left font-bold text-slate-800">
                    {r.name}
                  </td>
                  <td className="py-3 px-3 text-center bg-red-50/20">
                    {renderVal(r.open, true)}
                  </td>
                  <td className="py-3 px-3 text-center bg-red-50/20">
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
                  <td className="py-3 px-3 text-center font-black text-slate-900">
                    {r.total}
                  </td>
                </tr>
              ))}

              {/* Total Keseluruhan Row */}
              <tr className="bg-slate-50/90 border-t-2 border-slate-200">
                <td colSpan={2} className="py-3.5 px-4 text-left font-black text-slate-900 tracking-wide text-xs">
                  TOTAL KESELURUHAN
                </td>
                <td className="py-3.5 px-3 text-center bg-red-50/50 font-black text-red-600 text-sm">
                  {agendaSummary.totalOpen}
                </td>
                <td className="py-3.5 px-3 text-center bg-red-50/50 font-black text-red-600 text-xs">
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
                <td className="py-3.5 px-3 text-center font-black text-slate-900 text-base">
                  {agendaSummary.grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Note Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-start gap-2.5">
          <span className="size-3.5 rounded-2xs bg-red-600 shrink-0 mt-0.5 inline-block" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-xs text-slate-700 leading-normal">
              <strong className="text-slate-900">Catatan Otomatis:</strong> {agendaSummary.note}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sinkronisasi data terakhir: {agendaSummary.lastSync}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Card 2: Report Follow Up Support Needed — By Unit */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Report Follow Up Support Needed — By Unit (UIC)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian beban eskalasi dukungan berdasarkan unit operasional dan fungsional
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md tracking-wider">
            DISTRIBUSI UNIT TERKAIT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {unitsList.map((u) => (
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
                  <span className={`text-3xl font-black leading-none ${u.isTop ? 'text-blue-600' : 'text-slate-900'}`}>
                    {u.count}
                  </span>
                  <span className={`block text-xs font-bold mt-1 ${u.isTop ? 'text-blue-600' : 'text-slate-900'}`}>
                    Action Item
                  </span>
                </div>
                <div
                  className={`text-[11px] font-medium px-2.5 py-2 rounded-xl border flex flex-col gap-1 leading-tight shrink-0 ${
                    u.isTop
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-slate-50 text-slate-600 border-slate-100'
                  }`}
                >
                  {(u.status || '').split(',').map((part, idx) => {
                    const trimmed = part.trim();
                    const dotColor =
                      idx === 0
                        ? 'bg-rose-500'
                        : idx === 1
                        ? 'bg-blue-500'
                        : 'bg-emerald-500';
                    return (
                      <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap font-medium">
                        <span className={`size-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span>{trimmed}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Card 3: Interactive Detail Action Plans & Support Needed */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Daftar Detail Action Plan &amp; Support Needed
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                {filteredPlans.length} dari {actionPlans.length} item
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian komprehensif rencana aksi, destinasi FU, tenggat waktu, dan kebutuhan dukungan
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setPage(1);
              }}
              placeholder="Cari action plan, topik, UIC..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <Filter size={13} />
            Filter Status:
          </span>

          {['Semua', 'DONE', 'IN PROGRESS', 'BELUM FU'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}

          {/* Agenda dropdown filter */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={agendaFilter}
              onChange={(e) => {
                setAgendaFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              <option value="Semua">Semua Agenda</option>
              {uniqueAgendas.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>

            {/* UIC dropdown filter */}
            <select
              value={uicFilter}
              onChange={(e) => {
                setUicFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              <option value="Semua">Semua UIC</option>
              {uniqueUics.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Plans Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1180px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-left">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-3 w-36">Agenda &amp; Tgl</th>
                <th className="py-3.5 px-4 w-48">Main Topic</th>
                <th className="py-3.5 px-4 min-w-[240px]">Rencana Aksi (Action Plan)</th>
                <th className="py-3.5 px-3 w-36">UIC &rarr; Destinasi</th>
                <th className="py-3.5 px-4 min-w-[280px]">Support Needed</th>
                <th className="py-3.5 px-3 w-28 text-center">Deadline</th>
                <th className="py-3.5 px-3 w-28 text-center">Status</th>
                <th className="py-3.5 px-2 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada action plan yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-blue-50/30 transition-colors align-top"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs pt-3.5">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block text-xs leading-snug" title={item.agenda}>
                        {item.agenda}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {item.tgl}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 text-xs block leading-snug" title={item.mainTopic}>
                        {item.mainTopic}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 cursor-pointer group/cell"
                      onClick={() => handleOpenDetail(item)}
                      title="Klik untuk melihat & mengedit detail Action Plan"
                    >
                      <p className="text-slate-800 group-hover/cell:text-blue-700 font-medium leading-relaxed text-xs break-words transition-colors">
                        {item.actionPlan}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block">{item.uic}</span>
                        {item.destinasiFu && item.destinasiFu !== '-' && (
                          <span className="text-[11px] text-blue-600 font-medium block mt-1" title={item.destinasiFu}>
                            &rarr; {item.destinasiFu}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 min-w-[280px] cursor-pointer group/cell"
                      onClick={() => handleOpenDetail(item)}
                      title="Klik untuk melihat & mengedit detail Support Needed"
                    >
                      {item.supportNeeded && item.supportNeeded !== '-' ? (
                        <div
                          className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 text-rose-900 text-xs leading-relaxed whitespace-pre-line break-words font-medium shadow-2xs group-hover/cell:border-rose-400 group-hover/cell:bg-rose-50 transition-all"
                          title={item.supportNeeded}
                        >
                          {item.supportNeeded}
                        </div>
                      ) : (
                        <span className="text-slate-400 group-hover/cell:text-blue-600 text-xs italic block pt-1 transition-colors">
                          - <span className="text-[10px] text-slate-400 group-hover/cell:text-blue-600 font-normal">(Klik untuk tambah)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                        {item.deadline}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-2 text-center pt-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          title="Lihat detail lengkap notulen &amp; catatan"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          title="Edit Action Plan &amp; boxes secara langsung"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2">
            <span className="text-xs text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 6. Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-blue-50 text-[#1447B8] grid place-items-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Upload Report MoM &amp; Support</h3>
                  <p className="text-xs text-slate-500">Mendukung format CSV &amp; Excel (.xlsx, .xls)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadFiles([]);
                  setUploadError('');
                  setUploadSuccess('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {uploadError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold animate-[fadeIn_0.2s_ease-out]">
                  <Check size={16} className="text-emerald-600" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-7 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/30 transition-all group">
                <div className="size-12 rounded-2xl bg-blue-50 text-[#1447B8] grid place-items-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={22} />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  Klik untuk pilih file atau seret file ke sini
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Format yang didukung: .CSV, .XLSX, .XLS (Maks. 20MB)
                </span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      setUploadFiles(Array.from(e.target.files));
                      setUploadError('');
                    }
                  }}
                />
              </label>

              {uploadFiles.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck2 size={18} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {uploadFiles[0].name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(uploadFiles[0].size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFiles([])}
                    className="text-slate-400 hover:text-rose-500 text-xs p-1"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Format description guide */}
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info size={13} className="text-blue-600" />
                  Format Kolom yang Dibaca Otomatis:
                </p>
                <p className="text-slate-500 leading-relaxed font-mono text-[10.5px]">
                  NO, TGL, AGENDA, MAIN TOPIC, UNIT/TELDA, PESERTA, PEMBAHASAN, ACTION PLAN, UIC, DESTINASI FU, SUPPORT NEEDED, DEADLINE, STATUS, NOTES TO FOLLOW UP
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const parsed = parseSupportCSV(DEFAULT_SUPPORT_CSV);
                  setActionPlans(parsed);
                  setUploadSuccess('Berhasil memuat template contoh data MoM & Support Needed!');
                  setTimeout(() => {
                    setShowUpload(false);
                    setUploadSuccess('');
                  }, 1200);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                Gunakan Data Contoh
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setUploadFiles([]);
                    setUploadError('');
                    setUploadSuccess('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!uploadFiles.length || uploadLoading}
                  onClick={handleUploadSubmit}
                  className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition-all cursor-pointer shadow-md ${
                    uploadLoading
                      ? 'bg-blue-400 cursor-wait'
                      : uploadFiles.length
                      ? 'bg-[#1447B8] hover:bg-blue-700'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {uploadLoading ? 'Memproses File...' : 'Mulai Baca & Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Action Plan Detail Modal - All Boxes Directly Editable */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDetail();
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-[#0B1E48] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="size-9 rounded-xl bg-white/10 grid place-items-center font-black text-xs text-white shrink-0">
                  #{detailItem.no}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0 flex-1">
                  <div>
                    <label className="text-[10px] text-blue-200 block font-semibold mb-0.5">
                      AGENDA
                    </label>
                    <input
                      type="text"
                      value={editFormData.agenda || ''}
                      onChange={(e) => handleFieldChange('agenda', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white font-bold placeholder-white/50"
                      placeholder="Agenda Rapat"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-200 block font-semibold mb-0.5">
                      TANGGAL
                    </label>
                    <input
                      type="text"
                      value={editFormData.tgl || ''}
                      onChange={(e) => handleFieldChange('tgl', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white placeholder-white/50"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-200 block font-semibold mb-0.5">
                      UNIT / TELDA
                    </label>
                    <input
                      type="text"
                      value={editFormData.unitTelda || ''}
                      onChange={(e) => handleFieldChange('unitTelda', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white/15 text-white border border-white/20 focus:outline-none focus:border-white placeholder-white/50"
                      placeholder="Unit Telda"
                    />
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Simpan semua perubahan"
                >
                  <Check size={14} />
                  <span>Simpan</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body with All Boxes Directly Editable */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Notification Banner when saved */}
              {editSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between font-bold animate-[fadeIn_0.2s_ease-out]">
                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    {editSuccessMsg}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditSuccessMsg('')}
                    className="text-emerald-500 hover:text-emerald-700 cursor-pointer p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* 1. Main Topic & Status Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      TOPIK UTAMA
                    </label>
                    <input
                      type="text"
                      value={editFormData.mainTopic || ''}
                      onChange={(e) => handleFieldChange('mainTopic', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Judul topik utama notulen"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      STATUS AKSI
                    </label>
                    <select
                      value={editFormData.status || 'BELUM FU'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                    >
                      <option value="DONE">DONE (Selesai)</option>
                      <option value="IN PROGRESS">IN PROGRESS (Dalam Proses)</option>
                      <option value="NEED DISCUSS">NEED DISCUSS (Butuh Diskusi)</option>
                      <option value="BELUM FU">BELUM FU (Open)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Action Plan Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  RENCANA AKSI (ACTION PLAN)
                </label>
                <textarea
                  rows={4}
                  value={editFormData.actionPlan || ''}
                  onChange={(e) => handleFieldChange('actionPlan', e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-slate-900 font-medium leading-relaxed text-xs sm:text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Tuliskan butir rencana aksi..."
                />
              </div>

              {/* 3. Support Needed Callout Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1.5">
                  DUKUNGAN YANG DIBUTUHKAN (SUPPORT NEEDED)
                </label>
                <textarea
                  rows={3}
                  value={editFormData.supportNeeded === '-' ? '' : editFormData.supportNeeded || ''}
                  onChange={(e) => handleFieldChange('supportNeeded', e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 text-rose-900 font-medium leading-relaxed text-xs focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                  placeholder="Tuliskan kebutuhan dukungan atau eskalasi ke regional / unit lain (kosongkan jika tidak ada)..."
                />
              </div>

              {/* 4. UIC, Destinasi FU, Deadline Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  PIC &amp; TARGET FOLLOW UP
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      UIC (Penanggung Jawab)
                    </label>
                    <input
                      type="text"
                      value={editFormData.uic || ''}
                      onChange={(e) => handleFieldChange('uic', e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      placeholder="e.g. PRQ, BS"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Destinasi FU
                    </label>
                    <input
                      type="text"
                      value={editFormData.destinasiFu || ''}
                      onChange={(e) => handleFieldChange('destinasiFu', e.target.value)}
                      className="w-full text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      placeholder="e.g. BS, SSGS, TELDA"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Target Deadline
                    </label>
                    <input
                      type="text"
                      value={editFormData.deadline || ''}
                      onChange={(e) => handleFieldChange('deadline', e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-none"
                      placeholder="e.g. W3 Sep 2026"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Notes to Follow Up Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  CATATAN TINDAK LANJUT / NO. NOTA DINAS (NDE)
                </label>
                <textarea
                  rows={3}
                  value={editFormData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Nomor NDE, tanggal pengajuan, catatan tindak lanjut..."
                />
              </div>

              {/* 6. Full Pembahasan & Notulen Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  POIN PEMBAHASAN LENGKAP
                </label>
                <textarea
                  rows={6}
                  value={editFormData.pembahasan || ''}
                  onChange={(e) => handleFieldChange('pembahasan', e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] leading-relaxed focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Poin pembahasan atau notulen rapat secara lengkap..."
                />
              </div>

              {/* 7. Peserta Rapat Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <label className="font-bold text-slate-700 text-[11px] block mb-1">
                  Daftar Peserta Rapat
                </label>
                <input
                  type="text"
                  value={editFormData.peserta || ''}
                  onChange={(e) => handleFieldChange('peserta', e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                  placeholder="Misal: GM WITEL, PRQ (3), SSGS (3), BS (3)..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info size={13} className="text-blue-600 shrink-0" />
                <span>
                  Semua box dapat diedit langsung. Klik <strong className="text-slate-700 font-semibold">&quot;Simpan Perubahan&quot;</strong> setelah selesai.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
