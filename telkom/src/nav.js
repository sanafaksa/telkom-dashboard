import {
  Home,
  LayoutDashboard,
  BarChart2,
  ClipboardList,
  Receipt,
  LayoutGrid,
  FileText,
  Users,
  ShieldCheck,
  KeyRound,
  ScrollText,
  SlidersHorizontal,
  Fingerprint,
  ShieldAlert,
  Database,
  Mail,
  Plug,
  HardDriveDownload,
  Activity,
  Terminal,
  UserCog,
} from 'lucide-react';
import { can } from './features/auth/auth';

/**
 * Satu sumber menu untuk sidebar, sidebar mini, pencarian, dan beranda.
 * `perm` (string | string[]) = permission yang dibutuhkan; tanpa `perm` = semua role.
 * Backend tetap memeriksa permission yang sama di setiap endpoint.
 */
export const NAV = [
  {
    section: 'Operasional',
    items: [
      { to: '/home', icon: Home, label: 'Beranda', desc: 'Dashboard sesuai role Anda', end: true },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Executive Overview', perm: 'dashboard.view' },
      { to: '/edk-monitoring', icon: BarChart2, label: 'EDK Monitoring', desc: 'Evaluasi Data Kinerja', perm: 'edk.view' },
      { to: '/monitoring-order-sjt', icon: ClipboardList, label: 'Monitoring Order SJT', desc: 'Monitoring order Witel Solo Jateng Timur', perm: 'order_sjt.view' },
      { to: '/koreksi-jurbal-psak', icon: Receipt, label: 'Koreksi & Jurbal PSAK', desc: 'Reverse, correction & koreksi per tipe PSAK', perm: 'psak.view' },
      { to: '/kuadran', icon: LayoutGrid, label: 'Kuadran SJT', desc: 'Analisis kuadran portofolio', perm: 'kuadran.view', kuadran: true },
      { to: '/support-needed', icon: FileText, label: 'MoM & Support Needed', desc: 'Minutes of Meeting & Support Needed', perm: 'mom.view' },
    ],
  },
  {
    section: 'Administrasi',
    items: [
      { to: '/admin/users', icon: Users, label: 'User Management', desc: 'Kelola akun pengguna', perm: 'users.view' },
      { to: '/admin/admins', icon: ShieldCheck, label: 'Admin Management', desc: 'Kelola Admin & Super Admin', perm: 'admins.manage' },
      { to: '/admin/roles', icon: KeyRound, label: 'Role & Permission', desc: 'Atur permission tiap role', perm: 'roles.manage' },
      { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs', desc: 'Riwayat aktivitas sistem', perm: ['audit.view', 'audit.view_all'] },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { to: '/admin/system-config', icon: SlidersHorizontal, label: 'System Configuration', desc: 'Pengumuman & mode pemeliharaan', perm: 'system.config' },
      { to: '/admin/auth-settings', icon: Fingerprint, label: 'Authentication Settings', desc: 'Sesi, rate limit & aturan password', perm: 'auth.settings' },
      { to: '/admin/security', icon: ShieldAlert, label: 'Security Center', desc: 'Login gagal & sesi aktif', perm: 'security.center' },
      { to: '/admin/database', icon: Database, label: 'Database Management', desc: 'Tabel, jumlah baris & migration', perm: 'database.manage' },
      { to: '/admin/email', icon: Mail, label: 'Email Configuration', desc: 'SMTP & email uji', perm: 'email.config' },
      { to: '/admin/api', icon: Plug, label: 'API Management', desc: 'API key integrasi', perm: 'api.manage' },
      { to: '/admin/backups', icon: HardDriveDownload, label: 'Backup & Restore', desc: 'Cadangkan & pulihkan data', perm: 'backup.manage' },
      { to: '/admin/monitoring', icon: Activity, label: 'System Monitoring', desc: 'Kesehatan server & aplikasi', perm: 'system.monitor' },
      { to: '/admin/dev-tools', icon: Terminal, label: 'Developer Tools', desc: 'Cache, log & daftar route', perm: 'dev.tools' },
    ],
  },
  {
    section: 'Akun',
    items: [{ to: '/profile', icon: UserCog, label: 'Profile Settings', desc: 'Data diri & sesi login' }],
  },
];

export const KUADRAN_SUB = [
  ['moving', 'Kuadran Moving'],
  ['witel', 'Witel Performance'],
  ['telda', 'Telda Performance'],
  ['segment', 'Segment Performance'],
];

export const allowed = (item) => !item.perm || can(...[].concat(item.perm));

/** Menu yang boleh dilihat pengguna saat ini, per seksi (seksi kosong dibuang). */
export const visibleNav = () =>
  NAV.map((s) => ({ ...s, items: s.items.filter(allowed) })).filter((s) => s.items.length > 0);
