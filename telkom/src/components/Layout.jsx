import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import DotGlow from './DotGlow';
import { SystemBanners } from './SystemStatusGate';
import {
  Home,
  BarChart2,
  ClipboardList,
  Receipt,
  LayoutGrid,
  Folder,
  ArrowRight,
  FileText,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  BellRing,
  Check,
  X,
  MapPin,
  FileText as FileIcon,
  LayoutGrid as GridIcon,
  BarChart2 as KpiIcon,
  ArrowUpRight,
  Menu,
  PanelLeft,
  Calendar,
  LogOut,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getUser, logout, refreshUser, ROLE_LABEL, ROLE_TONE } from '../features/auth/auth';
import { visibleNav, KUADRAN_SUB } from '../nav';
import { loadSavedSupportData, fetchSupportFromApi } from '../data/supportParser';
import {
  buildNotifications,
  buildSupportSearchEntries,
  loadNotifState,
  saveNotifState
} from '../lib/supportInsights';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'U';

function SidebarItem({ to, icon: Icon, children, hasSub, isOpen, onToggle, end, isActiveOverride, showPlus }) {
  return (
    <div>
      <NavLink
        to={to}
        end={end}
        onClick={(e) => {
          if (hasSub && onToggle) {
            onToggle();
          }
        }}
        className={({ isActive }) => {
          const active = isActiveOverride !== undefined ? isActiveOverride : isActive;
          return `group flex items-center justify-between rounded-full px-4 py-2.5 text-[13px] transition-all select-none ${active
            ? 'bg-white text-[#06246A] shadow-sm font-semibold'
            : 'text-white hover:bg-white/10 hover:text-white font-normal'
            }`;
        }}
      >
        {({ isActive }) => {
          const active = isActiveOverride !== undefined ? isActiveOverride : isActive;
          return (
            <>
              <div className="flex items-center gap-3">
                {Icon && (
                  <Icon
                    size={17}
                    strokeWidth={2}
                    className={
                      active
                        ? 'text-[#06246A]'
                        : 'text-white group-hover:text-white'
                    }
                  />
                )}
                <span>{children}</span>
              </div>
              {showPlus && (
                <span className="text-white text-sm font-light leading-none">
                  +
                </span>
              )}
            </>
          );
        }}
      </NavLink>
    </div>
  );
}

