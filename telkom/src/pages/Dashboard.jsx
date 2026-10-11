import {useState} from 'react';
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
import {exportCSV} from '../components/ui';

export default function Dashboard() {
  const [q, setQ] = useState('');
  const [st, setSt] = useState('Semua');
  const [page, setPage] = useState(1);

  const filtered = activity.filter(r => {
    const matchStatus = st === 'Semua' || r.s.toUpperCase() === st.toUpperCase();
    const matchQuery = (r.a + ' ' + r.c + ' ' + r.w + ' ' + r.u)
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchStatus && matchQuery;
  });

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

        <div className="flex items-center gap-2.5">
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
                <option value="NOT YET">NOT YET</option>
                <option value="DONE">DONE</option>
              </select>
              <ChevronDown size={13} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Button: Lihat Semua */}
        <div className="mt-3 mb-4">
          <button
            onClick={() => {
              setQ('');
              setSt('Semua');
            }}
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
              {filtered.map((r, i) => (
                <tr key={r.a + r.w + i} className="border-b border-slate-100/80 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 pr-4 font-bold text-slate-800 uppercase tracking-tight">
                    {r.a}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{r.w}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">{r.d}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm xl:max-w-md leading-relaxed">
                    {r.c}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${
                        r.u === 'ALL WITEL'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200/50'
                          : 'bg-blue-50 text-[#2563EB] border border-blue-100'
                      }`}
                    >
                      {r.u}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full"
                          style={{width: `${r.p}%`}}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{r.p}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 pl-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded text-[10px] font-bold tracking-wider ${
                        r.s === 'DONE'
                          ? 'bg-blue-50 text-[#2563EB]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.s}
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
            Menampilkan 1 - {Math.min(filtered.length, 6)} dari 379 agenda
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              className="text-slate-400 hover:text-slate-700 px-2 py-1 font-medium transition-colors cursor-pointer"
            >
              &lt; Prev
            </button>
            <button
              onClick={() => setPage(1)}
              className={`size-7 rounded-full text-xs font-bold grid place-items-center transition-colors cursor-pointer ${
                page === 1 ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setPage(2)}
              className={`size-7 rounded-full text-xs font-bold grid place-items-center transition-colors cursor-pointer ${
                page === 2 ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              2
            </button>
            <button
              onClick={() => setPage(3)}
              className={`size-7 rounded-full text-xs font-bold grid place-items-center transition-colors cursor-pointer ${
                page === 3 ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              3
            </button>
            <span className="text-slate-400 px-1">...</span>
            <button
              onClick={() => setPage(64)}
              className={`size-7 rounded-full text-xs font-bold grid place-items-center transition-colors cursor-pointer ${
                page === 64 ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              64
            </button>
            <button
              onClick={() => setPage(Math.min(64, page + 1))}
              className="text-slate-600 hover:text-slate-900 px-2 py-1 font-medium transition-colors cursor-pointer"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
