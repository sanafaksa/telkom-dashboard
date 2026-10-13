import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  TrendingUp,
  AlertCircle,
  Loader2,
  KeyRound
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('executive.lead@telkom.co.id');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Silakan masukkan email atau NIK Telkom Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Silakan masukkan kata sandi.');
      return;
    }

    setLoading(true);
    // Simulasi proses login otentikasi
    setTimeout(() => {
      setLoading(false);
      // Simpan session info jika perlu
      localStorage.setItem('telkom_user', JSON.stringify({
        name: 'DU — Dashboard Utama',
        email: email,
        role: 'Executive Lead'
      }));
      navigate('/dashboard');
    }, 1000);
  };

  const handleQuickDemo = () => {
    setEmail('executive.lead@telkom.co.id');
    setPassword('password123');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('telkom_user', JSON.stringify({
        name: 'DU — Dashboard Utama',
        email: 'executive.lead@telkom.co.id',
        role: 'Executive Lead'
      }));
      navigate('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F4F7FC] text-slate-800 font-sans selection:bg-[#2563EB]/20">
      {/* ======================================================== */}
      {/* LEFT PANEL: Enterprise Branding & Hero (Desktop Only)     */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-[#0B1E48] via-[#103E99] to-[#1E52C2] text-white">
        {/* Subtle Ambient Decorative Glows */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 size-[500px] rounded-full bg-[#2563EB]/25 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 size-72 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        {/* Top Header / Brand Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/telkom-logo.png"
              alt="Telkom Indonesia Logo"
              className="h-10 object-contain brightness-0 invert"
            />
            <div className="h-6 w-px bg-white/20 mx-1" />
            <span className="text-xs font-semibold tracking-wider text-blue-200 uppercase">
              Regional 3
            </span>
          </div>

          <div className="inline-flex items-center gap-2 mt-8 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-blue-100 shadow-inner">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SSGS Executive Monitoring Portal • 2026</span>
          </div>
        </div>

        {/* Center Content: Headline & Floating KPI Metrics */}
        <div className="relative z-10 my-auto py-8">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
            Pantau Performa &amp; Eksekusi Agenda <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-200 to-white">
              Secara Terpadu &amp; Real-Time
            </span>
          </h1>

          <p className="mt-4 text-sm text-blue-100/90 leading-relaxed max-w-lg">
            Akses analitik eksekutif terintegrasi mencakup Hierarki Agenda, EDK Monitoring (NCX &amp; OBL), Analisis Kuadran, serta tindak lanjut Support Needed.
          </p>

          {/* Floating Metric Preview Cards */}
          <div className="grid grid-cols-2 gap-3.5 mt-8 max-w-lg">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg">
              <div className="flex items-center justify-between text-blue-200 text-xs font-medium">
                <span>Total Abonemen EDK</span>
                <TrendingUp size={15} className="text-emerald-300" />
              </div>
              <p className="text-xl font-black text-white mt-1">Rp 328,2 M</p>
              <p className="text-[11px] text-emerald-300 mt-0.5 font-medium">+8% dari periode lalu</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg">
              <div className="flex items-center justify-between text-blue-200 text-xs font-medium">
                <span>Cakupan Witel Terdata</span>
                <Building2 size={15} className="text-blue-200" />
              </div>
              <p className="text-xl font-black text-white mt-1">Solo, SMG, YOG, PWT</p>
              <p className="text-[11px] text-blue-200 mt-0.5">Seluruh Segmen Enterprise</p>
            </div>
          </div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-blue-200/80">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Terlindungi Enkripsi 256-bit &amp; Telkom SSO</span>
          </div>
          <span>v2.4.0 (Prod)</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Login Form                                  */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16">
        {/* Mobile Header Brand */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-slate-200">
          <img
            src="/telkom-logo.png"
            alt="Telkom Indonesia Logo"
            className="h-8 object-contain"
          />
          <span className="text-xs font-bold text-[#1D51BE] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Regional 3
          </span>
        </div>

        <div className="max-w-[420px] w-full mx-auto my-auto py-4">
          {/* Form Greeting */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[#1E50BA] text-xs font-bold mb-3">
              <KeyRound size={13} />
              <span>Portal Akses Eksekutif</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Silakan masukkan akun Telkom atau NIK Anda untuk mengakses dashboard operasional.
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email / NIK */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Telkom / NIK
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: executive.lead@telkom.co.id"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Kata Sandi
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Silakan hubungi IT Administrator atau Helpdesk Telkom Regional 3 untuk reset kata sandi.');
                  }}
                  className="text-[11px] font-semibold text-[#1E50BA] hover:text-blue-700 transition-colors"
                >
                  Lupa kata sandi?
                </a>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-[#1E50BA] focus:ring-[#2563EB] cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Ingat sesi saya di perangkat ini
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-xl bg-gradient-to-r from-[#1748B4] via-[#1E52C2] to-[#2563EB] hover:from-[#133C99] hover:to-[#1D4ED8] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#F4F7FC] px-3 text-slate-400 font-semibold tracking-wider">
                Akses Cepat Pengujian
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Masuk Otomatis Sebagai Eksekutif (Demo)</span>
          </button>

          {/* Help & Support note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-slate-400">
              Mengalami kendala otentikasi?{' '}
              <a
                href="#help"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Layanan Helpdesk Telkom Regional 3:\nEmail: it.support.reg3@telkom.co.id\nExt: 8812 / 8813');
                }}
                className="text-[#1E50BA] font-bold hover:underline"
              >
                Hubungi IT Helpdesk
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-slate-400 border-t border-slate-200/80">
          <p>© 2026 PT Telkom Indonesia (Persero) Tbk. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </div>
  );
}
