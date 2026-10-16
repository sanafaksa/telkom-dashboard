import {ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Star} from 'lucide-react';
import {fmt} from './ui';

export function QuadrantCard({d}) {
  const isPositive = d.mom >= 0;

  return (
    <article className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
      {/* Dark Navy / Royal Blue Card Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
        style={{ background: 'linear-gradient(135deg, #06246A 0%, #1a3fa8 50%, #3B5FE0 100%)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="border border-white/50 bg-white/10 rounded-md px-2 py-0.5 text-xs font-bold shrink-0">
            {d.code}
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate leading-tight text-white">{d.name}</h3>
            <p className="text-[10px] text-white/80 truncate mt-0.5">({d.desc})</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xl sm:text-2xl font-extrabold leading-none text-white tracking-tight">
            {fmt(d.value)}
          </p>
          <p className="text-[10px] text-white/80 mt-1">Last Month {fmt(d.last)}</p>
        </div>
      </div>

      {/* Card Body: 3 Clean Rounded Strips matching the screenshot */}
      <div className="p-3.5 space-y-2 bg-white">
        {d.cells ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {d.cells.map(([k, v, pct]) => {
                const share = d.value > 0 ? ((v / d.value) * 100).toFixed(1) : 0;
                return (
                  <div key={k} className="bg-slate-100 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                    <b className="text-slate-700 font-semibold">{k}</b>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{fmt(v)}</span>
                      {pct !== undefined ? (
                        <span className={`text-[10px] font-semibold ${String(pct).startsWith('-') ? 'text-red-500' : 'text-emerald-600'}`}>
                          {pct}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({share}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Star size={13} fill="currentColor" className="text-amber-500" />
                NEW
              </span>
              <b className="text-sm font-bold text-slate-800">{fmt(d.newVal || 0)}</b>
              <span className={`${(d.newMom ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'} text-xs font-bold`}>
                {(d.newMom ?? 0) > 0 ? `+${d.newMom}%` : `${d.newMom ?? 0}%`}{' '}
                <small className="block font-normal text-slate-400">vs Last Month</small>
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">
                LAST MONTH
              </p>
              <div className="bg-slate-100 rounded-lg py-2 text-center font-bold text-slate-800 text-sm">
                {fmt(d.last)}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">
                REAL
              </p>
              <div className="bg-slate-100 rounded-lg py-2 text-center font-bold text-slate-800 text-sm">
                {fmt(d.value)}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">
                MoM
              </p>
              <div
                className={`bg-slate-100 rounded-lg py-2 text-center font-bold text-sm ${
                  isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {d.mom > 0 ? `+ ${d.mom}%` : d.mom < 0 ? `- ${Math.abs(d.mom)}%` : '0%'}
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function QuadrantGrid({items}) {
  return (
    <div className="card p-4 md:p-8 relative bg-white border border-slate-200/80 rounded-2xl shadow-xs">
      <div className="grid gap-4 md:gap-x-14 md:gap-y-12 md:grid-cols-2 relative">
        {items.map(d => (
          <QuadrantCard key={d.code} d={d} />
        ))}

        {/* Vertical Axis Line */}
        <div
          className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 rounded-full pointer-events-none"
          style={{ background: 'linear-gradient(180deg, #06246A 0%, #3B5FE0 100%)' }}
          aria-hidden
        >
          <ArrowUp size={12} className="text-white mx-auto mt-1.5" />
          <span className="[writing-mode:vertical-lr] text-[9px] font-bold text-white tracking-widest uppercase block mx-auto my-auto text-center opacity-80 pt-6">
            USAGE
          </span>
          <ArrowDown size={12} className="text-white mx-auto absolute bottom-1.5 left-1/2 -translate-x-1/2" />
        </div>

        {/* Horizontal Axis Line */}
        <div
          className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 h-5 rounded-full text-white text-[10px] font-bold items-center justify-between px-3 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, #06246A 0%, #3B5FE0 100%)' }}
          aria-hidden
        >
          <span className="flex items-center gap-1 tracking-wider">
            <ArrowLeft size={12} />
            TANPA TAGIHAN
          </span>

          {/* Center Hub */}
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-6 rounded-full border-2 border-white grid place-items-center"
            style={{ background: 'linear-gradient(135deg, #06246A 0%, #3B5FE0 100%)' }}
          >
            <i className="size-1.5 bg-white rounded-full" />
          </span>

          <span className="flex items-center gap-1 tracking-wider">
            DENGAN TAGIHAN
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function GrandTotalCard({t}) {
  return (
    <section className="rounded-2xl overflow-hidden mt-6 border border-slate-200 shadow-xs bg-white">
      {/* Solid Blue Header Banner */}
      <h2
        className="text-center font-bold text-white py-3.5 text-xs sm:text-sm tracking-wider"
        style={{ background: 'linear-gradient(90deg, #06246A 0%, #3B5FE0 100%)' }}
      >
        GRAND TOTAL PERFORMANCE
      </h2>

      {/* 3 Metric Columns in Light Grey Boxes */}
      <div className="p-4 grid sm:grid-cols-3 gap-3 text-center bg-white">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            LAST MONTH
          </p>
          <div className="bg-slate-100 rounded-lg py-2.5 font-bold text-slate-800 text-sm">
            {fmt(t.last)}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            REAL
          </p>
          <div className="bg-slate-100 rounded-lg py-2.5 font-bold text-slate-800 text-sm">
            {fmt(t.real)}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            MoM
          </p>
          <div className="bg-slate-100 rounded-lg py-2.5 font-bold text-sm text-emerald-600">
            +{t.mom}%
          </div>
        </div>
      </div>
    </section>
  );
}
