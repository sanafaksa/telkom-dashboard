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
  KeyRound,
  Sparkles,
  Layers,
  ChevronRight,
  Fingerprint,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('executive.lead@telkom.co.id');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'verifying' | 'granted' | 'opening_up'
  const [error, setError] = useState('');
  const [forgotModal, setForgotModal] = useState(false);

  const startLoginSequence = (targetEmail, roleTitle = 'Executive Lead') => {
    setError('');
    setAuthStatus('verifying');

    // Tahap 1: Verifikasi cepat kredensial (250ms)
    setTimeout(() => {
      setAuthStatus('granted');
      localStorage.setItem(
        'telkom_user',
        JSON.stringify({
          name: 'DU — Dashboard Utama',
          email: targetEmail,
          role: roleTitle
        })
      );

      // Tahap 2: Animasi Slide Ke Atas langsung berjalan (150ms)
      setTimeout(() => {
        setAuthStatus('opening_up');

        // Tahap 3: Navigasi ke Dashboard di penghujung slide (650ms)
        setTimeout(() => {
          navigate('/dashboard');
        }, 650);
      }, 150);
    }, 250);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Silakan masukkan email Telkom atau NIK Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Silakan masukkan kata sandi.');
      return;
    }
    startLoginSequence(email);
  };

  const handleQuickDemo = () => {
    setEmail('executive.lead@telkom.co.id');
    setPassword('password123');
    startLoginSequence('executive.lead@telkom.co.id', 'Executive Lead (Demo)');
  };

  const isTransitioning = authStatus === 'opening_up';
  const isVerifying = authStatus === 'verifying';
  const isGranted = authStatus === 'granted' || authStatus === 'opening_up';

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F6F8FC] font-sans selection:bg-blue-500/25">
      {/* ==================================================================== */}
      {/* UNDERNEATH PORTAL REVEAL (Tersingkap saat panel login slide ke atas) */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#F6F8FC] text-slate-800 p-6 select-none">
        <div className="relative flex flex-col items-center text-center max-w-md">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-10 bg-blue-400/15 rounded-full blur-3xl animate-pulse pointer-events-none" />

          {/* Logo Brand */}
          <div className="relative z-10 flex items-center justify-center size-20 rounded-2xl bg-white border border-slate-200/80 shadow-xl mb-5">
            <img
              src="/telkom-logo.png"
              alt="Telkom Logo"
              className="h-10 object-contain drop-shadow-sm"
            />
          </div>

          <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#1447B8] text-xs font-bold mb-3 shadow-2xs">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Otentikasi Berhasil • Membuka Dashboard</span>
          </div>

          <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
            Selamat Datang di SSGS Portal
          </h2>
          <p className="relative z-10 text-xs sm:text-sm text-slate-500 mb-6">
            Menyiapkan modul analitik eksekutif Regional 3...
          </p>

          {/* Smooth Loading Track */}
          <div className="relative z-10 w-56 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#1447B8] via-[#2563EB] to-cyan-400 rounded-full w-full animate-[beamShine_1s_infinite]" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAIN LOGIN STAGE (SLIDES UP ON SUCCESSFUL LOGIN)                     */}
      {/* ==================================================================== */}
      <div
        className={`relative z-10 min-h-screen w-full flex flex-col lg:flex-row transition-all will-change-transform shadow-2xl ${
          isTransitioning
            ? '-translate-y-full duration-[650ms] ease-[cubic-bezier(0.7,0,0.2,1)] opacity-95'
            : 'translate-y-0 duration-400 ease-out opacity-100'
        }`}
      >
        {/* Glowing Laser Border at the bottom edge during upward lift */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent shadow-[0_0_25px_#2563EB] pointer-events-none transition-opacity duration-200 ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* ================================================================= */}
        {/* LEFT PANEL: Enterprise Hero & Live Executive Pulse                */}
        {/* ================================================================= */}
        <div className="relative hidden lg:flex lg:w-1/2 xl:w-[54%] flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-[#061438] via-[#0A266E] to-[#1242B5] text-white">
          {/* Subtle Background Tech Grid */}
          <div className="absolute inset-0 login-grid-pattern opacity-40 pointer-events-none" />

          {/* Ambient Lighting Orbs */}
          <div
            className="absolute -top-24 -left-24 size-[420px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"
            style={{ animation: 'pulseGlow 7s infinite ease-in-out' }}
          />
          <div
            className="absolute bottom-10 right-10 size-[450px] rounded-full bg-cyan-400/15 blur-[120px] pointer-events-none"
            style={{ animation: 'pulseGlow 9s infinite ease-in-out' }}
          />
          <div className="absolute top-1/2 left-1/3 size-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

          {/* Top Brand & Indicator */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
                  <img
                    src="/telkom-logo.png"
                    alt="Telkom Indonesia Logo"
                    className="h-8 object-contain brightness-0 invert"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold tracking-wider text-white">
                      TELKOM INDONESIA
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/30 border border-blue-400/40 text-blue-200 uppercase">
                      Regional 3
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200/70 font-medium">
                    Jawa Tengah &amp; D.I. Yogyakarta
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-blue-100">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Data Sync</span>
              </div>
            </div>

            {/* Portal Badge */}
            <div className="inline-flex items-center gap-2.5 mt-8 px-4 py-1.5 rounded-full bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-lg shadow-black/10">
              <Sparkles size={14} className="text-cyan-300" />
              <span>SSGS Executive Monitoring Portal • 2026</span>
            </div>
          </div>

          {/* Center Content: Headline & Visual KPI Cards */}
          <div className="relative z-10 my-auto py-8">
            <h1 className="text-3xl xl:text-[40px] font-black tracking-tight leading-[1.18] text-white">
              Pantau Performa &amp; Eksekusi Agenda <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-white">
                Secara Terpadu &amp; Real-Time
              </span>
            </h1>

            <p className="mt-4 text-xs xl:text-sm text-blue-100/80 leading-relaxed max-w-lg">
              Akses instan analitik eksekutif terintegrasi mencakup Hierarki Agenda, EDK Monitoring (NCX &amp; OBL), Analisis Kuadran Portofolio, serta tindak lanjut Support Needed.
            </p>

            {/* Glassmorphic KPI Cards */}
            <div className="grid grid-cols-2 gap-3.5 mt-8 max-w-lg">
              {/* Card 1: EDK Abonemen */}
              <div className="group p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-xl hover:bg-white/[0.14] transition-all duration-300 hover:border-white/30">
                <div className="flex items-center justify-between text-blue-200 text-xs font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-blue-100">
                    <TrendingUp size={14} className="text-emerald-400" />
                    Total Abonemen EDK
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    +8.2% YoY
                  </span>
                </div>
                <p className="text-2xl font-black text-white tracking-tight mt-1">
                  Rp 328,2 M
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-blue-200/75">
                  <span>Target Q1 Tercapai</span>
                  <span className="font-bold text-cyan-300">100%</span>
                </div>
                <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full rounded-full w-full" />
                </div>
              </div>

              {/* Card 2: Cakupan Witel */}
              <div className="group p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-xl hover:bg-white/[0.14] transition-all duration-300 hover:border-white/30">
                <div className="flex items-center justify-between text-blue-200 text-xs font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-blue-100">
                    <Building2 size={14} className="text-cyan-300" />
                    Cakupan Operasional
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-200 border border-blue-300/30">
                    4 Witel
                  </span>
                </div>
                <p className="text-xl font-black text-white tracking-tight mt-1">
                  Solo, SMG, YOG, PWT
                </p>
                <p className="text-[11px] text-blue-200/80 mt-1 font-medium">
                  Seluruh Segmen Enterprise &amp; Government
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-[10px] text-emerald-300 font-semibold">100% Online &amp; Termonitor</span>
                </div>
              </div>
            </div>

            {/* Additional Feature Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-4 max-w-lg">
              {['NCX & OBL Reconciliation', 'Hierarki Agenda Level 1-4', 'Kuadran Bergerak'].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-blue-200/90 font-medium"
                >
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-5 border-t border-white/15 flex items-center justify-between text-xs text-blue-200/80">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>Enkripsi 256-Bit SSL • Telkom SSO Ready</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">v2.4.0 (Enterprise Prod)</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL: Sleek Modern Login Container                         */}
        {/* ================================================================= */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] relative overflow-y-auto">
          {/* Subtle Grid on Light Side */}
          <div className="absolute inset-0 login-grid-light opacity-50 pointer-events-none" />

          {/* Ambient Corner Blur */}
          <div className="absolute top-0 right-0 size-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 size-60 bg-indigo-100/50 rounded-full blur-2xl pointer-events-none" />

          {/* Theme Toggle Button */}
          <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              title={isDark ? 'Mode Terang (Klik untuk ganti)' : 'Mode Gelap (Klik untuk ganti)'}
              className={`size-9 rounded-full border grid place-items-center cursor-pointer shadow-2xs hover:scale-105 active:scale-95 transition-all ${
                isDark
                  ? 'border-slate-700 bg-slate-800/90 text-amber-400 hover:bg-slate-700'
                  : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-white'
              }`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Mobile Top Brand Header */}
          <div className="lg:hidden relative z-10 flex items-center justify-between pb-4 mb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <img
                src="/telkom-logo.png"
                alt="Telkom Indonesia Logo"
                className="h-8 object-contain"
              />
              <span className="text-xs font-bold text-slate-800 tracking-wide">
                SSGS Portal
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#1447B8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Regional 3
            </span>
          </div>

          {/* Centered Login Card */}
          <div className="relative z-10 max-w-[430px] w-full mx-auto my-auto py-2">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_20px_50px_rgba(8,62,158,0.08)] p-7 sm:p-9 transition-all">
              {/* Form Title & Badge */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/60 text-[#1447B8] text-xs font-bold mb-3 shadow-2xs">
                  <KeyRound size={13} className="text-[#1447B8]" />
                  <span>Portal Akses Eksekutif</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Selamat Datang
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Silakan masukkan email Telkom atau NIK Anda untuk mengakses dashboard operasional.
                </p>
              </div>

              {/* Error Box */}
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Main Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email / NIK */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Telkom / NIK
                  </label>
                  <div className="relative flex items-center group">
                    <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#1D56D6] transition-colors pointer-events-none">
                      <Mail size={17} />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isVerifying || isGranted}
                      placeholder="contoh: executive.lead@telkom.co.id"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 transition-all shadow-2xs font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotModal(true)}
                      className="text-[11px] font-semibold text-[#1447B8] hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative flex items-center group">
                    <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#1D56D6] transition-colors pointer-events-none">
                      <Lock size={17} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isVerifying || isGranted}
                      placeholder="Masukkan kata sandi Anda"
                      className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 transition-all shadow-2xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md transition-colors"
                      aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isVerifying || isGranted}
                      className="size-4 rounded border-slate-300 text-[#1447B8] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      Ingat sesi saya di perangkat ini
                    </span>
                  </label>
                </div>

                {/* Submit Button with Dynamic States */}
                <button
                  type="submit"
                  disabled={isVerifying || isGranted}
                  className={`w-full mt-3 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-[0.99] select-none ${
                    isGranted
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : isVerifying
                      ? 'bg-[#1447B8] text-white opacity-90 cursor-wait'
                      : 'bg-gradient-to-r from-[#1447B8] via-[#1D56D6] to-[#2563EB] hover:from-[#0E3A9E] hover:to-[#1D4ED8] text-white shadow-blue-600/25 hover:shadow-blue-600/40'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Memverifikasi Kredensial SSO...</span>
                    </>
                  ) : isGranted ? (
                    <>
                      <CheckCircle2 size={17} className="text-emerald-200" />
                      <span>Akses Diberikan • Membuka Portal...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                    Akses Cepat Pengujian
                  </span>
                </div>
              </div>

              {/* 1-Click Quick Demo Button */}
              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={isVerifying || isGranted}
                className="group w-full py-2.5 px-4 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 hover:from-blue-100/70 hover:to-indigo-100/60 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all shadow-2xs hover:border-blue-300 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-[#1447B8]">Masuk Otomatis Sebagai Eksekutif (Demo)</span>
                </div>
                <ChevronRight size={15} className="text-[#1447B8] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* IT Helpdesk Information */}
              <div className="mt-6 text-center">
                <p className="text-[11px] text-slate-500">
                  Mengalami kendala otentikasi?{' '}
                  <button
                    type="button"
                    onClick={() => setForgotModal(true)}
                    className="text-[#1447B8] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    Hubungi IT Helpdesk
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 pt-4 text-center text-xs text-slate-500 border-t border-slate-200/60">
            <p>© 2026 PT Telkom Indonesia (Persero) Tbk. Seluruh hak cipta dilindungi.</p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL HELPDESK / LUPA KATA SANDI                                     */}
      {/* ==================================================================== */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-[#1447B8] border border-blue-100">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bantuan Akun &amp; IT Helpdesk
                </h3>
                <p className="text-xs text-slate-500">
                  Telkom Regional 3 (Jateng &amp; D.I. Yogyakarta)
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5">
              <p className="leading-relaxed">
                Untuk menjaga standar keamanan data eksekutif, reset kata sandi dan pembukaan blokir akun dilakukan melalui saluran resmi IT SSO Telkom:
              </p>
              <div className="pt-2 border-t border-slate-200/60 space-y-1.5 font-medium text-slate-700">
                <div className="flex justify-between">
                  <span>Email Helpdesk:</span>
                  <span className="font-bold text-[#1447B8]">it.support.reg3@telkom.co.id</span>
                </div>
                <div className="flex justify-between">
                  <span>Extension Internal:</span>
                  <span className="font-bold text-slate-900">8812 / 8813 (Ext)</span>
                </div>
                <div className="flex justify-between">
                  <span>Jam Operasional:</span>
                  <span>24 Jam (Shifted Monitoring)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForgotModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
