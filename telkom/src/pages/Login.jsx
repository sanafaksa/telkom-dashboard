import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IdCard,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Moon,
  User
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { login } from '../features/auth/auth';
import HelpRequestForm from '../components/HelpRequestForm';

// Badge verified ala centang biru Twitter: lingkaran bergelombang dengan tanda centang putih.
const VERIFIED_POINTS = Array.from({ length: 120 }, (_, i) => {
  const t = (i / 120) * 2 * Math.PI;
  const r = 10 + 0.6 * Math.cos(12 * t);
  return `${(12 + r * Math.cos(t)).toFixed(2)},${(12 + r * Math.sin(t)).toFixed(2)}`;
}).join(' ');

function VerifiedBadge({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Terverifikasi" role="img">
      <polygon points={VERIFIED_POINTS} fill="#1D9BF0" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Login() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'verifying' | 'granted' | 'opening_up'
  const [error, setError] = useState('');
  const [forgotModal, setForgotModal] = useState(false);

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);   // elemen <div> tempat widget dirender
  const widgetIdRef = useRef(null);    // id widget dari turnstile.render()

  const logoRef = useRef(null);        // wrapper logo background (untuk glow kursor)

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.warn('VITE_TURNSTILE_SITE_KEY belum diisi di telkom/.env');
      return;
    }

    const renderWidget = () => {
      if (!turnstileRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          setTurnstileToken(token);
          setError('');
        },

      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    let script = document.querySelector('script[data-turnstile]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', renderWidget);
    return () => script.removeEventListener('load', renderWidget);
  }, []);

  const resetTurnstile = () => {
    setTurnstileToken('');
    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  // Animasi pintu setelah backend menyatakan login berhasil
  const startLoginSequence = () => {
    setAuthStatus('granted');

    setTimeout(() => {
      setAuthStatus('opening_up');
      setTimeout(() => {
        navigate('/home');
      }, 750);
    }, 150);
  };

  // Glow logo: dihitung dari posisi kursor di seluruh panel kiri (bukan dari elemen di bawah kursor),
  // jadi tetap akurat walaupun kursor sedang di atas teks. Area glow mengikuti kursor di dalam logo.
  const updateLogoGlow = (e) => {
    // Glow dot: posisi kursor relatif ke panel kiri (elemen yang menerima event)
    const panel = e.currentTarget;
    const pr = panel.getBoundingClientRect();
    panel.style.setProperty('--gx', `${e.clientX - pr.left}px`);
    panel.style.setProperty('--gy', `${e.clientY - pr.top}px`);
    panel.style.setProperty('--dotglow', '1');

    const el = logoRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.style.setProperty('--glow', inside ? '1' : '0');
  };

  const hideLogoGlow = (e) => {
    e.currentTarget.style.setProperty('--dotglow', '0');
    logoRef.current?.style.setProperty('--glow', '0');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Silakan masukkan NIP Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Silakan masukkan kata sandi.');
      return;
    }
    if (!turnstileToken) {
      setError(
        'Verifikasi keamanan belum selesai. Tunggu proses Cloudflare selesai, centang kotak "Verify you are human" bila muncul, lalu klik Masuk lagi.'
      );
      return;
    }


    setError('');
    setAuthStatus('verifying');

    try {
      await login(email.trim(), password, turnstileToken);
      startLoginSequence();
    } catch (err) {
      setAuthStatus('idle');
      resetTurnstile(); // token Turnstile hanya bisa dipakai sekali
      if (err?.status === 422) {
        setError(err.data?.errors?.nip?.[0] ?? Object.values(err.data?.errors ?? {})[0]?.[0] ?? err.message);
      } else if (err?.status === 429) {
        setError('Terlalu banyak percobaan login. Coba lagi dalam 1 menit.');
      } else if (err?.status) {
        setError(err.message);
      } else {
        setError('Tidak dapat terhubung ke server. Pastikan backend Laravel berjalan.');
      }
    }
  };


  const isTransitioning = authStatus === 'opening_up';
  const isVerifying = authStatus === 'verifying';
  const isGranted = authStatus === 'granted' || authStatus === 'opening_up';

  return (
    <div className="relative min-h-screen lg:h-screen w-full overflow-hidden bg-[#F6F8FC] font-sans selection:bg-blue-500/25">
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
          <div className="relative z-10 flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-[#061438] via-[#0A266E] to-[#1242B5] border border-white/15 shadow-xl mb-5">
            <img
              src="/solaris-gradient-blue.svg"
              alt="Solaris Logo"
              className="h-12 w-auto object-contain drop-shadow-sm"
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
        className={`relative z-10 min-h-screen lg:h-screen w-full flex flex-col lg:flex-row overflow-hidden ${
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
          onPointerMove={updateLogoGlow}
          onPointerLeave={hideLogoGlow}
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
          {/* Grid dot: dot dasar selalu terlihat; dot biru hanya muncul di sekitar kursor (CSS, tanpa canvas) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1.3px, transparent 1.6px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(191,219,254,1) 1.8px, rgba(96,165,250,0.9) 2.1px, transparent 2.5px)',
              backgroundSize: '28px 28px',
              WebkitMaskImage: 'radial-gradient(circle 200px at var(--gx, 50%) var(--gy, 50%), rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0.15) 60%, transparent 100%)',
              maskImage: 'radial-gradient(circle 200px at var(--gx, 50%) var(--gy, 50%), rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0.15) 60%, transparent 100%)',
              opacity: 'var(--dotglow, 0)',
              transition: 'opacity 300ms ease',
            }}
          />

          {/* Logo gradient biru sebagai background (gambar asli, tanpa dot).
              Saat hover, hanya area di bawah kursor yang menyala (lapisan glow di-mask radial). */}
          <div
            ref={logoRef}
            className="absolute top-1/2 left-1/2 w-[min(40vw,520px)]"
            style={{ transform: 'translate(-50%, -50%)', '--mx': '50%', '--my': '50%', '--glow': '0' }}
          >
            <img
              src="/solaris-gradient-blue.svg"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="block w-full h-auto opacity-0 select-none"
            />
            <img
              src="/solaris-gradient-blue.svg"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{
                opacity: 'var(--glow)',
                transition: 'opacity 300ms ease',
                filter: 'brightness(1.3) drop-shadow(0 0 22px rgba(96,165,250,0.7))',
                WebkitMaskImage: 'radial-gradient(ellipse 150px 115px at var(--mx) var(--my), rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.18) 60%, transparent 100%)',
                maskImage: 'radial-gradient(ellipse 150px 115px at var(--mx) var(--my), rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.18) 60%, transparent 100%)',
              }}
            />
          </div>

          {/* Center Content: Headline & Visual Branding */}
          <div className="relative z-10 max-w-xl my-auto py-8">
            <h1 className="flex items-center gap-4 xl:gap-5 mb-4" aria-label="SOLARIS">
              <img
                src="/solaris-gradient-blue.png"
                alt=""
                aria-hidden="true"
                className="h-14 xl:h-16 w-auto shrink-0 select-none"
                draggable={false}
              />
              <span className="h-12 xl:h-14 w-px bg-white/35 shrink-0" aria-hidden="true" />
              <span className="text-5xl xl:text-6xl font-black tracking-wide leading-none bg-gradient-to-r from-[#F7FBFF] via-[#A9D0FF] to-[#68ACFF] bg-clip-text text-transparent">
                SOLARIS
              </span>
            </h1>
            <h2 className="text-xl xl:text-2xl font-bold tracking-tight text-sky-300 leading-snug">
              Solo Leadership And Regional Insight System
            </h2>
            <p className="mt-5 text-sm xl:text-base text-blue-100/80 leading-relaxed max-w-lg font-normal">
              Akses instan analitik eksekutif terintegrasi mencakup Hierarki Agenda, EDK Monitoring (NCX &amp; OBL), Analisis Kuadran Portofolio, serta tindak lanjut Support Needed.
            </p>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-5 border-t border-white/15 flex items-center justify-between text-xs text-blue-200/80">
            <div className="flex items-center gap-2">
              <VerifiedBadge size={16} className="shrink-0" />
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">created by NRF</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT DOOR WING: Sleek Modern Login Container (Slides Right)      */}
        {/* ================================================================= */}
        <div
          className={`flex-1 lg:w-1/2 flex flex-col justify-between p-6 sm:p-8 lg:px-10 lg:py-6 xl:px-14 xl:py-6 bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] relative overflow-y-auto will-change-transform transition-transform duration-[750ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
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
            <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18)] p-6 sm:p-7 transition-all">
              {/* Form Title & Badge */}
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#1447B8] text-xs font-semibold mb-4">
                  <KeyRound size={13} className="text-[#1447B8]" />
                  <span>Portal Akses Solaris Dashboard</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Selamat Datang
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Silakan masuk dengan NIP dan kata sandi Anda. Dashboard yang tampil mengikuti role akun.
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
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Email / NIK */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    NIP
                  </label>
                  <div className="relative flex items-center group">
                    <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#1D56D6] transition-colors pointer-events-none">
                      <IdCard size={17} />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isVerifying || isGranted}
                      placeholder="Masukkan NIP Anda"
                      autoComplete="username"
                      inputMode="numeric"
                      className="w-full pl-11 pr-12 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 transition-all font-medium"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute right-3 size-6 rounded-full bg-slate-200 text-slate-600 grid place-items-center pointer-events-none"
                    >
                      <User size={13} />
                    </div>
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
                      autoComplete="current-password"
                      className="w-full pl-11 pr-12 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 transition-all font-medium"
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

                {/* Cloudflare Turnstile */}
                <div ref={turnstileRef} className="flex justify-center" />

                {/* Submit Button with Dynamic States */}
                <button
                  type="submit"
                  disabled={isVerifying || isGranted}
                  className={`w-full mt-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-slate-900/10 active:scale-[0.99] select-none ${
                    isGranted
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : isVerifying
                      ? 'bg-[#1447B8] text-white opacity-90 cursor-wait'
                      : 'bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155]'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Memverifikasi NIP & kata sandi...</span>
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
              <div className="mt-4 text-center">
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
          <div className="relative z-10 pt-3 text-center text-xs text-slate-500 border-t border-slate-200/60">
            <p>© 2026 PT Telkom Indonesia (Persero) Tbk. Seluruh hak cipta dilindungi.</p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* THEME TOGGLE (pojok kanan atas halaman; mode gelap menyusul)         */}
      {/* ==================================================================== */}
      <div className="absolute top-5 right-5 z-40">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Mode Gelap (Coming Soon)"
          title="Mode Gelap (Coming Soon)"
          className="relative size-10 rounded-full border border-slate-200 bg-white/80 text-slate-600 hover:bg-white grid place-items-center cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all"
        >
          <Moon size={16} />
          <span className="absolute -top-1 -right-1 text-[7.5px] font-extrabold tracking-wider bg-amber-500 text-white px-1 py-[1px] rounded-full uppercase shadow-sm leading-none">
            SOON
          </span>
        </button>
      </div>


      {/* ==================================================================== */}
      {/* MODAL HELPDESK / LUPA KATA SANDI                                     */}
      {/* ==================================================================== */}
      {forgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
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

            <HelpRequestForm />

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5">
              <p className="leading-relaxed">
                Kata sandi dibuat dan direset oleh Admin atau Super Admin SOLARIS. Hubungi administrator Anda, atau saluran berikut:
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