function Sidebar({ close, onCollapse }) {
  const location = useLocation();
  const isKuadranRoute = location.pathname.startsWith('/kuadran');
  const [openKuadran, setOpenKuadran] = useState(false);
  // Super Admin & Admin: logo gradient biru. Role lain: logo putih.
  const isTopRole = ['super_admin', 'admin'].includes(getUser()?.role);

  return (
    <nav
      aria-label="Utama"
      className="relative isolate h-full flex flex-col p-4 pt-5 pb-5 select-none bg-gradient-to-b from-[#061438] via-[#0A266E] to-[#1242B5] text-white shadow-2xl rounded-[28px] overflow-hidden"
      style={{
        borderRadius: '28px',
        background: 'linear-gradient(180deg, #06246A 0%, #235CE5 100%)'
      }}
      onClick={close}
    >

    <DotGlow
      className="absolute inset-0 -z-10"
      spacing={24}
      radius={0.8}
      glowRadius={120}
      glowStrength={0.5}
      baseAlpha={0.14}
    />

      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-4 mb-1">
        <NavLink to="/home" className="flex items-center gap-2.5 group select-none py-1">
          <img
            src={isTopRole ? '/solaris-gradient-blue.svg' : '/solaris-white-transparent.svg'}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-8 w-auto shrink-0"
          />
          <span className="h-5 w-px bg-white/35 shrink-0" aria-hidden="true" />
          <span
            className={`text-base font-black tracking-wide leading-none transition-colors ${
              isTopRole
                ? 'bg-gradient-to-r from-[#F7FBFF] via-[#A9D0FF] to-[#68ACFF] bg-clip-text text-transparent'
                : 'text-white group-hover:text-blue-100'
            }`}
          >
            SOLARIS
          </span>
        </NavLink>
        {onCollapse && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            className="size-6 rounded-full bg-white text-[#06246A] shadow-md grid place-items-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Tutup sidebar"
            title="Tutup sidebar"
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Navigation Links (difilter sesuai permission role) */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2 space-y-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent]">
        {visibleNav().map((group, gi) => (
          <div key={group.section} className="space-y-1.5">
            {gi > 0 && (
              <p className="px-4 pt-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
                {group.section}
              </p>
            )}
            {group.items.map((item) =>
              item.kuadran ? (
                <div key={item.to}>
                  <SidebarItem
                    to={item.to}
                    icon={item.icon}
                    hasSub
                    showPlus
                    isOpen={openKuadran}
                    isActiveOverride={isKuadranRoute}
                    onToggle={() => setOpenKuadran(!openKuadran)}
                  >
                    {item.label}
                  </SidebarItem>

                  {openKuadran && (
                    <div className="ml-6 pl-3 border-l border-white/25 space-y-1 py-1 mt-1.5">
                      {KUADRAN_SUB.map(([k, l]) => (
                        <NavLink
                          key={k}
                          to={'/kuadran/' + k}
                          className={({ isActive }) =>
                            `group flex items-center gap-2 text-xs py-2 px-3.5 rounded-full transition-all ${isActive
                              ? 'text-[#1E50BA] font-bold bg-[#DCE7FC] shadow-xs'
                              : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive ? (
                                <ArrowRight size={14} strokeWidth={2.5} className="text-[#1E50BA] shrink-0" />
                              ) : (
                                <Folder size={14} className="text-white/85 group-hover:text-white shrink-0" />
                              )}
                              <span className="truncate">{l}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <SidebarItem key={item.to} to={item.to} icon={item.icon} end={item.end}>
                  {item.label}
                </SidebarItem>
              ),
            )}
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="shrink-0 pt-3.5 border-t border-white/20 flex items-center justify-between px-2 text-[11px]">
                <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
          title="Keluar dari akun"
        >
          <LogOut size={13} />
          <span>Keluar</span>
        </button>
        <span className="flex items-center gap-1.5 font-medium text-white/90">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-xs" />
          Created By NRF
        </span>
      </div>
    </nav>
  );
}

/* ── Mini Sidebar (collapsed) ────────────────────────────── */
function CollapsedSidebar({ onExpand }) {
  const location = useLocation();
  const isKuadranRoute = location.pathname.startsWith('/kuadran');
  const miniNav = visibleNav().flatMap((g) => g.items);

  return (
    <nav
      aria-label="Navigasi mini"
      className="h-full flex flex-col items-center py-4 px-2 gap-1 select-none"
      style={{
        background: 'white',
        borderRadius: '28px',
        boxShadow: '0 4px 24px 0 rgba(6,36,106,0.10)',
        border: '1px solid rgba(6,36,106,0.07)'
      }}
    >
      {/* Expand button */}
      <button
        onClick={onExpand}
        title="Buka Sidebar"
        aria-label="Buka sidebar"
        className="size-10 rounded-2xl grid place-items-center mb-3 cursor-pointer transition-all hover:scale-105 active:scale-95 overflow-hidden bg-white"
        style={{ boxShadow: '0 2px 8px rgba(6,36,106,0.15)' }}
      >
        <img
          src="/pngwing.com.png"
          alt="Telkom Indonesia"
          className="w-8 h-8 object-contain"
        />
      </button>

      {/* Nav icons */}
      <div className="flex flex-col gap-0.5 flex-1 min-h-0 w-full items-center overflow-y-auto overflow-x-hidden [scrollbar-width:none]">
        {miniNav.map(({ to, icon: Icon, label, end, kuadran: isKuadran }) => {
          const active = isKuadran ? isKuadranRoute : undefined;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) => {
                const on = active !== undefined ? active : isActive;
                return `relative group size-10 shrink-0 rounded-2xl grid place-items-center transition-all ${on
                  ? 'bg-[#EBF0FD] text-[#235CE5]'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-[#06246A]'
                  }`;
              }}
            >
              {({ isActive }) => {
                const on = active !== undefined ? active : isActive;
                return (
                  <>
                    <Icon size={18} strokeWidth={on ? 2.5 : 1.8} />
                    {/* Tooltip */}
                    <span
                      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity z-50"
                      style={{ background: '#06246A', boxShadow: '0 2px 8px rgba(6,36,106,0.18)' }}
                    >
                      {label}
                    </span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-5 h-px bg-slate-200 my-2" />

      {/* Logout */}
            <button
        type="button"
        onClick={logout}
        title="Keluar"
        className="group relative size-10 rounded-2xl grid place-items-center text-slate-400 hover:bg-red-50 hover:text-red-400 transition-all cursor-pointer"
      >
        <LogOut size={17} strokeWidth={1.8} />
        <span
          className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity z-50"
          style={{ background: '#06246A', boxShadow: '0 2px 8px rgba(6,36,106,0.18)' }}
        >
                    Keluar
        </span>
      </button>
    </nav>
  );
}

// Search index — data yang bisa dicari
const STATIC_SEARCH = [
  // Kuadran
  { type: 'Kuadran', label: 'Kuadran Moving', desc: 'Analisis pergerakan kuadran SJT', to: '/kuadran/moving' },
  { type: 'Kuadran', label: 'Witel Performance', desc: 'Performa per Witel', to: '/kuadran/witel' },
  { type: 'Kuadran', label: 'Telda Performance', desc: 'Performa per Telda', to: '/kuadran/telda' },
  { type: 'Kuadran', label: 'Segment Performance', desc: 'Performa per Segmen', to: '/kuadran/segment' },
  // Witel
  { type: 'Witel', label: 'Witel Yogyakarta', desc: 'Regional 3 — DIY', to: '/kuadran/witel' },
  { type: 'Witel', label: 'Witel Bali', desc: 'Regional 3 — Bali', to: '/kuadran/witel' },
  { type: 'Witel', label: 'Witel Suramadu', desc: 'Regional 3 — Jatim Utara', to: '/kuadran/witel' },
  { type: 'Witel', label: 'Witel Semarang', desc: 'Regional 3 — Jateng', to: '/kuadran/witel' },
  { type: 'Witel', label: 'Witel Jatim Barat', desc: 'Regional 3 — Jatim Barat', to: '/kuadran/witel' },
  { type: 'Witel', label: 'Witel Solo', desc: 'Regional 3 — Solo Raya', to: '/kuadran/witel' },
  // KPI
  { type: 'KPI', label: 'Revenue', desc: 'Pencapaian pendapatan regional', to: '/edk-monitoring' },
  { type: 'KPI', label: 'EDK Lanjut Complete', desc: 'Status EDK diselesaikan', to: '/edk-monitoring' },
  { type: 'KPI', label: 'EDK In Progress', desc: 'Status EDK sedang berjalan', to: '/edk-monitoring' },
  { type: 'KPI', label: 'Konfirmasi AM', desc: 'Konfirmasi Account Manager', to: '/edk-monitoring' },
  { type: 'KPI', label: 'Order SJT > 60 Hari', desc: 'Monitoring aging order > 60 hari SJT', to: '/monitoring-order-sjt' },
  { type: 'KPI', label: 'Posisi Milestone Order SJT', desc: 'Monitoring milestone per divisi & AM SJT', to: '/monitoring-order-sjt' },
  { type: 'KPI', label: 'Kuadran 1 — Tanpa Tagihan & Tanpa Usage', desc: 'Pelanggan KW1', to: '/kuadran/moving' },
  { type: 'KPI', label: 'Kuadran 4 — Dengan Tagihan & Dengan Usage', desc: 'Pelanggan KW4', to: '/kuadran/moving' },
];

// Pencarian hanya menampilkan tujuan yang boleh diakses role pengguna.
const SEARCH_PERM = [
  ['/kuadran', 'kuadran.view'],
  ['/edk-monitoring', 'edk.view'],
  ['/monitoring-order-sjt', 'order_sjt.view'],
];

function buildSearchIndex() {
  const groups = visibleNav();
  const paths = groups.flatMap((g) => g.items.map((i) => i.to));
  const pages = groups.flatMap((g) =>
    g.items.map((i) => ({ type: 'Halaman', label: i.label, desc: i.desc ?? g.section, to: i.to })),
  );
  const extra = STATIC_SEARCH.filter((item) => {
    const rule = SEARCH_PERM.find(([prefix]) => item.to.startsWith(prefix));
    return !rule || paths.includes(rule[0]);
  });
  return [...pages, ...extra];
}

const TYPE_ICON = {
  Halaman: FileIcon,
  Kuadran: GridIcon,
  Witel: MapPin,
  KPI: KpiIcon,
  Agenda: FileIcon,
  Witel: MapPin,
  UIC: KpiIcon,
  'Action Plan': FileIcon,
};

const TYPE_COLOR = {
  Halaman: 'text-[#06246A] bg-[#06246A]/10',
  Kuadran: 'text-[#235CE5] bg-[#235CE5]/10',
  Witel: 'text-[#1E50BA] bg-[#DCE7FC]',
  KPI: 'text-[#2563EB] bg-[#EBF0FD]',
  Agenda: 'text-[#0B1E48] bg-[#0B1E48]/10',
  Witel: 'text-[#1E50BA] bg-[#DCE7FC]',
  UIC: 'text-[#235CE5] bg-[#235CE5]/10',
  'Action Plan': 'text-[#06246A] bg-[#06246A]/10',
};

function formatDate(date) {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '');
}

export default function Layout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser);
  const userKey = user?.nip || user?.email || '';

  // Data MoM Support (cache lokal dulu, lalu database) jadi sumber pencarian dan notifikasi
  const [momItems, setMomItems] = useState(() => loadSavedSupportData());
  const [notifState, setNotifState] = useState(() => loadNotifState(userKey));
  useEffect(() => {
    let active = true;
    fetchSupportFromApi().then((items) => {
      if (!active || !Array.isArray(items)) return;
      setMomItems(items);
      // Pertama kali dibuka: anggap semua data yang ada sudah dilihat, supaya tidak dianggap "baru"
      setNotifState((prev) => {
        if (prev.lastSeenId !== null) return prev;
        const next = { ...prev, lastSeenId: buildNotifications(items).maxId };
        saveNotifState(userKey, next);
        return next;
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchIndex = useMemo(
    () => [...buildSearchIndex(), ...buildSupportSearchEntries(momItems)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [momItems, user]
  );

  const notifComputed = useMemo(
    () => buildNotifications(momItems, { lastSeenId: notifState.lastSeenId }),
    [momItems, notifState.lastSeenId]
  );
  const notifs = notifComputed.list
    .filter((n) => !notifState.dismissed.includes(n.id))
    .map((n) => ({ ...n, read: notifState.read.includes(n.id) }));

  const updateNotifState = (fn) =>
    setNotifState((prev) => {
      const next = fn(prev);
      saveNotifState(userKey, next);
      return next;
    });
  const openNotif = (n) => {
    updateNotifState((prev) => ({
      ...prev,
      read: prev.read.includes(n.id) ? prev.read : [...prev.read, n.id],
      ...(n.id.startsWith('new-') ? { lastSeenId: notifComputed.maxId } : {})
    }));
    setNotifOpen(false);
    navigate(n.to);
  };
  const markAllRead = () =>
    updateNotifState((prev) => ({
      ...prev,
      read: [...new Set([...prev.read, ...notifs.map((n) => n.id)])],
      lastSeenId: notifComputed.maxId
    }));
  const dismissNotif = (id) =>
    updateNotifState((prev) => ({ ...prev, dismissed: [...new Set([...prev.dismissed, id])] }));

  // Role & permission selalu diambil ulang dari server saat layout dimuat,
  // sehingga perubahan oleh Super Admin langsung berlaku tanpa login ulang.
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener('solaris:user', sync);
    refreshUser().catch(() => {});
    return () => window.removeEventListener('solaris:user', sync);
  }, []);
  const [d, setD] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [today] = useState(new Date());
  const notifRef = useRef(null);

  // Search state
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchResults = searchQ.trim().length > 0
    ? searchIndex.filter(item =>
      item.label.toLowerCase().includes(searchQ.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQ.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQ.toLowerCase())
    ).slice(0, 8)
    : [];

  const unreadCount = notifs.filter(n => !n.read).length;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Tutup notif dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`min-h-screen bg-[#F6F8FC] transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:pl-[84px]' : 'lg:pl-[272px]'
      }`}>
      {/* Sidebar — expanded */}
      <aside
        className={`fixed top-3.5 bottom-3.5 left-3.5 w-[252px] z-30 hidden lg:block transition-transform duration-300 ease-in-out ${collapsed ? '-translate-x-[calc(100%+1.5rem)]' : 'translate-x-0'
          }`}
      >
        <Sidebar onCollapse={() => setCollapsed(true)} />
      </aside>

      {/* Mini Sidebar — collapsed */}
      <aside
        className={`fixed top-3.5 bottom-3.5 left-3.5 w-[60px] z-30 hidden lg:block transition-all duration-300 ease-in-out ${collapsed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[calc(100%+1.5rem)] pointer-events-none'
          }`}
      >
        <CollapsedSidebar onExpand={() => setCollapsed(false)} />
      </aside>


      {d && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={() => setD(false)} />
          <aside className="absolute top-3 bottom-3 left-3 w-64 max-w-[calc(100vw-24px)]">
            <Sidebar close={() => setD(false)} />
          </aside>
        </div>
      )}

      {/* Header */}
      <header
        className={`sticky top-0 z-[60] px-4 md:px-8 h-16 flex items-center gap-3 transition-all duration-200 bg-[#F6F8FC] ${
          scrolled ? 'border-b border-slate-200/90 shadow-xs' : ''
        }`}
      >
        {/* Mobile menu button */}
        <button className="lg:hidden text-slate-600 shrink-0" aria-label="Buka menu" onClick={() => setD(true)}>
          <Menu size={20} />
        </button>

        {/* User profile dropdown pill */}
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100/70 transition-colors cursor-pointer"
            title="Profile Settings"
          >
            <span className="size-8 rounded-full bg-[#2563EB] text-white grid place-items-center text-xs font-bold shrink-0 shadow-xs">
              {initials(user?.name)}
            </span>
            <div className="hidden sm:block leading-tight text-left">
              <div className="flex items-center gap-1">
                <b className="text-xs font-bold text-slate-800">{user?.name ?? 'Pengguna'}</b>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    ROLE_TONE[user?.role] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {user?.role_label ?? ROLE_LABEL[user?.role] ?? user?.role ?? '-'}
                </span>
                <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <p className="text-[11px] text-slate-400">{user?.nip ? `NIP ${user.nip}` : (user?.email ?? '')}</p>
            </div>
          </button>
        </div>

        {/* Right Header items */}
        <div className="ml-auto flex items-center gap-2 min-w-0">
          {/* Search Bar */}
          <div className="relative hidden md:block min-w-0 shrink" ref={searchRef}>
            <label className={`flex items-center gap-2 border rounded-full px-3.5 py-1.5 w-48 lg:w-64 xl:w-80 text-xs transition-all ${searchOpen ? 'bg-white border-[#235CE5] shadow-sm shadow-[#235CE5]/10' : 'bg-slate-50/60 border-slate-200'
              }`}>
            <Search size={14} className="text-slate-400 shrink-0" />
              <input
                aria-label="Cari"
                placeholder="Search Regional, Witel, KPI..."
                className="bg-transparent outline-none w-full text-xs text-slate-700 placeholder:text-slate-400"
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearchOpen(false); setSearchQ(''); }
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    navigate(searchResults[0].to);
                    setSearchOpen(false); setSearchQ('');
                  }
                }}
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchOpen(false); }} className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer shrink-0">
                  <X size={12} />
                </button>
              )}
            </label>

            {/* Search Dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div
                className="absolute left-0 top-11 w-full bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                style={{ animation: 'fadeSlideDown 0.15s ease' }}
              >
                <ul className="py-1.5">
                  {searchResults.map((item, i) => {
                    const Icon = TYPE_ICON[item.type] || FileIcon;
                    const colorCls = TYPE_COLOR[item.type] || 'text-slate-500 bg-slate-100';
                    return (
                      <li key={i}>
                        <button
                          onClick={() => { navigate(item.to); setSearchOpen(false); setSearchQ(''); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <span className={`size-7 rounded-lg grid place-items-center shrink-0 ${colorCls}`}>
                            <Icon size={13} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${colorCls}`}>{item.type}</span>
                          <ArrowUpRight size={13} className="text-slate-300 shrink-0" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="px-4 py-2 border-t border-slate-50 text-[10px] text-slate-400">
                  Tekan <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">Enter</kbd> untuk hasil pertama · <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">Esc</kbd> untuk tutup
                </div>
              </div>
            )}

            {/* No results */}
            {searchOpen && searchQ.trim().length > 0 && searchResults.length === 0 && (
              <div
                className="absolute left-0 top-11 w-full bg-white rounded-2xl shadow-xl border border-slate-100 z-50 px-4 py-5 text-center"
                style={{ animation: 'fadeSlideDown 0.15s ease' }}
              >
                <p className="text-xs text-slate-400">Tidak ada hasil untuk <b className="text-slate-600">"{searchQ}"</b></p>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative shrink-0" ref={notifRef}>
            <button
              id="notif-bell-btn"
              aria-label="Notifikasi"
              title="Notifikasi"
              onClick={() => setNotifOpen(v => !v)}
              className={`relative size-9 rounded-full border grid place-items-center cursor-pointer transition-all ${notifOpen
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
            >
              {unreadCount > 0 ? <BellRing size={15} className="animate-[wiggle_1s_ease-in-out_infinite]" /> : <Bell size={15} />}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 ring-2 ring-white text-white text-[9px] font-bold grid place-items-center px-0.5">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div
                className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                style={{ animation: 'fadeSlideDown 0.15s ease' }}
              >
                {/* Header dropdown */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Notifikasi</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
                    >
                      Tandai semua dibaca
                    </button>
                  )}
                </div>

                {/* List notifikasi */}
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifs.length === 0 ? (
                    <li className="px-4 py-8 text-center text-xs text-slate-400">Tidak ada notifikasi</li>
                  ) : (
                    notifs.map(n => (
                      <li
                        key={n.id}
                        onClick={() => openNotif(n)}
                        className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`}
                      >
                        <span className={`mt-0.5 size-2 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs truncate ${!n.read ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.desc}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotif(n.id); }}
                          className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer mt-0.5"
                          title="Hapus"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))
                  )}
                </ul>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                  <button className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors">
                    Lihat semua notifikasi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle (Coming Soon) */}
          <div className="relative">
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              aria-label="Mode Gelap (Coming Soon)"
              title="Mode Gelap (Coming Soon)"
              className="relative size-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 grid place-items-center cursor-pointer transition-all duration-200 shrink-0 shadow-2xs hover:scale-105 active:scale-95"
            >
              <Moon size={15} className="text-slate-600" />
              <span className="absolute -top-1 -right-1 text-[7.5px] font-extrabold tracking-wider bg-amber-500 text-white px-1 py-[1px] rounded-full uppercase shadow-2xs leading-none">
                SOON
              </span>
            </button>
          </div>

          {/* Dynamic Date */}
          <span className="hidden xl:inline-flex shrink-0 items-center gap-2 text-xs border border-slate-200 dark:border-slate-700/80 rounded-full px-3.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium bg-white dark:bg-slate-800">
            <Calendar size={13} className="text-slate-400" />
            <span>{formatDate(today)}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <b className="font-semibold text-slate-800 dark:text-slate-100">{today.toLocaleDateString('id-ID', { weekday: 'long' })}</b>
          </span>
        </div>
      </header>

      <SystemBanners />

      <main className="p-4 md:p-8 max-w-[1440px] mx-auto page-enter">{children}</main>
    </div>
  );
}
