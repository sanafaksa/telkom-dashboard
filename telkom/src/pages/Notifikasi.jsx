import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { getUser } from '../features/auth/auth';
import { fetchSupportFromApi, SUPPORT_CHANGED_EVENT } from '../data/supportParser';
import { buildNotifications, loadNotifState, saveNotifState } from '../lib/supportInsights';

export default function Notifikasi() {
  const navigate = useNavigate();
  const user = getUser();
  const userKey = user?.nip || user?.email || '';

  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState(() => loadNotifState(userKey));
  const [tab, setTab] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    document.title = 'Semua Notifikasi · SOLARIS';
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetchSupportFromApi().then((dbItems) => {
        if (active && Array.isArray(dbItems)) {
          setItems(dbItems);
          setLoaded(true);
        }
      });
    };
    load();
    window.addEventListener(SUPPORT_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(SUPPORT_CHANGED_EVENT, load);
    };
  }, []);

  // Daftar sama dengan dropdown notifikasi (aturan & status baca yang sama), tanpa batasan jumlah
  const list = useMemo(() => {
    const { list: all, maxId } = buildNotifications(items, { lastSeenId: state.lastSeenId, all: true });
    return { all: all.filter((n) => !state.dismissed.includes(n.id)).map((n) => ({ ...n, read: state.read.includes(n.id) })), maxId };
  }, [items, state]);

  const visible = tab === 'unread' ? list.all.filter((n) => !n.read) : list.all;
  const unreadCount = list.all.filter((n) => !n.read).length;

  const update = (fn) => {
    setState((prev) => {
      const next = fn(prev);
      saveNotifState(userKey, next);
      return next;
    });
    window.dispatchEvent(new Event('solaris:notif'));
  };

  const openNotif = (n) => {
    update((prev) => ({
      ...prev,
      read: prev.read.includes(n.id) ? prev.read : [...prev.read, n.id],
      ...(n.id.startsWith('new-') ? { lastSeenId: list.maxId } : {})
    }));
    navigate(n.to);
  };

  const markAllRead = () =>
    update((prev) => ({
      ...prev,
      read: [...new Set([...prev.read, ...list.all.map((n) => n.id)])],
      lastSeenId: list.maxId
    }));

  const dismiss = (id) => update((prev) => ({ ...prev, dismissed: [...new Set([...prev.dismissed, id])] }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Semua Notifikasi</h1>
          <p className="text-xs text-slate-500 mt-1">
            {list.all.length} notifikasi · {unreadCount} belum dibaca
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1.5">
        {[
          ['all', `Semua (${list.all.length})`],
          ['unread', `Belum dibaca (${unreadCount})`]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              tab === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {!loaded ? (
          <p className="py-12 text-center text-xs text-slate-400">Memuat notifikasi…</p>
        ) : visible.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Bell size={22} className="mx-auto mb-2 opacity-60" />
            <p className="text-xs">{tab === 'unread' ? 'Tidak ada notifikasi yang belum dibaca.' : 'Tidak ada notifikasi.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((n) => (
              <li
                key={n.id}
                onClick={() => openNotif(n)}
                className={`flex gap-3 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`}
              >
                <span className={`mt-1.5 size-2 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {n.title}
                    {n.urgent && <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold align-middle">MENDESAK</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 break-words">{n.desc}</p>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">{n.time}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(n.id);
                  }}
                  title="Hapus notifikasi"
                  className="shrink-0 self-start p-1 text-slate-300 hover:text-slate-500 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
