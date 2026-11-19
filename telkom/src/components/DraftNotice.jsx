import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileClock, X } from 'lucide-react';
import { DRAFT_CHANGED_EVENT, listDrafts } from '../lib/draft';

/**
 * Popup di area kanan atas saat dashboard dibuka (setelah login, reload, atau masuk ulang):
 * menampilkan draft terakhir yang belum disimpan. Klik popup = buka halaman itu dan
 * langsung membuka form / modal upload dengan isi draft yang dipulihkan.
 * Daftar ikut diperbarui saat draft dibuang, sehingga draft yang sudah dibuang tidak tampil lagi.
 */
export default function DraftNotice() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [dismissed, setDismissed] = useState([]); // key draft yang ditutup lewat X / sudah dibuka

  useEffect(() => {
    let alive = true;
    const load = () => {
      listDrafts().then((list) => {
        if (alive) setDrafts(list);
      });
    };
    load();
    window.addEventListener(DRAFT_CHANGED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(DRAFT_CHANGED_EVENT, load);
    };
  }, []);

  const shown = drafts.filter((d) => !dismissed.includes(d.key));
  if (shown.length === 0) return null;

  const [latest, ...others] = shown;
  const time = new Date(latest.savedAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const dismiss = () => setDismissed((prev) => [...prev, latest.key]);

  const restore = () => {
    dismiss();
    navigate(latest.route, { state: { openDraft: latest.key } });
  };

  return (
    <div className="fixed top-24 right-4 sm:right-6 z-9999 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-2xl border border-amber-200 shadow-2xl overflow-hidden">
      <button
        type="button"
        onClick={restore}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-amber-50/60 cursor-pointer"
      >
        <div className="size-9 shrink-0 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
          <FileClock size={18} />
        </div>
        <div className="flex-1 text-xs text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900">Draft terakhir belum disimpan</p>
          <p className="mt-0.5">
            {latest.label} · {time}
            {others.length > 0 ? ` (+${others.length} draft lain)` : ''}
          </p>
          <p className="mt-1.5 font-bold text-[#1447B8]">Klik untuk melanjutkan →</p>
        </div>
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
        title="Tutup"
      >
        <X size={15} />
      </button>
    </div>
  );
}
