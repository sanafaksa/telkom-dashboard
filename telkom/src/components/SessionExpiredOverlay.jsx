import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../lib/useBodyScrollLock';
import { Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import { SESSION_EXPIRED_EVENT } from '../lib/api';

/**
 * Muncul saat sesi idle berakhir. Pengguna memuat ulang halaman untuk login lagi di tab yang sama.
 * Draft yang sudah tersimpan di localStorage / IndexedDB tetap ada dan dipulihkan oleh DraftNotice.
 * Begitu token baru tersimpan di tab lain (storage event), overlay otomatis tertutup.
 */
export default function SessionExpiredOverlay() {
  const [expired, setExpired] = useState(false);
  const [restored, setRestored] = useState(false);
  useBodyScrollLock(expired || restored);

  useEffect(() => {
    const onExpired = () => {
      setRestored(false);
      setExpired(true);
    };
    const onStorage = (e) => {
      if (e.key !== 'token') return;
      if (e.newValue) {
        setExpired(false);
        setRestored(true);
      } else {
        setExpired(true);
      }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!restored) return undefined;
    const t = setTimeout(() => setRestored(false), 5000);
    return () => clearTimeout(t);
  }, [restored]);

  if (restored) {
    return createPortal(
      <div className="fixed bottom-4 right-4 z-[9999] max-w-sm p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-start gap-3">
        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold">Sesi dipulihkan</p>
          <p className="text-white/85">Silakan ulangi aksi terakhir (simpan / upload). Data di halaman ini tidak hilang.</p>
        </div>
      </div>,
      document.body
    );
  }

  // Hapus sesi lama dulu, supaya setelah reload aplikasi mengarahkan ke /login (bukan kembali ke dashboard).
  const reloadToLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('telkom_user');
    window.location.reload();
  };

  if (!expired) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 text-slate-700">
        <div className="size-12 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center mb-4">
          <Clock size={22} />
        </div>
        <h3 className="font-extrabold text-lg text-slate-900">Sesi berakhir</h3>
        <p className="text-sm mt-2 leading-relaxed">
          Sesi dihentikan karena tidak ada aktivitas. Draft form dan file yang sudah tersimpan
          <strong> tetap aman</strong>. Muat ulang halaman untuk masuk lagi.
        </p>
        <button
          type="button"
          onClick={reloadToLogin}
          className="mt-5 w-full py-2.5 rounded-xl bg-[#1447B8] hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw size={16} /> Muat ulang &amp; masuk lagi
        </button>
        <p className="text-[11px] text-slate-500 mt-3 text-center">
          Draft yang sudah tersimpan akan dipulihkan otomatis setelah kamu berhasil masuk.
        </p>
      </div>
    </div>,
    document.body
  );
}
