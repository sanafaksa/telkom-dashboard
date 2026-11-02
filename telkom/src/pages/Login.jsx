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
  AlertCircle,
  Loader2,
  KeyRound,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

      // Tahap 2: Animasi Pintu Otomatis Geser Kiri-Kanan (150ms setelah granted)
      setTimeout(() => {
        setAuthStatus('opening_up');

        // Tahap 3: Navigasi ke Dashboard di penghujung slide pintu terbuka (750ms)
        setTimeout(() => {
          navigate('/dashboard');
        }, 750);
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

  const isTransitioning = authStatus === 'opening_up';
  const isVerifying = authStatus === 'verifying';
  const isGranted = authStatus === 'granted' || authStatus === 'opening_up';

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F6F8FC] font-sans selection:bg-blue-500/25">
      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* UNDERNEATH PORTAL REVEAL (Tersingkap saat pintu geser terbuka)      */}
      {/* ==================================================================== */}
      <div
        className={`absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#F6F8FC] text-slate-800 p-6 select-none transition-all duration-700 ease-out ${
          isTransitioning ? 'scale-100 opacity-100' : 'scale-95 opacity-80'
        }`}
      >
        {/* Subtle Background Tech Grid */}
        <div className="absolute inset-0 login-grid-light opacity-60 pointer-events-none" />

        {/* Automatic Door Track Guide Rails (Top & Bottom) */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-200 via-blue-200 to-slate-200 border-b border-slate-300/50" />
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-slate-200 via-blue-200 to-slate-200 border-t border-slate-300/50" />

        <div className="relative flex flex-col items-center text-center max-w-md">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-10 bg-blue-400/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

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
            Selamat Datang di Solaris Portal
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
      {/* MAIN LOGIN STAGE (AUTOMATIC SLIDING DOORS - GESER KIRI & KANAN)     */}
      {/* ==================================================================== */}
      <div
        className={`relative z-10 min-h-screen w-full flex flex-col lg:flex-row overflow-hidden ${
          isTransitioning ? 'pointer-events-none' : ''
        }`}
      >
        {/* Overhead Door Track Guide (Top & Bottom High-Tech Rail) */}
        <div className="absolute top-0 inset-x-0 z-30 h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 z-30 h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

        {/* ================================================================= */}
        {/* LEFT DOOR WING: Enterprise Hero (Slides Left)                     */}
        {/* ================================================================= */}
        <div
          className={`relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-[#061438] via-[#0A266E] to-[#1242B5] text-white will-change-transform transition-transform duration-[750ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
            isTransitioning ? '-translate-x-full' : 'translate-x-0'
          }`}
          style={{
            boxShadow: isTransitioning
              ? '20px 0 45px rgba(0, 0, 0, 0.5), 3px 0 15px rgba(6, 182, 212, 0.6)'
              : 'none',
          }}
        >
          {/* Glowing Vertical Door Seam on the Right Edge (Splits Open) */}
          <div
            className={`absolute top-0 right-0 bottom-0 w-[2.5px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent pointer-events-none transition-all duration-300 z-20 ${
              isTransitioning
                ? 'opacity-100 shadow-[0_0_20px_#22d3ee,0_0_40px_#2563eb]'
                : 'opacity-40'
            }`}
          />
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

          {/* Top Brand */}
          <div className="relative z-10">
            <span className="text-2xl sm:text-3xl font-black tracking-widest text-white select-none">
              SOLARIS
            </span>
          </div>

          {/* Center Content: Headline & Visual Branding */}
          <div className="relative z-10 my-auto py-8">
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white mb-3">
              SOLARIS
            </h1>
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-white leading-snug">
              Solo Leadership And Regional Insight System
            </h2>
            <p className="mt-5 text-sm xl:text-base text-blue-100/80 leading-relaxed max-w-lg font-normal">
              Akses instan analitik eksekutif terintegrasi mencakup Hierarki Agenda, EDK Monitoring (NCX &amp; OBL), Analisis Kuadran Portofolio, serta tindak lanjut Support Needed.
            </p>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-5 border-t border-white/15 flex items-center justify-between text-xs text-blue-200/80">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>Enkripsi 256-Bit SSL • Telkom SSO Ready</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">created by (magang teams)</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT DOOR WING: Sleek Modern Login Container (Slides Right)      */}
        {/* ================================================================= */}
        <div
          className={`flex-1 lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] relative overflow-y-auto will-change-transform transition-transform duration-[750ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
            isTransitioning ? 'translate-x-full' : 'translate-x-0'
          }`}
          style={{
            boxShadow: isTransitioning
              ? '-20px 0 45px rgba(0, 0, 0, 0.3), -3px 0 15px rgba(6, 182, 212, 0.6)'
              : 'none',
          }}
        >
          {/* Glowing Vertical Door Seam on the Left Edge (Splits Open) */}
          <div
            className={`hidden lg:block absolute top-0 left-0 bottom-0 w-[2.5px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent pointer-events-none transition-all duration-300 z-20 ${
              isTransitioning
                ? 'opacity-100 shadow-[0_0_20px_#22d3ee,0_0_40px_#2563eb]'
                : 'opacity-40'
            }`}
          />
          {/* Subtle Grid on Light Side */}
          <div className="absolute inset-0 login-grid-light opacity-50 pointer-events-none" />

          {/* Ambient Corner Blur */}
          <div className="absolute top-0 right-0 size-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 size-60 bg-indigo-100/50 rounded-full blur-2xl pointer-events-none" />

          {/* Theme Toggle Button (Coming Soon) */}
          <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Mode Gelap (Coming Soon)"
              title="Mode Gelap (Coming Soon)"
              className="relative size-9 rounded-full border border-slate-200/80 bg-white/90 text-slate-600 hover:bg-white grid place-items-center cursor-pointer shadow-2xs hover:scale-105 active:scale-95 transition-all"
            >
              <Moon size={15} />
              <span className="absolute -top-1 -right-1 text-[7.5px] font-extrabold tracking-wider bg-amber-500 text-white px-1 py-[1px] rounded-full uppercase shadow-2xs leading-none">
                SOON
              </span>
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
                Solaris Portal
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#1447B8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              SOLARIS 
            </span>
          </div>

          {/* Centered Login Card */}
          <div className="relative z-10 max-w-[430px] w-full mx-auto my-auto py-2">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_20px_50px_rgba(8,62,158,0.08)] p-7 sm:p-9 transition-all">
              {/* Form Title & Badge */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/60 text-[#1447B8] text-xs font-bold mb-3 shadow-2xs">
                  <KeyRound size={13} className="text-[#1447B8]" />
                  <span>Portal Akses Solaris Dashboard</span>
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
                  Telkom witel solo (Jatengtimur)
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
                  <span className="font-bold text-[#1447B8]">it.support.@telkom.co.id</span>
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
