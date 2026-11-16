import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { ROLE_LABEL, ROLE_TONE } from '../auth/auth';

/* Komponen kecil yang dipakai bersama oleh halaman administrasi. */

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function fmtBytes(n) {
  if (n === null || n === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = Number(n);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toLocaleString('id-ID', { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 })} ${units[i]}`;
}

/** Pesan error yang bisa dibaca dari ApiError (validasi 422 → pesan field pertama). */
export function errText(err) {
  const errors = err?.data?.errors;
  if (errors) return Object.values(errors).flat()[0];
  if (err?.status === 403) return err?.data?.message ?? 'Anda tidak punya akses untuk aksi ini.';
  if (err?.status === 429) return 'Terlalu banyak permintaan. Coba lagi sebentar.';
  return err?.message ?? 'Terjadi kesalahan.';
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-400';

export function Page({ title, sub, actions, children }) {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {sub && <p className="text-xs text-mute mt-1">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-5">{children}</div>
    </>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, icon: Icon, tone = 'text-[#2563EB] bg-blue-50' }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      {Icon && (
        <span className={`size-9 shrink-0 rounded-xl grid place-items-center ${tone}`}>
          <Icon size={17} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-mute">{label}</p>
        <p className="text-2xl font-bold leading-tight text-slate-900">{value ?? '—'}</p>
        {note && <p className="text-[11px] text-mute mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export function Btn({ variant = 'default', busy = false, icon: Icon, children, className = '', ...props }) {
  const tone = {
    default: 'btn hover:bg-slate-50 text-slate-700',
    primary: 'btn btn-primary hover:brightness-110',
    danger: 'btn border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      className={`${tone} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : Icon ? <Icon size={13} /> : null}
      {children}
    </button>
  );
}

export function Badge({ tone = 'bg-slate-100 text-slate-600', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>
      {children}
    </span>
  );
}

/** Label dari server (role buatan Admin) diutamakan; role bawaan memakai label statis. */
export const RoleBadge = ({ role, label }) => (
  <Badge tone={ROLE_TONE[role] ?? 'bg-indigo-100 text-indigo-700'}>{label ?? ROLE_LABEL[role] ?? role}</Badge>
);

export function Notice({ tone = 'ok', children, onClose }) {
  if (!children) return null;
  const ok = tone === 'ok';
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-medium ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div className="flex-1 break-words">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="cursor-pointer opacity-60 hover:opacity-100" aria-label="Tutup">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/** Bungkus hasil useQuery: tampilkan status memuat / error, lalu render children(data). */
export function Query({ q, children }) {
  if (q.isPending) {
    return (
      <div className="card p-10 text-center text-xs text-mute">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Memuat data…
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold text-rose-600">{errText(q.error)}</p>
        <Btn className="mt-3" onClick={() => q.refetch()}>
          Coba lagi
        </Btn>
      </div>
    );
  }
  return children(q.data);
}

export function DataTable({ columns, rows, rowKey = 'id', empty = 'Belum ada data.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-mute">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 font-semibold whitespace-nowrap ${c.className ?? ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-mute">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={typeof rowKey === 'function' ? rowKey(row, i) : row[rowKey]} className="hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 align-middle text-slate-700 ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, lastPage, total, onPage }) {
  if (!lastPage || lastPage <= 1) return total ? <p className="px-5 py-3 text-[11px] text-mute">{total} data</p> : null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[11px] text-mute">
      <span>
        Halaman {page} dari {lastPage} · {total} data
      </span>
      <div className="flex gap-2">
        <Btn disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Sebelumnya
        </Btn>
        <Btn disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
          Berikutnya
        </Btn>
      </div>
    </div>
  );
}

export function Modal({ title, sub, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[90vh] w-full flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl ${
          wide ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {sub && <p className="text-xs text-mute mt-0.5">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-600" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mute">{hint}</span>}
    </label>
  );
}
