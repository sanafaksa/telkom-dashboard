import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import Layout from './components/Layout';
import SessionExpiredOverlay from './components/SessionExpiredOverlay';
import DraftNotice from './components/DraftNotice';
import { can, isLoggedIn } from './features/auth/auth';

function RequireAuth({ children }) {
  const location = useLocation();
  return isLoggedIn() ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

const Forbidden = () => (
  <div className="p-16 text-center">
    <span className="inline-grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500 mb-4">
      <ShieldX size={26} />
    </span>
    <h1 className="text-2xl font-bold">403 — Akses ditolak</h1>
    <p className="text-slate-400 mt-2 text-sm">Role Anda tidak memiliki izin untuk membuka halaman ini.</p>
    <Link to="/home" className="btn btn-primary mt-5">Kembali ke Beranda</Link>
  </div>
);

/**
 * Guard tampilan per halaman. Hanya untuk UX: data tetap dilindungi backend,
 * jadi mengakali guard ini tidak memberi akses ke data apa pun.
 */
function Guard({ perm, children }) {
  return can(...[].concat(perm)) ? children : <Forbidden />;
}

const P = (n) => lazy(() => import(`./pages/${n}.jsx`));
const A = (n) => lazy(() => import(`./pages/admin/${n}.jsx`));

const Home = P('Home');
const Profile = P('Profile');
const Dashboard = P('Dashboard');
const Edk = P('Edk');
const MonitoringOrderSjt = P('MonitoringOrderSjt');
const KoreksiJurbalPsak = P('KoreksiJurbalPsak');
const Quadrant = P('Quadrant');
const Support = P('Support');
const Login = P('Login');

const Users = A('Users');
const Roles = A('Roles');
const AuditLogs = A('AuditLogs');
const SettingsPage = A('SettingsPage');
const Security = A('Security');
const DatabasePage = A('Database');
const ApiKeys = A('ApiKeys');
const Backups = A('Backups');
const Monitoring = A('Monitoring');
const DevTools = A('DevTools');

const NF = () => (
  <div className="p-16 text-center">
    <h1 className="text-3xl font-bold">404</h1>
    <p className="text-slate-400 mt-2">Halaman tidak ditemukan.</p>
  </div>
);

const guarded = (path, perm, element) => <Route path={path} element={<Guard perm={perm}>{element}</Guard>} />;

export default function App() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-400">Memuat…</p>}>
      <SessionExpiredOverlay />
      <Routes>
        {/* Halaman Login mandiri tanpa Layout Dashboard */}
        <Route path="/login" element={<Login />} />

        {/* Rute Dashboard utama yang dibungkus Layout */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Suspense fallback={<p className="p-8 text-center text-slate-400">Memuat…</p>}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />

                    {/* Semua role */}
                    <Route path="/home" element={<Home />} />
                    <Route path="/profile" element={<Profile />} />

                    {/* Operasional */}
                    {guarded('/dashboard', 'dashboard.view', <Dashboard />)}
                    {guarded('/edk-monitoring', 'edk.view', <Edk />)}
                    {guarded('/monitoring-order-sjt', 'order_sjt.view', <MonitoringOrderSjt />)}
                    {guarded('/koreksi-jurbal-psak', 'psak.view', <KoreksiJurbalPsak />)}
                    <Route path="/kuadran" element={<Navigate to="/kuadran/moving" replace />} />
                    {guarded('/kuadran/:view', 'kuadran.view', <Quadrant />)}
                    {guarded('/support-needed', 'mom.view', <Support />)}

                    {/* Administrasi */}
                    <Route path="/admin" element={<Navigate to="/home" replace />} />
                    {guarded('/admin/users', 'users.view', <Users key="users" scope="users" />)}
                    {guarded('/admin/admins', 'admins.manage', <Users key="admins" scope="admins" />)}
                    {guarded('/admin/roles', 'roles.manage', <Roles />)}
                    {guarded('/admin/audit-logs', ['audit.view', 'audit.view_all'], <AuditLogs />)}

                    {/* Sistem (Super Admin) */}
                    {guarded('/admin/system-config', 'system.config', <SettingsPage key="general" group="general" />)}
                    {guarded('/admin/auth-settings', 'auth.settings', <SettingsPage key="auth" group="auth" />)}
                    {guarded('/admin/email', 'email.config', <SettingsPage key="mail" group="mail" />)}
                    {guarded('/admin/security', 'security.center', <Security />)}
                    {guarded('/admin/database', 'database.manage', <DatabasePage />)}
                    {guarded('/admin/api', 'api.manage', <ApiKeys />)}
                    {guarded('/admin/backups', 'backup.manage', <Backups />)}
                    {guarded('/admin/monitoring', 'system.monitor', <Monitoring />)}
                    {guarded('/admin/dev-tools', 'dev.tools', <DevTools />)}

                    <Route path="*" element={<NF />} />
                  </Routes>
                </Suspense>
                <DraftNotice />
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </Suspense>
  );
}
