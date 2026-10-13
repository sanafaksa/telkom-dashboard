import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  BarChart2,
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
  Menu,
  PanelLeft,
  Calendar,
  LogOut
} from 'lucide-react';

const sub = [
  ['moving', 'Kuadran Moving'],
  ['witel', 'Witel Performance'],
  ['telda', 'Telda Performance'],
  ['segment', 'Segment Performance']
];

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
          return `group flex items-center justify-between rounded-full px-4 py-2.5 text-[13px] transition-all select-none ${
            active
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

  return (
    <nav
      aria-label="Utama"
      className="h-full flex flex-col p-4 pt-5 pb-5 select-none bg-gradient-to-b from-[#06246A] to-[#235CE5] text-white shadow-2xl rounded-[28px] overflow-hidden"
      style={{
        borderRadius: '28px',
        background: 'linear-gradient(180deg, #06246A 0%, #235CE5 100%)'
      }}
      onClick={close}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-4 mb-1">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <img
            src="/telkom-logo.png"
            alt="Telkom Indonesia - the world in your hand"
            className="h-9 object-contain max-w-[155px] brightness-0 invert"
          />
        </NavLink>
        {onCollapse && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            className="size-7.5 rounded-full bg-white text-[#06246A] shadow-md grid place-items-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Tutup sidebar"
            title="Tutup sidebar"
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="space-y-1.5">
        <SidebarItem to="/dashboard" icon={Home} end>
          Dashboard
        </SidebarItem>

        <SidebarItem to="/edk-monitoring" icon={BarChart2}>
          EDK Monitoring
        </SidebarItem>

        <SidebarItem
          to="/kuadran"
          icon={LayoutGrid}
          hasSub
          showPlus
          isOpen={openKuadran}
          isActiveOverride={isKuadranRoute}
          onToggle={() => setOpenKuadran(!openKuadran)}
        >
          Kuadran SJT
        </SidebarItem>

        {openKuadran && (
          <div className="ml-6 pl-3 border-l border-white/25 space-y-1 py-1">
            {sub.map(([k, l]) => (
              <NavLink
                key={k}
                to={'/kuadran/' + k}
                className={({ isActive }) =>
                  `group flex items-center gap-2 text-xs py-2 px-3.5 rounded-full transition-all ${
                    isActive
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

        <SidebarItem to="/support-needed" icon={FileText} showPlus>
          Catatan MoM & Support
        </SidebarItem>
      </div>

      {/* Sidebar Footer */}
      <div className="mt-auto pt-3.5 border-t border-white/20 flex items-center justify-between px-2 text-[11px]">
        <NavLink
          to="/login"
          className="flex items-center gap-1.5 font-medium text-white/80 hover:text-white transition-colors"
          title="Keluar ke Halaman Login"
        >
          <LogOut size={13} />
          <span>Keluar</span>
        </NavLink>
        <span className="flex items-center gap-1.5 font-medium text-white/90">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-xs" />
          Active
        </span>
      </div>
    </nav>
  );
}

export default function Layout({ children }) {
  const [d, setD] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`min-h-screen bg-[#F6F8FC] transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:pl-0' : 'lg:pl-[272px]'}`}>
      <aside
        className={`fixed top-3.5 bottom-3.5 left-3.5 w-[252px] z-30 hidden lg:block transition-transform duration-300 ease-in-out ${
          collapsed ? '-translate-x-[calc(100%+1.5rem)]' : 'translate-x-0'
        }`}
      >
        <Sidebar onCollapse={() => setCollapsed(true)} />
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
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 px-4 md:px-8 h-16 flex items-center gap-3">
        <button className="lg:hidden text-slate-600" aria-label="Buka menu" onClick={() => setD(true)}>
          <Menu size={20} />
        </button>

        {collapsed && (
          <button
            className="hidden lg:grid size-9 rounded-lg border border-slate-200 place-items-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer mr-2"
            onClick={() => setCollapsed(false)}
            aria-label="Buka sidebar"
            title="Buka sidebar"
          >
            <PanelLeft size={17} />
          </button>
        )}

        {/* User profile dropdown pill */}
        <div className="relative group">
          <NavLink
            to="/login"
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100/70 transition-colors cursor-pointer"
            title="Keluar / Ganti Akun"
          >
            <span className="size-8 rounded-full bg-[#2563EB] text-white grid place-items-center text-xs font-bold shrink-0 shadow-xs">
              DU
            </span>
            <div className="hidden sm:block leading-tight text-left">
              <div className="flex items-center gap-1">
                <b className="text-xs font-bold text-slate-800">DU — Dashboard Utama</b>
                <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <p className="text-[11px] text-slate-400">executive.lead@telkom.co.id</p>
            </div>
          </NavLink>
        </div>

        {/* Right Header items */}
        <div className="ml-auto flex items-center gap-3">
          <label className="hidden md:flex items-center gap-2 border border-slate-200 rounded-full px-3.5 py-1.5 w-72 lg:w-80 bg-slate-50/60 text-xs focus-within:bg-white focus-within:border-blue-500 transition-colors">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              aria-label="Cari"
              placeholder="Search Regional, Witel, KPI..."
              className="bg-transparent outline-none w-full text-xs text-slate-700 placeholder:text-slate-400"
            />
          </label>

          <button
            aria-label="Notifikasi"
            title="Notifikasi"
            className="relative size-9 rounded-full border border-slate-200 grid place-items-center cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <span className="hidden sm:inline-flex items-center gap-2 text-xs border border-slate-200 rounded-full px-3.5 py-1.5 text-slate-700 font-medium bg-white">
            <Calendar size={13} className="text-slate-400" />
            <span>20 Jan, 2025</span>
            <span className="text-slate-300">|</span>
            <b className="font-semibold text-slate-800">Today</b>
            <ChevronDown size={12} className="text-slate-400" />
          </span>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1440px] mx-auto">{children}</main>
    </div>
  );
}
