import { AlertTriangle } from 'lucide-react';

/**
 * Konfirmasi sebelum menutup modal upload yang masih punya file belum diupload.
 * Dirender di dalam modal (z di atas modal), klik "Batal" = tetap di modal, klik "Buang draft" = hapus draft lalu tutup.
 */
export default function DiscardDraftDialog({ onCancel, onDiscard }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-draft-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-amber-200 animate-[fadeIn_0.2s_ease-out]"
      >
        <div className="flex items-start gap-3">
          <div className="size-10 shrink-0 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 id="discard-draft-title" className="font-extrabold text-sm text-slate-900">
              Buang draft upload?
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              File yang dipilih belum diupload. Jika modal ditutup, draft ini akan dibuang dan tidak bisa dikembalikan.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold bg-rose-600 hover:bg-rose-700 cursor-pointer"
          >
            Buang draft
          </button>
        </div>
      </div>
    </div>
  );
}
