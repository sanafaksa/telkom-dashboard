import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, RotateCcw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useActivateEdk, useAuditLogs, useEdkUploads } from './queries';

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-';

const ACTION_LABEL = {
  'auth.login': 'Login',
  'auth.login_failed': 'Login gagal',
  'auth.logout': 'Logout',
  'edk.upload': 'Upload report',
  'edk.upload_failed': 'Upload gagal',
  'edk.activate': 'Aktifkan snapshot',
  'edk.export': 'Export'
};

const ACTION_COLOR = {
  'auth.login_failed': 'bg-rose-100 text-rose-700',
  'edk.upload_failed': 'bg-rose-100 text-rose-700',
  'edk.upload': 'bg-blue-100 text-blue-700',
  'edk.activate': 'bg-amber-100 text-amber-700',
  'edk.export': 'bg-emerald-100 text-emerald-700'
};

/** Ringkasan isi meta per jenis aksi */
const describe = (log) => {
  const m = log.meta ?? {};
  switch (log.action) {
    case 'edk.upload':
      return `${m.original_name ?? '-'} • ${(m.total_rows ?? 0).toLocaleString('id-ID')} baris • laporan ${fmtDate(m.report_date)}`;
    case 'edk.upload_failed':
      return `${m.original_name ?? '-'} • ${m.error_count ?? 0} baris bermasalah`;
    case 'edk.activate':
      return `Snapshot #${log.subject_id} • laporan ${fmtDate(m.report_date)}`;
    case 'edk.export':
      return `${(m.format ?? '').toUpperCase()} per ${m.by ?? '-'}${m.upload_id ? ` • snapshot #${m.upload_id}` : ''}`;
    case 'auth.login_failed':
      return `Login sebagai: ${m.login ?? '-'}`;
    default:
      return '';
  }
};

function StatusBadge({ upload }) {
  if (upload.is_active) {
    return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Aktif</span>;
  }
  if (upload.status === 'done') {
    return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">Berhasil</span>;
  }
  if (upload.status === 'failed') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
        Gagal{upload.error_count ? ` (${upload.error_count} error)` : ''}
      </span>
    );
  }
  return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Diproses</span>;
}

// ───────────────────────── Tab: Riwayat Upload ─────────────────────────

