import { createPortal } from 'react-dom';
import { X, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { useActivateEdk, useEdkUploads } from './queries';

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

export default function UploadHistoryModal({ onClose, viewingId, onView, canActivate = false }) {
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
      onView(null); // kembali ke data aktif (yang sekarang = snapshot ini)
      onClose();
    } catch (err) {
      alert(err.message || 'Gagal mengaktifkan snapshot.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Upload EDK</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lihat snapshot lama{canActivate ? ' atau aktifkan kembali (rollback) jika terjadi salah upload' : ''}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {uploadsQ.isLoading ? (
            <p className="p-8 text-center text-xs text-slate-400">Memuat riwayat…</p>
          ) : uploadsQ.error ? (
            <p className="p-8 text-center text-xs text-rose-600">{uploadsQ.error.message}</p>
          ) : uploads.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">Belum ada upload.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold">Tanggal Laporan</th>
                  <th className="px-4 py-2.5 text-left font-bold">File</th>
                  <th className="px-4 py-2.5 text-right font-bold">Baris</th>
                  <th className="px-4 py-2.5 text-left font-bold">Status</th>
                  <th className="px-4 py-2.5 text-left font-bold">Diupload</th>
                  <th className="px-4 py-2.5 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-t border-slate-100 ${viewingId === u.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {fmtDate(u.report_date)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={u.original_name}>
                      {u.original_name}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {u.total_rows?.toLocaleString('id-ID') ?? 0}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge upload={u} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {fmtDateTime(u.created_at)}
                      {u.uploader?.name ? ` • ${u.uploader.name}` : ''}
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
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
