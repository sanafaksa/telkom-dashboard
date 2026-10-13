import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

const P = (n) => lazy(() => import(`./pages/${n}.jsx`));
const Dashboard = P('Dashboard');
const Edk = P('Edk');
const Quadrant = P('Quadrant');
const Support = P('Support');
const Login = P('Login');

const NF = () => (
  <div className="p-16 text-center">
    <h1 className="text-3xl font-bold">404</h1>
    <p className="text-slate-400 mt-2">Halaman tidak ditemukan.</p>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-400">Memuat…</p>}>
      <Routes>
        {/* Halaman Login mandiri tanpa Layout Dashboard */}
        <Route path="/login" element={<Login />} />

        {/* Rute Dashboard utama yang dibungkus Layout */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/edk-monitoring" element={<Edk />} />
                <Route path="/kuadran" element={<Navigate to="/kuadran/moving" replace />} />
                <Route path="/kuadran/:view" element={<Quadrant />} />
                <Route path="/support-needed" element={<Support />} />
                <Route path="*" element={<NF />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Suspense>
  );
}
