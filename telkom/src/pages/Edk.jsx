import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { filterOptions, kpi, modes } from '../data/edkData';
import { PageHeader, KpiCard, fmt, exportCSV, ExportButton } from '../components/ui';
import { Filter, ArrowUpRight, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

const cellFmt = (v) => (v !== undefined && v !== null ? fmt(v) : '-');

export default function Edk() {
  const [mode, setMode] = useState('Nama AM');
  const [sorting, setSorting] = useState([]);

  // Filter States
  const [filterPeriode, setFilterPeriode] = useState('Semua');
  const [filterSegmen, setFilterSegmen] = useState('Semua');
  const [filterNamaAm, setFilterNamaAm] = useState('Semua');
  const [filterFlagging, setFilterFlagging] = useState('Semua');

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Reset filters when mode changes so user doesn't get 0 results
    setFilterPeriode('Semua');
    setFilterSegmen('Semua');
    setFilterNamaAm('Semua');
    setFilterFlagging('Semua');
  };

  const resetFilters = () => {
    setFilterPeriode('Semua');
    setFilterSegmen('Semua');
    setFilterNamaAm('Semua');
    setFilterFlagging('Semua');
  };

  const data = useMemo(() => {
    let list = modes[mode] || [];
    if (filterPeriode !== 'Semua') {
      list = list.filter((r) => r.isTotalRow || r.periode === filterPeriode || (mode === 'Periode EDK' && r.l === filterPeriode));
    }
    if (filterSegmen !== 'Semua') {
      list = list.filter((r) => r.isTotalRow || r.segmen === filterSegmen || (mode === 'Segmen' && r.l === filterSegmen));
    }
    if (filterNamaAm !== 'Semua') {
      list = list.filter((r) => r.isTotalRow || r.namaAm === filterNamaAm || r.l === filterNamaAm);
    }
    if (filterFlagging !== 'Semua') {
      list = list.filter((r) => r.isTotalRow || r.flagging === filterFlagging);
    }
    return list.map((r) => ({
      ...r,
      to: (r.lc || 0) + (r.lp || 0) + (r.tc || 0) + (r.tp || 0) + (r.b || 0) + (r.k || 0),
      ta2: (r.la || 0) + (r.lpa || 0) + (r.ta || 0) + (r.tpa || 0) + (r.ba || 0) + (r.ka || 0)
    }));
  }, [mode, filterPeriode, filterSegmen, filterNamaAm, filterFlagging]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'l',
        header: mode,
      },
      {
        header: 'Lanjut',
        columns: [
          {
            header: 'Complete',
            columns: [
              { accessorKey: 'lc', header: 'Jumlah Order' },
              { accessorKey: 'la', header: 'Abonemen (Rp)' }
            ]
          },
          {
            header: 'In Progress',
            columns: [
              { accessorKey: 'lp', header: 'Jumlah Order' },
              { accessorKey: 'lpa', header: 'Abonemen (Rp)' }
            ]
          }
        ]
      },
      {
        header: 'Tidak Lanjut',
        columns: [
          {
            header: 'Complete',
            columns: [
              { accessorKey: 'tc', header: 'Jumlah Order' },
              { accessorKey: 'ta', header: 'Abonemen (Rp)' }
            ]
          },
          {
            header: 'In Progress',
            columns: [
              { accessorKey: 'tp', header: 'Jumlah Order' },
              { accessorKey: 'tpa', header: 'Abonemen (Rp)' }
            ]
          }
        ]
      },
      {
        header: 'Bukan Witel Solo JT',
        columns: [
          {
            header: '',
            columns: [
              { accessorKey: 'b', header: 'Jumlah Order' },
              { accessorKey: 'ba', header: 'Abonemen (Rp)' }
            ]
          }
        ]
      },
      {
        header: 'Konfirmasi AM',
        columns: [
          {
            header: '',
            columns: [
              { accessorKey: 'k', header: 'Jumlah Order' },
              { accessorKey: 'ka', header: 'Abonemen (Rp)' }
            ]
          }
        ]
      },
      {
        header: 'Total EDK',
        columns: [
          {
            header: '',
            columns: [
              { accessorKey: 'to', header: 'Jumlah Order' },
              { accessorKey: 'ta2', header: 'Abonemen (Rp)' }
            ]
          }
        ]
      }
    ],
    [mode]
  );

  const t = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } }
  });

  const pageIndex = t.getState().pagination.pageIndex;
  const pageSize = t.getState().pagination.pageSize;
  const totalRows = data.length;
  const pageCount = Math.max(1, t.getPageCount());

  const labelSuffix = mode === 'Nama AM' ? 'data AM' : mode === 'Periode EDK' ? 'data periode' : 'data segmen';

  return (
    <>
      <PageHeader
        title="EDK Monitoring"
        sub="Monitoring status NCX, OBL, update terakhir, dan total EDK"
        onExport={() => exportCSV(data, 'edk-' + mode)}
        actions={
          <>
            <span className="btn cursor-default bg-slate-50/50">
              <i className="size-1.5 rounded-full bg-blue-600" />
              Update Terkini Real-time
            </span>
            <button className="btn cursor-pointer">
              <Filter size={14} />
              Filter
            </button>
            <ExportButton onClick={() => exportCSV(data, 'edk-' + mode)} />
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="TOTAL ORDER"
          value={kpi.order}
          note={
            <>
              <span className="text-ok font-bold">+12%</span> <span className="text-mute">dari periode sebelumnya</span>
            </>
          }
          tone="text-slate-600"
        />
        <KpiCard
          label="TOTAL ABONEMEN"
          value={kpi.abon}
          note={
            <>
              <span className="text-ok font-bold inline-flex items-center gap-0.5">
                <ArrowUpRight className="size-3.5 bg-blue-100 text-blue-600 rounded-sm p-0.5" strokeWidth={3} />
                +8%
              </span>{' '}
              <span className="text-mute">dari periode sebelumnya</span>
            </>
          }
          tone="text-slate-600"
        />
        <KpiCard
          label="IN PROGRESS"
          value={kpi.prog}
          note={
            <>
              <span className="font-bold text-slate-800">49.5%</span> dari total order
            </>
          }
          tone="text-mute"
        />
        <KpiCard
          label="COMPLETE"
          value={kpi.done}
          note={
            <>
              <span className="font-bold text-slate-800">50.5%</span> dari total order
            </>
          }
          tone="text-mute"
        />
      </div>

      {/* FILTER BAR */}
      <div className="card p-4 mb-4 flex flex-wrap items-center justify-between gap-4 shadow-sm bg-white rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Periode EDK</label>
            <select
              value={filterPeriode}
              onChange={(e) => setFilterPeriode(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-brand cursor-pointer min-w-[110px]"
            >
              {filterOptions.periode.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Segmen</label>
            <select
              value={filterSegmen}
              onChange={(e) => setFilterSegmen(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-brand cursor-pointer min-w-[110px]"
            >
              {filterOptions.segmen.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama AM</label>
            <select
              value={filterNamaAm}
              onChange={(e) => setFilterNamaAm(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-brand cursor-pointer min-w-[130px]"
            >
              {filterOptions.namaAm.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Flagging Last Update</label>
            <select
              value={filterFlagging}
              onChange={(e) => setFilterFlagging(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-brand cursor-pointer min-w-[130px]"
            >
              {filterOptions.flagging.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end self-end pt-5">
            <button
              onClick={resetFilters}
              className="btn cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs py-1.5 px-3 rounded-lg font-semibold flex items-center gap-1.5"
            >
              <RotateCcw size={13} /> Reset Filter
            </button>
          </div>
        </div>

        {/* Segmented Control Mode Switcher */}
        <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-white">
          {['Segmen', 'Periode EDK', 'Nama AM'].map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-3.5 py-1.5 text-xs font-bold transition-colors rounded-md cursor-pointer ${
                mode === m ? 'bg-[#E31E24] text-white shadow-sm' : 'text-slate-700 hover:text-slate-900 bg-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE CARD */}
      <section className="card overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="px-4 py-3 text-xs font-bold text-slate-800 border-b border-slate-100">Last Update : 29 September 2026</p>

        <div className="overflow-auto max-h-[560px]">
          <table className="w-full text-xs border-collapse border-spacing-0">
            <thead className="sticky top-0 z-20">
              {/* Level 1 Group Header */}
              <tr>
                <th
                  rowSpan={3}
                  className="sticky left-0 z-30 bg-white px-3 py-2 text-center font-bold text-xs text-slate-800 border-r-2 border-b border-slate-300 min-w-[110px] max-w-[130px] align-middle shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                >
                  {mode}
                </th>
                <th colSpan={4} className="bg-[#1D8FD6] text-white font-bold text-center text-xs py-2 border-r-2 border-white">
                  Lanjut
                </th>
                <th colSpan={4} className="bg-[#E31E24] text-white font-bold text-center text-xs py-2 border-r-2 border-white">
                  Tidak Lanjut
                </th>
                <th colSpan={2} className="bg-[#334155] text-white font-bold text-center text-xs py-2 border-r-2 border-white">
                  Bukan Witel Solo JT
                </th>
                <th colSpan={2} className="bg-[#7C3F12] text-white font-bold text-center text-xs py-2 border-r-2 border-white">
                  Konfirmasi AM
                </th>
                <th colSpan={2} className="bg-[#9CA3AF] text-white font-bold text-center text-xs py-2">
                  Total EDK
                </th>
              </tr>

              {/* Level 2 Sub-header */}
              <tr>
                <th colSpan={2} className="bg-[#DBEAFE] text-[#1D8FD6] font-bold text-center text-[11px] py-1.5 border-r border-white">
                  Complete
                </th>
                <th colSpan={2} className="bg-[#DBEAFE] text-[#1D8FD6] font-bold text-center text-[11px] py-1.5 border-r-2 border-white">
                  In Progress
                </th>
                <th colSpan={2} className="bg-[#FEE2E2] text-[#E31E24] font-bold text-center text-[11px] py-1.5 border-r border-white">
                  Complete
                </th>
                <th colSpan={2} className="bg-[#FEE2E2] text-[#E31E24] font-bold text-center text-[11px] py-1.5 border-r-2 border-white">
                  In Progress
                </th>
                <th colSpan={2} className="bg-[#F1F5F9] text-transparent py-1.5 border-r-2 border-white select-none">
                  -
                </th>
                <th colSpan={2} className="bg-[#FEF3C7] text-transparent py-1.5 border-r-2 border-white select-none">
                  -
                </th>
                <th colSpan={2} className="bg-[#E5E7EB] text-transparent py-1.5 select-none">
                  -
                </th>
              </tr>

              {/* Level 3 Metrics Header */}
              <tr className="border-b border-slate-300">
                <th className="bg-[#DBEAFE] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#DBEAFE] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-300">
                  Abonemen (Rp)
                </th>
                <th className="bg-[#DBEAFE] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#DBEAFE] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r-2 border-slate-400">
                  Abonemen (Rp)
                </th>

                <th className="bg-[#FEE2E2] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#FEE2E2] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-300">
                  Abonemen (Rp)
                </th>
                <th className="bg-[#FEE2E2] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#FEE2E2] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r-2 border-slate-400">
                  Abonemen (Rp)
                </th>

                <th className="bg-[#F1F5F9] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#F1F5F9] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r-2 border-slate-400">
                  Abonemen (Rp)
                </th>

                <th className="bg-[#FEF3C7] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#FEF3C7] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r-2 border-slate-400">
                  Abonemen (Rp)
                </th>

                <th className="bg-[#F3F4F6] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center border-r border-slate-200/80">
                  Jumlah Order
                </th>
                <th className="bg-[#F3F4F6] text-slate-700 font-semibold text-[10px] py-1.5 px-2 text-center">
                  Abonemen (Rp)
                </th>
              </tr>
            </thead>

            <tbody>
              {t.getRowModel().rows.length > 0 ? (
                t.getRowModel().rows.map((r) => {
                  const isTotal = r.original.isTotalRow;
                  const rowBg = isTotal ? 'bg-[#DBEAFE]' : 'bg-white';

                  return (
                    <tr key={r.id} className={`h-11 border-b border-slate-200/80 hover:bg-slate-50/70 transition-colors ${rowBg}`}>
                      {/* First column (Sticky) */}
                      <td
                        className={`px-3 py-2 text-left uppercase text-[11px] font-bold text-slate-800 leading-snug min-w-[110px] max-w-[130px] whitespace-normal sticky left-0 z-10 border-r-2 border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.03)] ${
                          isTotal ? 'bg-[#DBEAFE]' : 'bg-white'
                        }`}
                      >
                        {r.original.l}
                      </td>

                      {/* Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#EFF6FF] border-r border-slate-200/80">
                        {cellFmt(r.original.lc)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#EFF6FF] border-r border-slate-300">
                        {cellFmt(r.original.la)}
                      </td>

                      {/* Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#EFF6FF] border-r border-slate-200/80">
                        {cellFmt(r.original.lp)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#EFF6FF] border-r-2 border-slate-400">
                        {cellFmt(r.original.lpa)}
                      </td>

                      {/* Tidak Lanjut Complete */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#FEF2F2] border-r border-slate-200/80">
                        {cellFmt(r.original.tc)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#FEF2F2] border-r border-slate-300">
                        {cellFmt(r.original.ta)}
                      </td>

                      {/* Tidak Lanjut In Progress */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#FEF2F2] border-r border-slate-200/80">
                        {cellFmt(r.original.tp)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#FEF2F2] border-r-2 border-slate-400">
                        {cellFmt(r.original.tpa)}
                      </td>

                      {/* Bukan Witel Solo JT */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#F8FAFC] border-r border-slate-200/80">
                        {cellFmt(r.original.b)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#F8FAFC] border-r-2 border-slate-400">
                        {cellFmt(r.original.ba)}
                      </td>

                      {/* Konfirmasi AM */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#FFFBEB] border-r border-slate-200/80">
                        {cellFmt(r.original.k)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-medium text-slate-700 bg-[#FFFBEB] border-r-2 border-slate-400">
                        {cellFmt(r.original.ka)}
                      </td>

                      {/* Total EDK */}
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-slate-800 bg-white border-r border-slate-200/80">
                        {cellFmt(r.original.to)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs font-bold text-slate-800 bg-white">
                        {cellFmt(r.original.ta2)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada data yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-700">{totalRows > 0 ? pageIndex * pageSize + 1 : 0}</span>–
            <span className="font-bold text-slate-700">{Math.min((pageIndex + 1) * pageSize, totalRows)}</span> dari{' '}
            <span className="font-bold text-slate-700">{totalRows}</span> {labelSuffix}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(e) => t.setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand cursor-pointer"
              >
                {[10, 25, 50, 100].map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
              <span>data per halaman</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={!t.getCanPreviousPage()}
                onClick={() => t.previousPage()}
                className="size-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => t.setPageIndex(p - 1)}
                  className={`size-7 rounded-lg font-bold text-xs cursor-pointer flex items-center justify-center ${
                    pageIndex === p - 1 ? 'bg-[#E31E24] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                disabled={!t.getCanNextPage()}
                onClick={() => t.nextPage()}
                className="size-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
