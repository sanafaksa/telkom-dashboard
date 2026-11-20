import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Wrench } from 'lucide-react';
import { apiGet } from '../lib/api';
import useBodyScrollLock from '../lib/useBodyScrollLock';
import { getUser, isLoggedIn, logout } from '../features/auth/auth';

const POLL_MS = 15000;

/** Status pemeliharaan publik; dipakai bersama oleh gate dan banner (cache react-query yang sama). */
export const systemStatusQuery = {
  queryKey: ['system', 'status'],
  queryFn: () => apiGet('/system/status'),
  refetchInterval: POLL_MS,
  refetchIntervalInBackground: true,
  retry: false,
};

// Super Admin & role Support tidak diblokir dan menerima pengingat untuk mematikan mode pemeliharaan.
const isExempt = () => ['super_admin', 'support'].includes(getUser()?.role);

const fmtClock = (ms) => new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const fmtCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Overlay pemblokiran: hanya untuk pengguna yang sudah login dan bukan Super Admin / Support
 * saat mode pemeliharaan aktif. Polling tiap 15 detik, tanpa perlu reload.
 */
export default function SystemStatusGate() {
  const q = useQuery(systemStatusQuery);
  const maint = q.data?.maintenance;
  useBodyScrollLock(!!maint?.active && isLoggedIn() && !isExempt());

  if (!maint?.active || !isLoggedIn() || isExempt()) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <Wrench size={24} />
        </span>
        <h2 className="text-lg font-extrabold text-slate-900">Sistem sedang pemeliharaan</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{maint.message}</p>
        <p className="mt-2 text-xs text-slate-400">Halaman ini akan terbuka kembali otomatis saat pemeliharaan selesai.</p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800 cursor-pointer"
        >
          <LogOut size={15} /> Keluar
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Notifikasi di dalam layout (tidak menutupi konten):
 * - Mode pemeliharaan aktif: banner untuk semua pengguna.
 * - Super Admin & Support: popup pengingat untuk menonaktifkan mode setelah pemeliharaan selesai.
 * - Pengingat terjadwal: banner kuning dengan hitung mundur.
 */
export function SystemBanners() {
  const q = useQuery(systemStatusQuery);
  const now = useNow();
  const { pathname } = useLocation();
  const [popupClosed, setPopupClosed] = useState(false);

  const data = q.data;
  if (!data) return null;

  // Waktu server dihitung dari respons terakhir, supaya hitung mundur tidak bergantung jam perangkat.
  const serverNow = Date.parse(data.server_time) + (now - q.dataUpdatedAt);
  const maint = data.maintenance;
  const reminder = data.reminder;
  const startsAt = reminder ? Date.parse(reminder.starts_at) : null;
  const remainingMs = startsAt ? startsAt - serverNow : 0;
  const showReminder = !maint.active && reminder && remainingMs > 0;
  const showPopup = maint.active && isExempt() && !popupClosed && pathname !== '/admin/maintenance';

  return (
    <>
      {maint.active && (
        <div className="mx-4 md:mx-8 mt-2 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          <Wrench size={14} className="mt-0.5 shrink-0" />
          <span>{maint.message || 'Sistem sedang dalam pemeliharaan.'}</span>
        </div>
      )}

      {showReminder && (
        <div className="mx-4 md:mx-8 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
          <Bell size={14} className="shrink-0" />
          <span>
            Pemeliharaan sistem dimulai pukul {fmtClock(startsAt)} (sisa {fmtCountdown(remainingMs)}).
          </span>
          {reminder.message && <span className="font-normal">{reminder.message}</span>}
        </div>
      )}

      {showPopup &&
        createPortal(
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/50">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                <Wrench size={22} />
              </span>
              <h2 className="text-base font-extrabold text-slate-900">Mode pemeliharaan masih aktif</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pengguna lain tidak dapat masuk. Jangan lupa nonaktifkan mode pemeliharaan setelah pekerjaan selesai.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPopupClosed(true)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Nanti saja
                </button>
                <Link
                  to="/admin/maintenance"
                  onClick={() => setPopupClosed(true)}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Buka Mode Pemeliharaan
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
