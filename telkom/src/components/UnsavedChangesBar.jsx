import { AlertTriangle } from 'lucide-react';

/** Konfirmasi saat popup akan ditutup padahal ada perubahan yang belum disimpan ke database. */
export default function UnsavedChangesBar({ onStay, onSave, onDiscard, busy = false }) {
  return (
    <div
      role="alertdialog"
      aria-label="Perubahan belum disimpan"
      className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-amber-50 border-y border-amber-200"
    >
      <div className="flex items-start gap-2 text-xs text-amber-900">
        <AlertTriangle size={15} className="shrink-0 mt-px text-amber-600" />
        <span>
          <b>Ada perubahan yang belum disimpan ke database.</b> Draft sudah tersimpan otomatis di browser ini.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStay}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          Lanjut mengedit
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer"
        >
          Keluar &amp; buang draft
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer disabled:opacity-50"
        >
          Simpan lalu keluar
        </button>
      </div>
    </div>
  );
}
