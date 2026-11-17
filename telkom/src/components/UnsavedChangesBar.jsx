import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Popup konfirmasi saat akan keluar padahal perubahan belum disimpan ke database.
 * Ditampilkan di atas popup yang sedang terbuka (lewat portal). Klik latar = tetap mengedit.
 */
export default function UnsavedChangesBar({ onStay, onSave, onDiscard, busy = false }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-desc"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="flex items-start gap-3">
            <span className="size-10 shrink-0 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 id="unsaved-title" className="font-extrabold text-slate-900 text-base">
                Perubahan belum disimpan
              </h3>
              <p id="unsaved-desc" className="text-xs text-slate-600 mt-1 leading-relaxed">
                Ada perubahan yang belum disimpan ke database. Draft sudah tersimpan otomatis di browser ini, jadi bisa
                dilanjutkan nanti.
              </p>
            </div>
          </div>
          <button type="button" onClick={onStay} title="Tutup" className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 px-6 py-5 mt-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={busy}
            className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer disabled:opacity-50"
          >
            Keluar &amp; buang draft
          </button>
          <button
            type="button"
            onClick={onStay}
            disabled={busy}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            Lanjut mengedit
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-md disabled:opacity-50"
          >
            Simpan lalu keluar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
