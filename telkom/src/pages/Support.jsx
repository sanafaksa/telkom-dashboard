import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { can } from '../features/auth/auth';
import {
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Plus,
  Trash2
} from 'lucide-react';
import {
  loadSavedSupportData,
  saveSupportData,
  parseSupportCSV,
  parseSupportExcel,
  listSupportExcelSheets,
  computeSupportMetrics,
  normalizeStatus,
  fetchSupportFromApi,
  fetchSupportResult,
  syncSupportToApi,
  updateSupportItemApi,
  createSupportBatchApi,
  deleteSupportItemApi,
  exportSupportExcel,
  SUPPORT_CHANGED_EVENT
} from '../data/supportParser';
import NotulensiSection from '../components/NotulensiSection';
import {
  renderAgendaTableToBlob,
  renderDetailTableToBlob,
  renderFullSupportPageToBlob
} from '../data/supportImageRenderer';
import { exportCSV, ShareDropdown } from '../components/ui';
import SupportFormModal, { AGENDA_OPTIONS, UNIT_OPTIONS } from '../components/SupportFormModal';
import { RichText, RichTextarea } from '../components/RichText';
import { DESTINASI_OPTIONS, DeadlineInput, StatusSelect, UicMultiSelect } from '../components/FormFields';
import { clearDraft, loadDraft, saveDraft, useOpenDraftIntent } from '../lib/draft';
import { isSameValues } from '../lib/useDraftForm';
import UnsavedChangesBar from '../components/UnsavedChangesBar';
import { createPortal } from "react-dom";

// Pilihan filter UIC (urutan sesuai dropdown dashboard)
const UIC_FILTER_OPTIONS = [
  { value: 'Semua', label: 'All UIC' },
  { value: 'WITEL', label: 'All Witel' },
  ...['BPPLP', 'ED', 'EVP', 'RLEGS', 'RSMES', 'RSMES & RLEGS', 'RSO', 'RSO 1', 'RSO 2', 'RWS', 'SSGS'].map(
    (v) => ({ value: v, label: v })
  )
];

// Unit Witel yang masuk kategori "All Witel"
const WITEL_UIC = ['PRQ', 'BS', 'GS', 'SSGS', 'LESA V'];

// Samakan penulisan UIC: "RSO - PO" -> "RSO", "BPPLP - LEGAL" -> "BPPLP", "RSMESS" -> "RSMES"
const normalizeUicToken = (t) =>
  t.trim().toUpperCase().replace(/\s+-\s+.*$/, '').replace(/^RSMESS$/, 'RSMES');

const matchUicFilter = (uicText, filter) => {
  if (filter === 'Semua') return true;
  const tokens = String(uicText || '')
    .split(',')
    .map(normalizeUicToken)
    .filter(Boolean);
  const has = (v) => tokens.includes(v);

  if (filter === 'WITEL') {
    return tokens.some(
      (t) => WITEL_UIC.includes(t) || t.startsWith('TELDA') || t === 'ALL TELDA' || t === 'GM WITEL'
    );
  }
  if (filter === 'RSMES & RLEGS') return has('RSMES') && has('RLEGS');
  return has(filter);
};

// Kunci draft popup action plan (satu draft per butir)
const draftKeyOf = (item) => `mom-action:${item.id ?? item.actionPlan}`;