function HistoryTab({ viewingId, canActivate, onView, onClose }) {
  const uploadsQ = useEdkUploads();
  const activate = useActivateEdk();
  const uploads = uploadsQ.data?.data ?? [];

  const handleView = (id) => {
    onView(id);
    onClose();
  };

  const handleActivate = async (u) => {
    const ok = window.confirm(
      `Aktifkan snapshot laporan ${fmtDate(u.report_date)} (${u.original_name})?\n` +
        'Data ini akan menjadi data aktif yang dilihat semua user.'
    );
    if (!ok) return;

    try {
      await activate.mutateAsync(u.id);
      onView(null);
      onClose();
    } catch (err) {
      alert(err.message || 'Gagal mengaktifkan snapshot.');
    }
  };

  if (uploadsQ.isLoading) return <p className="p-8 text-center text-xs text-slate-400">Memuat riwayat…</p>;
  if (uploadsQ.error) return <p className="p-8 text-center text-xs text-rose-600">{uploadsQ.error.message}</p>;
  if (uploads.length === 0) return <p className="p-8 text-center text-xs text-slate-400">Belum ada upload.</p>;

  return (
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-slate-600 sticky top-0">
        <tr>
          <th className="px-4 py-2.5 text-left font-bold">Tanggal Laporan</th>
          <th className="px-4 py-2.5 text-left font-bold">Periode EDK</th>
          <th className="px-4 py-2.5 text-left font-bold">File</th>

          <th className="px-4 py-2.5 text-right font-bold">Baris</th>
          <th className="px-4 py-2.5 text-left font-bold">Status</th>
          <th className="px-4 py-2.5 text-left font-bold">Diupload</th>
          <th className="px-4 py-2.5 text-left font-bold">Diaktifkan</th>
          <th className="px-4 py-2.5 text-right font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {uploads.map((u) => (
          <tr
            key={u.id}
            className={`border-t border-slate-100 align-top ${viewingId === u.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
          >
            <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{fmtDate(u.report_date)}</td>
            <td className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">{u.periode_edk ?? '-'}</td>
            <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate" title={u.original_name}>
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {u.total_rows?.toLocaleString('id-ID') ?? 0}
            </td>
            <td className="px-4 py-2.5 whitespace-nowrap">
              <StatusBadge upload={u} />
            </td>
            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
              <div>{fmtDateTime(u.created_at)}</div>
              <div className="text-slate-400">{u.uploader?.name ?? '-'}</div>
            </td>
            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
              {u.activated_at ? (
                <>
                  <div>{fmtDateTime(u.activated_at)}</div>
                  <div className="text-slate-400">{u.activator?.name ?? '-'}</div>
                </>
              ) : (
                '-'
              )}
            </td>
            <td className="px-4 py-2.5">
              {u.status === 'done' && (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleView(u.is_active ? null : u.id)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} /> Lihat
                  </button>
                  {!u.is_active && canActivate && (
                    <button
                      type="button"
                      disabled={activate.isPending}
                      onClick={() => handleActivate(u)}
                      className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {activate.isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Aktifkan
                    </button>
                  )}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ───────────────────────── Tab: Log Aktivitas (admin) ─────────────────────────

function AuditTab() {
  const [page, setPage] = useState(1);
  const logsQ = useAuditLogs(page);
  const logs = logsQ.data?.data ?? [];
  const lastPage = logsQ.data?.last_page ?? 1;

  if (logsQ.isLoading) return <p className="p-8 text-center text-xs text-slate-400">Memuat log…</p>;
  if (logsQ.error) return <p className="p-8 text-center text-xs text-rose-600">{logsQ.error.message}</p>;
  if (logs.length === 0) return <p className="p-8 text-center text-xs text-slate-400">Belum ada aktivitas.</p>;

  return (
    <>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-600 sticky top-0">
          <tr>
            <th className="px-4 py-2.5 text-left font-bold">Waktu</th>
            <th className="px-4 py-2.5 text-left font-bold">User</th>
            <th className="px-4 py-2.5 text-left font-bold">Aksi</th>
            <th className="px-4 py-2.5 text-left font-bold">Detail</th>
            <th className="px-4 py-2.5 text-left font-bold">IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
              <td className="px-4 py-2.5 text-slate-800 font-semibold whitespace-nowrap">{log.user?.name ?? '-'}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${ACTION_COLOR[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ACTION_LABEL[log.action] ?? log.action}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-600 max-w-[280px] truncate" title={describe(log)}>
                {describe(log) || '-'}
              </td>
              <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{log.ip_address ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
        <span>
          Halaman {page} dari {lastPage}
        </span>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="size-7 rounded-lg border border-slate-200 grid place-items-center disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => setPage((p) => p + 1)}
          className="size-7 rounded-lg border border-slate-200 grid place-items-center disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </>
  );
}

// ───────────────────────── Modal ─────────────────────────

export default function UploadHistoryModal({ onClose, viewingId, onView, canActivate = false }) {
  const [tab, setTab] = useState('history');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Upload EDK</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lihat snapshot lama{canActivate ? ', aktifkan kembali (rollback), atau cek log aktivitas' : ''}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {canActivate && (
          <div className="flex gap-1 px-6 pt-3">
            {[
              ['history', 'Riwayat Upload'],
              ['audit', 'Log Aktivitas']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  tab === key ? 'bg-[#1D4ED8] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto mt-2">
          {tab === 'audit' && canActivate ? (
            <AuditTab />
          ) : (
            <HistoryTab viewingId={viewingId} canActivate={canActivate} onView={onView} onClose={onClose} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
