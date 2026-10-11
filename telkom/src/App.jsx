import {lazy,Suspense} from 'react';import {Routes,Route,Navigate} from 'react-router-dom';import Layout from './components/Layout';
const P=n=>lazy(()=>import(`./pages/${n}.jsx`));
const Dashboard=P('Dashboard'),Edk=P('Edk'),Quadrant=P('Quadrant'),Support=P('Support');
const NF=()=><div className="p-16 text-center"><h1 className="text-3xl font-bold">404</h1><p className="text-mute mt-2">Halaman tidak ditemukan.</p></div>;
export default function App(){return <Layout><Suspense fallback={<p className="p-8 text-mute">Memuat…</p>}><Routes>
<Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="/dashboard" element={<Dashboard/>}/>
<Route path="/edk-monitoring" element={<Edk/>}/><Route path="/kuadran" element={<Navigate to="/kuadran/moving" replace/>}/>
<Route path="/kuadran/:view" element={<Quadrant/>}/><Route path="/support-needed" element={<Support/>}/><Route path="*" element={<NF/>}/></Routes></Suspense></Layout>}