export default function Support() {
  // Hanya menyembunyikan tombol; endpoint tulis tetap dijaga permission mom.manage di backend.
  const canManage = can('mom.manage');
  // Action plans data state (loaded from LocalStorage or default CSV, then synced with MySQL)
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
  const [pageSize, setPageSize] = useState(10);

  // Tautan dari Dashboard & pencarian global: ?uic= ?q= ?status= mengatur filter tabel,
  // dan #support-agenda-card / #support-detail-card menggulir ke bagian yang dituju.
  const location = useLocation();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const uicParam = searchParams.get('uic');
    const qParam = searchParams.get('q');
    const statusParam = searchParams.get('status');
    if (uicParam === null && qParam === null && statusParam === null) return;
    setUicFilter(UIC_FILTER_OPTIONS.some((o) => o.value === uicParam) ? uicParam : 'Semua');
    setSearchQ(qParam ?? '');
    setStatusFilter(['DONE', 'IN PROGRESS', 'BELUM FU'].includes(statusParam) ? statusParam : 'Semua');
    setAgendaFilter('Semua');
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.scrollMarginTop = '96px';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Modals state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [excelSheets, setExcelSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [uploadMode, setUploadMode] = useState('replace');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Detail Modal & Direct All-Boxes Edit State
  const [detailItem, setDetailItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [detailRestored, setDetailRestored] = useState(false);
  const [detailConfirm, setDetailConfirm] = useState(false);

  // Form tambah data manual
  const [showCreate, setShowCreate] = useState(false);
  const [createPrefill, setCreatePrefill] = useState(null);
  useOpenDraftIntent('mom-support-form', () => setShowCreate(true));

  // Load latest data from MySQL Backend on mount
  useEffect(() => {
    let active = true;
    fetchSupportFromApi().then((dbItems) => {
      // Hasil [] dari database juga ditampilkan (kosong), agar sama dengan isi tabel
      if (active && Array.isArray(dbItems)) {
        setActionPlans(dbItems);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Perubahan dari section Notulensi (edit, deadline, centang) langsung terlihat di tabel ini
  useEffect(() => {
    let active = true;
    const reload = () => {
      fetchSupportFromApi().then((dbItems) => {
        if (active && Array.isArray(dbItems) && !detailOpenRef.current) setActionPlans(dbItems);
      });
    };
    window.addEventListener(SUPPORT_CHANGED_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(SUPPORT_CHANGED_EVENT, reload);
    };
  }, []);

  // Sinkronisasi: ambil data terbaru dari database berkala & saat tab dibuka lagi,
  // supaya perubahan notulen/action plan dari user lain langsung terlihat.
  // Ditunda saat popup detail terbuka agar isian yang sedang diedit tidak tertimpa.
  const detailOpenRef = useRef(false);
  detailOpenRef.current = !!detailItem;
  useEffect(() => {
    const refresh = () => {
      if (detailOpenRef.current || document.hidden) return;
      fetchSupportFromApi().then((dbItems) => {
        if (Array.isArray(dbItems) && !detailOpenRef.current) {
          setActionPlans(dbItems);
        }
      });
    };
    const timer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Recalculate metrics & persist whenever actionPlans change
  useEffect(() => {
    const computed = computeSupportMetrics(actionPlans);
    setMetrics(computed);
    saveSupportData(actionPlans);
  }, [actionPlans]);

  // Open detail modal with all boxes directly editable
  const handleOpenDetail = (item) => {
    // Draft yang belum disimpan dari sesi sebelumnya dipulihkan
    const draft = loadDraft(draftKeyOf(item));
    const restored = !!draft?.value && !isSameValues(draft.value, item);
    setDetailItem(item);
    setEditFormData(restored ? { ...item, ...draft.value } : { ...item });
    setDetailRestored(restored);
    setDetailConfirm(false);
    setEditSuccessMsg('');
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setDetailItem(null);
    setEditFormData({});
    setEditSuccessMsg('');
    setDetailRestored(false);
    setDetailConfirm(false);
  };

  // Ada perubahan yang belum disimpan ke database = tutup popup harus dikonfirmasi
  const detailDirty = !!detailItem && !isSameValues(editFormData, detailItem);

  const requestCloseDetail = () => {
    if (detailDirty) setDetailConfirm(true);
    else handleCloseDetail();
  };

  const discardDetailDraft = () => {
    clearDraft(draftKeyOf(detailItem));
    setEditFormData({ ...detailItem });
    setDetailRestored(false);
    setDetailConfirm(false);
  };

  const discardAndClose = () => {
    clearDraft(draftKeyOf(detailItem));
    handleCloseDetail();
  };

  // Autosave: perubahan popup disimpan sebagai draft di browser (400 ms setelah berubah).
  // Kalau sudah sama dengan database, draft dihapus.
  useEffect(() => {
    if (!detailItem) return undefined;
    const key = draftKeyOf(detailItem);
    const t = setTimeout(() => {
      if (isSameValues(editFormData, detailItem)) clearDraft(key);
      else saveDraft(key, editFormData);
    }, 400);
    return () => clearTimeout(t);
  }, [editFormData, detailItem]);

  // Update field in edit form
  const handleFieldChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Simpan perubahan ke database dulu. Tampilan baru diperbarui setelah database berhasil,
  // jadi tidak ada perubahan yang hanya hidup di browser. Mengembalikan true bila tersimpan.
  const handleSaveAll = async () => {
    if (!detailItem) return false;

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

    let saved;
    try {
      saved = await updateSupportItemApi(updatedData);
    } catch (err) {
      alert(`Perubahan belum tersimpan ke database. Coba simpan lagi.\n${err.message}`);
      return false;
    }

    const serverItem = saved?.item ?? updatedData;
    setActionPlans((prev) =>
      prev.map((item) => {
        const isMatch =
          (item.id !== undefined && item.id === detailItem.id) ||
          (item.no === detailItem.no && item.actionPlan === detailItem.actionPlan);
        return isMatch ? serverItem : item;
      })
    );

    clearDraft(draftKeyOf(detailItem));
    setDetailItem(null);
    setEditFormData({});
    setDetailRestored(false);
    setDetailConfirm(false);
    return true;
  };

  // Tambah rapat + banyak butir action plan: simpan ke MySQL dengan NO rapat yang sama, lalu tampilkan di daftar
  const handleCreateItem = async ({ meeting, items }) => {
    const { items: created } = await createSupportBatchApi({ ...meeting, items });
    setActionPlans((prev) => [...prev, ...created]);
    setSearchQ('');
    setStatusFilter('Semua');
    setAgendaFilter('Semua');
    setUicFilter('Semua');
    setPage(Math.ceil((actionPlans.length + created.length) / pageSize));
    setShowCreate(false);
    setCreatePrefill(null);
  };

  // Enter di Action Plan saat edit: simpan perubahan, lalu buka form tambah action plan untuk rapat yang sama
  const openAddActionFromEdit = async () => {
    const src = { ...detailItem, ...editFormData };
    const m = String(src.tgl || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const tglIso = m ? `${m[3]}-${m[2]}-${m[1]}` : new Date().toISOString().slice(0, 10);
    const units = String(src.unitTelda || '')
      .split(',')
      .map((u) => u.trim())
      .filter((u) => UNIT_OPTIONS.includes(u));
    // Form tambah hanya dibuka kalau perubahan rapat ini sudah tersimpan di database
    if (!(await handleSaveAll())) return;
    setCreatePrefill({
      no: String(src.no ?? ''),
      meta: {
        tglIso,
        agenda: src.agenda || '',
        mainTopic: src.mainTopic || '',
        units,
        peserta: src.peserta || '',
        pembahasan: src.pembahasan || src.pembahasanNotulen || ''
      }
    });
    setShowCreate(true);
  };

  // Hapus butir. Butir yang belum punya id dari database (mis. data lokal) hanya dihapus dari browser.
  const handleDeleteItem = async (item) => {
    if (!item) return;
    if (!confirm(`Hapus butir action plan ini?\n\n"${item.actionPlan || item.mainTopic || '-'}"`)) return;

    const isDbItem = typeof item.id === 'number';
    if (isDbItem) {
      try {
        await deleteSupportItemApi(item.id);
      } catch (err) {
        alert(`Gagal menghapus dari database.\n${err.message}`);
        return;
      }
    }

    setActionPlans((prev) =>
      prev.filter((x) => (isDbItem ? x.id !== item.id : x !== item))
    );
    if (detailItem && (detailItem.id === item.id)) {
      handleCloseDetail();
    }
  };

  useEffect(() => {
  if (!detailItem) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, [detailItem]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && detailItem) {
        requestCloseDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailItem, detailDirty]);

  // Filtered action plan items
  const filteredPlans = useMemo(() => {
    return actionPlans.filter((item) => {
      const matchStatus =
        statusFilter === 'Semua' ||
        item.status === statusFilter;

      const matchAgenda =
        agendaFilter === 'Semua' || item.agenda === agendaFilter;

      const matchUic = matchUicFilter(item.uic, uicFilter);

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

  // Saran NO rapat untuk form tambah: nomor rapat terbesar + 1
  const nextMeetingNo = useMemo(() => {
    const nums = actionPlans
      .map((x) => String(x.no ?? '').trim())
      .filter((n) => /^\d+$/.test(n))
      .map(Number);
    return String((nums.length ? Math.max(...nums) : 0) + 1);
  }, [actionPlans]);

  // Halaman tidak boleh melebihi jumlah halaman setelah item dihapus
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, page]);

  // Handle file selection and inspect Excel sheets if applicable
  const handleFileSelect = async (files) => {
    const fileList = Array.from(files);
    setUploadFiles(fileList);
    setUploadError('');
    setExcelSheets([]);
    setSelectedSheet('');

    if (fileList.length > 0) {
      const f = fileList[0];
      const lower = f.name.toLowerCase();
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        try {
          const info = await listSupportExcelSheets(f);
          setExcelSheets(info.sheetNames || []);
          setSelectedSheet(info.defaultSheet || info.sheetNames?.[0] || '');
        } catch {
          // Ignore sheet inspection error; will be handled on submit
        }
      }
    }
  };

  // Handle file upload (CSV or XLSX) + Sync to MySQL Database
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
        parsed = await parseSupportExcel(file, selectedSheet);
      } else {
        throw new Error('Format file tidak didukung. Harap unggah file .csv atau .xlsx / .xls');
      }

      if (!parsed || parsed.length === 0) {
        throw new Error('File/Sheet tidak memiliki baris action plan yang dapat dibaca. Pastikan memilih sheet yang berisi data notulensi atau tracker.');
      }

      // Sync ke database. Gagal = error ditampilkan di modal, tanpa mengubah tabel.
      const syncRes = await syncSupportToApi(
        parsed,
        file.name,
        selectedSheet || 'Notulensi Tracker',
        uploadMode
      );

      // Tabel langsung menampilkan isi database terbaru. Filter & halaman di-reset supaya data baru terlihat.
      setActionPlans(syncRes.items);
      setSearchQ('');
      setStatusFilter('Semua');
      setAgendaFilter('Semua');
      setUicFilter('Semua');
      setPage(1);
      setUploadSuccess(
        `Berhasil menyinkronkan ${syncRes.row_count ?? parsed.length} butir Action Plan dari "${file.name}" ke database.`
      );

      setTimeout(() => {
        setShowUpload(false);
        setUploadSuccess('');
        setUploadFiles([]);
        setExcelSheets([]);
      }, 1500);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Gagal memproses file spreadsheet');
    } finally {
      setUploadLoading(false);
    }
  };

  // Muat ulang tabel dari MySQL untuk melihat perubahan terakhir (termasuk dari pengguna lain)
  const [refreshing, setRefreshing] = useState(false);
  const refreshTable = async () => {
    setRefreshing(true);
    try {
      const result = await fetchSupportResult();
      if (result.ok) {
        setActionPlans(result.items);
      } else if (result.reason === 'network') {
        alert('Gagal memuat ulang data.\nTidak bisa terhubung ke server. Periksa koneksi atau pastikan backend berjalan.');
      } else if (result.reason === 'http') {
        alert(`Gagal memuat ulang data.\nServer menolak permintaan (kode ${result.status}).`);
      } else if (result.reason === 'format') {
        alert('Gagal memuat ulang data.\nRespons server tidak sesuai. Coba lagi beberapa saat.');
      }
      // reason 'session': overlay "Sesi berakhir" sudah tampil, tidak perlu alert
    } finally {
      setRefreshing(false);
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export data as clean CSV (with sep=, for Excel)
  const handleExportCSV = () => {
    setShowExportMenu(false);
    const exportData = actionPlans.map((r, i) => ({
      'NO': i + 1,
      'NO RAPAT': r.no || i + 1,
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

  // Export data as neatly formatted Excel (.xlsx) with wide columns + summary sheet
  const handleExportExcel = () => {
    setShowExportMenu(false);
    exportSupportExcel(
      actionPlans,
      metrics,
      `Report_Support_Needed_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            DONE
          </span>
        );
      case 'IN PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            IN PROGRESS
          </span>
        );
      case 'NEED DISCUSS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
            NEED DISCUSS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
            BELUM FU
          </span>
        );
    }
  };

  // Fokus ke section Notulensi Rapat (filter agenda/status atau satu notulensi), lalu gulir ke sana
  const [notulensiFocus, setNotulensiFocus] = useState(null);
  const focusNotulensi = (focus) => {
    setNotulensiFocus({ ...focus, nonce: Date.now() });
    document.getElementById('notulensi-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Popup daftar action plan per agenda & status (klik angka di laporan)
  const [drill, setDrill] = useState(null); // { agenda, status }
  const drillItems = useMemo(
    () => (drill ? actionPlans.filter((i) => i.agenda === drill.agenda && i.status === drill.status) : []),
    [drill, actionPlans]
  );

  const countBtn = (agenda, status, val, isRed = false) => {
    if (val === 0) return renderVal(0);
    return (
      <button
        type="button"
        onClick={() => setDrill({ agenda, status })}
        title={`Lihat ${status} di ${agenda}`}
        className="hover:underline underline-offset-2 cursor-pointer"
      >
        {renderVal(val, isRed)}
      </button>
    );
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
          {/* Tambah Data Manual */}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            hidden={!canManage}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>Tambah Data</span>
          </button>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            hidden={!canManage}
            className="flex items-center gap-2 bg-gradient-to-r from-[#1447B8] to-[#2563EB] hover:from-[#0E3A9E] hover:to-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
          >
            <Upload size={14} />
            <span>Upload CSV / Excel</span>
          </button>

          {/* Export Button with Excel (.xlsx) & CSV options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Download size={14} className="text-slate-500" />
              <span>Export CSV / Excel</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 animate-[fadeIn_0.15s_ease-out]">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 text-left text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Export Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Kolom rapi + Sheet Rekap</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 text-left text-xs font-semibold text-slate-700 cursor-pointer border-t border-slate-100"
                >
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">Export CSV (.csv)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Format koma terpisah otomatis</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={refreshTable}
            disabled={refreshing}
            title="Refresh tabel MoM untuk melihat perubahan terakhir"
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-semibold p-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Full Page & Table Specific Share / Copy as Picture */}
          <ShareDropdown
            buttonLabel="Salin &amp; Bagikan"
            captureSelector="#support-detail-card"
            pictureTargets={[
              {
                id: 'detail_table',
                title: 'Copy Gambar Tabel Detail',
                subtitle: 'Tabel Daftar Detail Action Plan (Utuh & Rapi)',
                selector: '#support-detail-card',
                label: 'Tabel Detail Action Plan',
                bg: '#FFFFFF',
                renderBlob: () => renderDetailTableToBlob(filteredPlans, actionPlans.length)
              },
              {
                id: 'agenda_table',
                title: 'Copy Gambar Tabel Agenda',
                subtitle: 'Tabel Report Follow Up By Agenda (Rapi)',
                selector: '#support-agenda-card',
                label: 'Tabel Rekap Agenda',
                bg: '#FFFFFF',
                renderBlob: () => renderAgendaTableToBlob(metrics)
              },
              {
                id: 'full_page',
                title: 'Copy as Picture (Full Page)',
                subtitle: 'Seluruh laporan MoM & Support Needed',
                selector: '#support-main-content',
                label: 'Seluruh Halaman MoM',
                bg: '#F6F8FC',
                renderBlob: () => renderFullSupportPageToBlob(metrics, filteredPlans, actionPlans.length)
              }
            ]}
          />
        </div>
      </header>

      {/* 2. Card 1: Report Follow Up Support Needed — By Agenda */}
      <section id="support-agenda-card" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
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
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full min-w-[960px] border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-white">
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
                    <button
                      type="button"
                      onClick={() => focusNotulensi({ agenda: r.name })}
                      title="Lihat notulensi agenda ini"
                      className="text-left hover:text-blue-700 hover:underline underline-offset-2 cursor-pointer"
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center bg-red-50/20">
                    {countBtn(r.name, 'BELUM FU', r.open, true)}
                  </td>
                  <td className="py-3 px-3 text-center bg-red-50/20">
                    {renderPct(r.pctOpen, true)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {countBtn(r.name, 'NEED DISCUSS', r.discuss)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderPct(r.pctDiscuss)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {countBtn(r.name, 'IN PROGRESS', r.progress)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderPct(r.pctProgress)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {countBtn(r.name, 'DONE', r.done)}
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
              className="rounded-2xl p-5 bg-white shadow-2xs flex flex-col justify-between border border-slate-200"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {u.category}
                </p>
                <h4 className="font-bold text-slate-900 text-sm mt-1 mb-4">
                  {u.name}
                </h4>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className="text-3xl font-black leading-none text-slate-900">
                    {u.count}
                  </span>
                  <span className="block text-xs font-bold mt-1 text-slate-900">
                    Action Item
                  </span>
                </div>
                <div
                  className="text-[11px] font-medium px-2.5 py-2 rounded-xl border flex flex-col gap-1 leading-tight shrink-0 bg-slate-50 text-slate-600 border-slate-100"
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
      <NotulensiSection focus={notulensiFocus} />

      <section id="support-detail-card" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
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
              {AGENDA_OPTIONS.map((ag) => (
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
              {UIC_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Plans Table */}
        <div className="overflow-auto max-h-[70vh] rounded-xl border border-slate-200">
          <table className="w-full min-w-[1420px] border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-left">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-3 w-38 whitespace-nowrap">Agenda &amp; Tgl</th>
                <th className="py-3.5 px-4 w-48">Main Topic</th>
                <th className="py-3.5 px-4 min-w-[260px]">Rencana Aksi (Action Plan)</th>
                <th className="py-3.5 px-3 w-42 whitespace-nowrap">UIC &rarr; Destinasi</th>
                <th className="py-3.5 px-4 min-w-[260px]">Support Needed</th>
                <th className="py-3.5 px-4 min-w-[260px]">Notulensi (Pembahasan)</th>
                <th className="py-3.5 px-3 w-28 text-center whitespace-nowrap">Deadline</th>
                <th className="py-3.5 px-3 w-32 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-2 w-24 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
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
                      <div className="text-slate-800 group-hover/cell:text-blue-700 font-medium leading-relaxed text-xs break-words transition-colors">
                        <RichText text={item.actionPlan} />
                      </div>
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
                    <td
                      className="py-3 px-4 cursor-pointer group/cell"
                      onClick={() => handleOpenDetail(item)}
                      title="Klik untuk melihat & mengedit notulensi"
                    >
                      {item.pembahasanNotulen && item.pembahasanNotulen.trim() ? (
                        <div
                          className="text-slate-700 group-hover/cell:text-blue-700 text-xs leading-relaxed whitespace-pre-line break-words line-clamp-4 transition-colors"
                        >
                          {item.pembahasanNotulen}
                        </div>
                      ) : (
                        <span className="text-slate-400 group-hover/cell:text-blue-600 text-xs italic block pt-1 transition-colors">
                          - <span className="text-[10px] font-normal">(Klik untuk tambah)</span>
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
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
            hidden={!canManage}
                          title="Hapus butir ini"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (gaya sama dengan footer EDK Monitoring) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Menampilkan{' '}
            <span className="font-bold text-slate-800">
              {filteredPlans.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredPlans.length)}
            </span>{' '}
            dari <span className="font-bold text-slate-800">{filteredPlans.length}</span> data
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Jumlah data per halaman"
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
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
                className="size-8 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-semibold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Halaman berikutnya"
                className="size-8 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Upload Modal */}
      {showUpload && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
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
                      handleFileSelect(e.target.files);
                    }
                  }}
                />
              </label>

              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
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
                      onClick={() => {
                        setUploadFiles([]);
                        setExcelSheets([]);
                        setSelectedSheet('');
                      }}
                      className="text-slate-400 hover:text-rose-500 text-xs p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Sheet & Sync Mode selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {excelSheets.length > 0 && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Pilih Sheet Excel
                        </label>
                        <select
                          value={selectedSheet}
                          onChange={(e) => setSelectedSheet(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                        >
                          {excelSheets.map((sh) => (
                            <option key={sh} value={sh}>
                              {sh}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={excelSheets.length > 0 ? '' : 'sm:col-span-2'}>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Mode Sinkronisasi Database
                      </label>
                      <select
                        value={uploadMode}
                        onChange={(e) => setUploadMode(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                      >
                        <option value="replace">Ganti Semua Data (Replace)</option>
                        <option value="append">Tambahkan ke Data Saat Ini (Append)</option>
                      </select>
                    </div>
                  </div>
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
              <a
                href="/template-mom.xlsx"
                download="Template MoM & Support Needed.xlsx"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                <Download size={14} />
                Download Template MoM
              </a>

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
        </div>,
        document.body
      )}

      {/* 7. Action Plan Detail Modal - All Boxes Directly Editable */}
      {detailItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) requestCloseDetail();
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-[fadeIn_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-slate-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="size-9 rounded-xl bg-blue-50 grid place-items-center font-black text-xs text-[#1447B8] shrink-0">
                  #{detailItem.no}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0 flex-1">
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold mb-0.5">
                      AGENDA
                    </label>
                    <input
                      type="text"
                      value={editFormData.agenda || ''}
                      onChange={(e) => handleFieldChange('agenda', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-500 font-bold placeholder-slate-400"
                      placeholder="Agenda Rapat"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold mb-0.5">
                      TANGGAL
                    </label>
                    <input
                      type="text"
                      value={editFormData.tgl || ''}
                      onChange={(e) => handleFieldChange('tgl', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-500 placeholder-slate-400"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold mb-0.5">
                      UNIT / TELDA
                    </label>
                    <input
                      type="text"
                      value={editFormData.unitTelda || ''}
                      onChange={(e) => handleFieldChange('unitTelda', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-500 placeholder-slate-400"
                      placeholder="Unit Telda"
                    />
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={requestCloseDetail}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
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
                    <StatusSelect
                      value={editFormData.status || 'BELUM FU'}
                      onChange={(v) => handleFieldChange('status', v)}
                      options={[
                        { value: 'DONE', label: 'DONE (Selesai)' },
                        { value: 'IN PROGRESS', label: 'IN PROGRESS (Dalam Proses)' },
                        { value: 'NEED DISCUSS', label: 'NEED DISCUSS (Butuh Diskusi)' },
                        { value: 'BELUM FU', label: 'BELUM FU (Open)' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Action Plan Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  RENCANA AKSI (ACTION PLAN)
                </label>
                <RichTextarea
                  rows={4}
                  value={editFormData.actionPlan || ''}
                  onChange={(e) => handleFieldChange('actionPlan', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    if (!String(editFormData.actionPlan || '').trim()) return;
                    openAddActionFromEdit();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-slate-900 font-medium leading-relaxed text-xs sm:text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Tuliskan butir rencana aksi..."
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Tips: tekan <kbd className="px-1 rounded bg-slate-100 border border-slate-300 font-mono">Enter</kbd> untuk
                  simpan dan menambah action plan baru di rapat ini, atau{' '}
                  <kbd className="px-1 rounded bg-slate-100 border border-slate-300 font-mono">Shift+Enter</kbd> untuk baris baru.
                </p>
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
                    <UicMultiSelect
                      value={editFormData.uic || ''}
                      onChange={(v) => handleFieldChange('uic', v)}
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Destinasi FU
                    </label>
                    <UicMultiSelect
                      value={editFormData.destinasiFu || ''}
                      onChange={(v) => handleFieldChange('destinasiFu', v)}
                      options={DESTINASI_OPTIONS}
                      placeholder="Pilih destinasi FU"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Target Deadline
                    </label>
                    <DeadlineInput
                      value={editFormData.deadline || ''}
                      onChange={(v) => handleFieldChange('deadline', v)}
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

              {/* 6b. Pembahasan (Notulen) — kolom terpisah di Notulensi Tracker */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  PEMBAHASAN (NOTULEN)
                </label>
                <textarea
                  rows={4}
                  value={editFormData.pembahasanNotulen || ''}
                  onChange={(e) => handleFieldChange('pembahasanNotulen', e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] leading-relaxed focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Notulen rapat (kolom PEMBAHASAN (NOTULEN))..."
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

            {/* Banner draft yang dipulihkan dari browser */}
            {detailRestored && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-blue-50 border-t border-blue-100 text-xs text-blue-900">
                <span>Draft yang belum disimpan dari browser ini dipulihkan.</span>
                <button type="button" onClick={discardDetailDraft} className="font-semibold text-rose-600 hover:underline cursor-pointer">
                  Buang draft
                </button>
              </div>
            )}

            {/* Konfirmasi saat akan keluar padahal belum disimpan */}
            {detailConfirm && (
              <UnsavedChangesBar onStay={() => setDetailConfirm(false)} onSave={handleSaveAll} onDiscard={discardAndClose} />
            )}

            {/* Modal Footer: info di atas, tombol aksi di bawah (Hapus kiri, Batal & Simpan kanan) */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Info size={13} className="text-blue-600 shrink-0" />
                  Semua box dapat diedit langsung. Klik <strong className="text-slate-700 font-semibold">&quot;Simpan Perubahan&quot;</strong> setelah selesai.
                </span>
                {detailDirty && (
                  <span className="font-semibold text-amber-700">Belum disimpan ke database · draft tersimpan otomatis</span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(detailItem)}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Hapus
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={requestCloseDetail}
                    className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
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
        </div>,
        document.body
      )}

      {/* Popup detail: daftar action plan per agenda & status, lengkap dengan isinya */}
      {drill && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrill(null);
          }}
        >
          <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {drill.status} · {drill.agenda}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{drillItems.length} action plan</p>
              </div>
              <button type="button" onClick={() => setDrill(null)} title="Tutup" className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {drillItems.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-400">Tidak ada action plan dengan status ini.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-2.5 px-3 font-bold">NO</th>
                      <th className="py-2.5 px-3 font-bold">Tgl</th>
                      <th className="py-2.5 px-3 font-bold">Main topic</th>
                      <th className="py-2.5 px-3 font-bold">Action plan</th>
                      <th className="py-2.5 px-3 font-bold">UIC → Destinasi</th>
                      <th className="py-2.5 px-3 font-bold">Deadline</th>
                      <th className="py-2.5 px-3 font-bold">Support needed</th>
                      <th className="py-2.5 px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drillItems.map((item) => (
                      <tr key={item.id} className="align-top hover:bg-blue-50/30">
                        <td className="py-2.5 px-3 font-bold text-slate-700">{item.no}</td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.tgl}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-semibold">{item.mainTopic}</td>
                        <td className="py-2.5 px-3 text-slate-800 whitespace-pre-line">{item.actionPlan}</td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {item.uic}
                          {item.destinasiFu && item.destinasiFu !== '-' && <span className="block text-blue-600">→ {item.destinasiFu}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.deadline}</td>
                        <td className="py-2.5 px-3 text-rose-900 whitespace-pre-line">{item.supportNeeded !== '-' ? item.supportNeeded : '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setDrill(null);
                              focusNotulensi({ meetingId: item.meetingId, agenda: item.agenda });
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
                          >
                            Buka notulensi
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => {
                  setDrill(null);
                  focusNotulensi({ agenda: drill.agenda, status: drill.status });
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Lihat semua di Notulensi Rapat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 8. Tambah Data Manual */}
      {showCreate && (
        <SupportFormModal
          onClose={() => {
            setShowCreate(false);
            setCreatePrefill(null);
          }}
          onSave={handleCreateItem}
          nextNo={nextMeetingNo}
          prefill={createPrefill}
        />
      )}
    </div>
  );
}
