import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, LogIn, ShieldCheck } from 'lucide-react';
import { SESSION_EXPIRED_EVENT } from '../lib/api';

/**
 * Muncul saat sesi idle berakhir. Halaman tetap utuh (form, file upload, filter),
 * jadi pengguna cukup masuk lagi di tab lain lalu kembali dan mengulang aksinya.
 * Begitu token baru tersimpan (storage event dari tab login), overlay otomatis tertutup.
 */
export default function SessionExpiredOverlay() {
  const [expired, setExpired] = useState(false);
  const [restored, setRestored] = useState(false);

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

  if (!expired) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 text-slate-700">
        <div className="size-12 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center mb-4">
          <Clock size={22} />
        </div>
        <h3 className="font-extrabold text-lg text-slate-900">Sesi berakhir</h3>
        <p className="text-sm mt-2 leading-relaxed">
          Sesi dihentikan karena tidak ada aktivitas. Isian form dan file yang sedang kamu kerjakan
          <strong> tetap ada di halaman ini</strong>. Masuk lagi di tab baru, lalu kembali ke sini dan ulangi aksimu.
        </p>
        <a
          href="/login"
          target="_blank"
          rel="noopener"
          className="mt-5 w-full py-2.5 rounded-xl bg-[#1447B8] hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2"
        >
          <LogIn size={16} /> Masuk lagi (tab baru)
        </a>
        <p className="text-[11px] text-slate-500 mt-3 text-center">
          Halaman ini akan memulihkan sesi otomatis setelah kamu berhasil masuk.
        </p>
      </div>
    </div>,
    document.body
  );
}
