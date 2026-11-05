import {useState, useEffect, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Search,
  ChevronDown,
  CalendarDays,
  FileText,
  ArrowDown,
  ArrowRight,
  Check
} from 'lucide-react';
import {flow, witel, uic, activity} from '../data/dashboardData';
import {exportCSV, ShareDropdown} from '../components/ui';
import {loadSavedSupportData, fetchSupportFromApi, normalizeStatus} from '../data/supportParser';

const PAGE_SIZE = 6;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const STATUS_OPTIONS = ['BELUM FU', 'NEED DISCUSS', 'IN PROGRESS', 'DONE'];
const STATUS_PROGRESS = {'BELUM FU': 0, 'NEED DISCUSS': 25, 'IN PROGRESS': 50, DONE: 100};
const STATUS_BADGE = {
  'BELUM FU': 'bg-red-50 text-red-600',
  'NEED DISCUSS': 'bg-amber-50 text-amber-700',
  'IN PROGRESS': 'bg-blue-50 text-[#2563EB]',
  DONE: 'bg-emerald-50 text-emerald-700'
};

// "11/09/2026" (DD/MM/YYYY dari Notulensi) -> Date; null kalau format tidak dikenali
function parseTgl(tgl) {
  const m = String(tgl || '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toActivityRow(item) {
  const status = normalizeStatus(item.status);
  const date = parseTgl(item.tgl);
  return {
    id: item.id,
    agenda: item.agenda || '-',
    topic: item.mainTopic || '',
    unit: item.unitTelda || '-',
    date,
    dateLabel: date ? `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}` : item.tgl || '-',
    catatan: item.actionPlan || item.notes || '-',
    uic: item.uic || '-',
    status,
    progress: STATUS_PROGRESS[status] ?? 0
  };
}

function pageWindow(page, totalPages) {
  if (totalPages <= 5) return Array.from({length: totalPages}, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  return [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [st, setSt] = useState('Semua');
  const [page, setPage] = useState(1);

  // Sumber data sama dengan menu MoM Support: cache localStorage dulu, lalu MySQL via /api/mom-support
  const [momItems, setMomItems] = useState(() => loadSavedSupportData());
  useEffect(() => {
    let active = true;
    fetchSupportFromApi().then(dbItems => {
      if (active && Array.isArray(dbItems)) setMomItems(dbItems);
    });
    return () => {
      active = false;
    };
  }, []);

  // Terbaru dulu: urut tanggal rapat desc, lalu id desc
  const rows = useMemo(
    () =>
      momItems.map(toActivityRow).sort((a, b) => {
        const diff = (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);
        return diff || (Number(b.id) || 0) - (Number(a.id) || 0);
      }),
    [momItems]
  );

  const filtered = rows.filter(r => {
    const matchStatus = st === 'Semua' || r.status === st;
    const matchQuery = [r.agenda, r.topic, r.catatan, r.unit, r.uic]
      .join(' ')
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchStatus && matchQuery;
  });

  useEffect(() => setPage(1), [q, st]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstShown = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 tracking-tight">
            Executive Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan real-time tindak lanjut agenda dan performa operasional Regional 3
          </p>
        </div>

        {/* Tombol aksi tidak ikut difoto saat Copy as Picture */}
        <div data-html2canvas-ignore="true" className="flex items-center gap-2.5 flex-wrap">
          <ShareDropdown buttonLabel="Salin & Bagikan" />
          <button
            onClick={() => exportCSV(activity, 'executive_summary_regional_3')}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <FileText size={15} className="text-slate-500" />
            <span>Lihat Summary Laporan</span>
          </button>

          <button
            onClick={() => alert('Jadwal meeting operasional Regional 3 telah terupdate.')}
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <CalendarDays size={15} />
            <span>Buka Detail Meeting</span>
          </button>
        </div>
      </div>

      {/* Hierarki Eksekusi Agenda & Follow Up */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#EF4444]" />
            <h2 className="font-bold text-slate-900 text-sm">
              Hierarki Eksekusi Agenda & Follow Up
            </h2>
            <span className="bg-blue-50 text-[#2563EB] text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
              EXECUTIVE TREE FLOW
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#10B981]" />
              <span>Tuntas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#EF4444]" />
              <span>Not Yet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#2563EB]" />
              <span>In-Progress</span>
            </div>
          </div>
        </div>

        {/* Tree flow content */}
        <div className="grid lg:grid-cols-[380px_100px_1fr] items-center gap-0">
          {/* Root Card (Left) */}
          <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <span className="inline-block bg-red-50 text-red-500 font-bold text-[10px] px-2.5 py-0.5 rounded tracking-wider mb-3">
              ROOT / TOTAL AGENDA
            </span>

            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {flow.total}
              </span>
              <span className="text-sm font-bold text-slate-800">Agenda Aktif</span>
            </div>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Seluruh komitmen tindak lanjut meeting operasional & strategis Telkom Regional 3
            </p>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-600 font-medium">Komposisi Penyelesaian</span>
                <span className="text-[#2563EB] font-bold">100% Volume</span>
              </div>

              {/* Segmented bar */}
              <div className="flex h-2 rounded-full overflow-hidden w-full bg-slate-100 gap-0.5">
                <div className="bg-[#CBD5E1] h-full" style={{width: `${Math.round((flow.pending / flow.total) * 100)}%`}} />
                <div className="bg-[#2563EB] h-full" style={{width: `${Math.round((flow.progress / flow.total) * 100)}%`}} />
                <div className="bg-[#10B981] h-full" style={{width: `${Math.round((flow.done / flow.total) * 100)}%`}} />
              </div>

              {/* Segment labels */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>{Math.round((flow.pending / flow.total) * 100)}% Belum Dimulai</span>
                <span>{Math.round((flow.progress / flow.total) * 100)}% Berjalan</span>
                <span>{Math.round((flow.done / flow.total) * 100)}% Tuntas</span>
              </div>
            </div>
          </div>

          {/* Tree Connectors SVG (Center) */}
          <div className="hidden lg:flex items-center justify-center h-full px-1">
            <svg viewBox="0 0 100 240" className="w-full h-56" fill="none" strokeWidth="2.5">
              {/* Branch 1 curve up */}
              <path d="M 0 120 C 45 120, 55 40, 100 40" stroke="#3B82F6" strokeLinecap="round" />
              {/* Branch 2 horizontal */}
              <path d="M 0 120 L 100 120" stroke="#3B82F6" strokeLinecap="round" />
              {/* Branch 3 curve down */}
              <path d="M 0 120 C 45 120, 55 200, 100 200" stroke="#10B981" strokeLinecap="round" />
            </svg>
          </div>

          {/* Branch Cards (Right) */}
          <div className="space-y-3.5 mt-4 lg:mt-0">
            {/* Card 1: PENDING / NOT YET */}
            <div className="border border-slate-100 rounded-xl p-4.5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between hover:border-slate-200 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Cabang 2 — PENDING / NOT YET
                  </span>
                  <span className="bg-[#0F172A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    60% Mayoritas
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Belum Dimulai / Tertunda • Perlu Intervensi (PIC - PIC)
                </p>
              </div>

              <div className="text-right pl-4">
                <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                  {flow.pending}
                </span>
                <span className="text-[11px] font-bold text-red-500 inline-flex items-center gap-0.5 mt-0.5">
                  Agenda <ArrowDown size={11} strokeWidth={2.5} />
                </span>
              </div>
            </div>

            {/* Card 2: ON PROGRESS */}
            <div className="border border-slate-100 rounded-xl p-4.5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between hover:border-slate-200 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Cabang 3 — ON PROGRESS
                  </span>
                  <span className="bg-[#0F172A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    13% In-Flight
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  In-Flight Sedang Dikawal - Aktif direspons UIC
                </p>
              </div>

              <div className="text-right pl-4">
                <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                  {flow.progress}
                </span>
                <span className="text-[11px] font-bold text-blue-600 inline-flex items-center gap-0.5 mt-0.5">
                  In-Flight <ArrowRight size={11} strokeWidth={2.5} />
                </span>
              </div>
            </div>

            {/* Card 3: SELESAI (DONE) */}
            <div className="border border-slate-100 rounded-xl p-4.5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between hover:border-slate-200 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Cabang 3 — SELESAI (DONE)
                  </span>
                  <span className="bg-[#0F172A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    27% Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Status Tuntas 100% - Closed out
                </p>
              </div>

              <div className="text-right pl-4">
                <span className="text-2xl font-extrabold text-slate-900 block leading-tight">
                  {flow.done}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-0.5 mt-0.5">
                  Agenda <Check size={12} strokeWidth={3} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Row: Two Cards */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left Card: Performa Penyelesaian per Witel / Unit */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Performa Penyelesaian per Witel / Unit
            </h3>
            <span className="text-xs font-medium text-slate-400">Top Witel</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {witel.map(item => (
              <div key={item.n} className="flex items-center justify-between text-xs">
                <span className="w-36 font-medium text-slate-700 truncate">{item.n}</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                    style={{width: `${item.v}%`}}
                  />
                </div>
                <span className="w-8 text-right font-medium text-slate-500">{item.v}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Right Card: Distribusi Tanggung Jawab per UIC */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Distribusi Tanggung Jawab per UIC
            </h3>
            <span className="text-xs font-medium text-slate-400">Beban Kerja</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {uic.map(item => (
              <div key={item.n} className="flex items-center justify-between text-xs">
                <span className="w-20 font-medium text-slate-700">{item.n}</span>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                    style={{width: `${(item.v / 70) * 100}%`}}
                  />
                </div>
                <span className="w-8 text-right font-semibold text-slate-700">{item.v}</span>
                <button
                  onClick={() => {
                    setQ(item.n);
                  }}
                  className="w-32 text-right text-slate-500 hover:text-blue-600 transition-colors flex items-center justify-end gap-1 cursor-pointer font-medium"
                >
                  <span>Lihat Bottleneck</span>
                  <span>→</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Card: Aktivitas & Follow Up Terbaru */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Aktivitas & Follow Up Terbaru
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rincian komitmen meeting terkini beserta progress implementasi seluruh Witel
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-slate-200 rounded-full px-3.5 py-1.5 bg-slate-50/50 w-60 md:w-64 text-xs focus-within:bg-white focus-within:border-blue-500 transition-colors">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Cari agenda atau catatan…"
                className="bg-transparent outline-none w-full text-xs text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={st}
                onChange={e => setSt(e.target.value)}
                aria-label="Filter status agenda"
                className="border border-slate-200 rounded-full px-4 py-1.5 bg-white text-xs text-slate-700 appearance-none pr-8 cursor-pointer font-medium hover:border-slate-300 transition-colors"
              >
                <option value="Semua">Semua Status</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={13} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Button: Lihat Semua */}
        <div className="mt-3 mb-4">
          <button
            onClick={() => navigate('/support-needed')}
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <span>Lihat Semua</span>
            <span>→</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider text-left uppercase">
                <th className="py-3 pr-4">AGENDA</th>
                <th className="py-3 px-4">WITEL / UNIT</th>
                <th className="py-3 px-4">START DATE</th>
                <th className="py-3 px-4">CATATAN FOLLOW UP</th>
                <th className="py-3 px-4 text-center">UIC</th>
                <th className="py-3 px-4">PROGRESS</th>
                <th className="py-3 pl-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => (
                <tr key={r.id} className="border-b border-slate-100/80 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 pr-4">
                    <span className="block font-bold text-slate-800 uppercase tracking-tight">{r.agenda}</span>
                    {r.topic && <span className="block text-[11px] text-slate-400 mt-0.5">{r.topic}</span>}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{r.unit}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">{r.dateLabel}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm xl:max-w-md leading-relaxed">
                    <span className="line-clamp-2" title={r.catatan}>{r.catatan}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#2563EB] border border-blue-100 whitespace-nowrap">
                      {r.uic}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full"
                          style={{width: `${r.progress}%`}}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{r.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 pl-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded text-[10px] font-bold tracking-wider whitespace-nowrap ${
                        STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <p className="text-center text-slate-400 py-8 text-xs">
              Tidak ada agenda yang cocok dengan kriteria pencarian.
            </p>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 mt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">
            Menampilkan {firstShown} - {lastShown} dari {filtered.length} agenda
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-default px-2 py-1 font-medium transition-colors cursor-pointer"
            >
              &lt; Prev
            </button>
            {pageWindow(currentPage, totalPages).map((p, i, arr) => (
              <span key={p} className="flex items-center gap-1.5">
                {i > 0 && p - arr[i - 1] > 1 && <span className="text-slate-400 px-1">...</span>}
                <button
                  onClick={() => setPage(p)}
                  className={`size-7 rounded-full text-xs font-bold grid place-items-center transition-colors cursor-pointer ${
                    currentPage === p ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-default px-2 py-1 font-medium transition-colors cursor-pointer"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
