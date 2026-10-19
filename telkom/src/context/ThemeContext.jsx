import { createContext, useContext, useEffect, useState } from 'react';
import { Moon, X, Sparkles } from 'lucide-react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Pastikan light mode selalu aktif saat fitur dark mode dalam status coming soon
    const root = document.documentElement;
    root.classList.remove('dark');
    try {
      localStorage.setItem('telkom-theme', 'light');
    } catch {}
  }, []);

  const toggleTheme = () => {
    setToast('Fitur Mode Gelap (Dark Mode) segera hadir!');
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false, toggleTheme, showComingSoon: toggleTheme }}>
      {children}

      {/* Floating Coming Soon Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold pl-3.5 pr-4 py-3 rounded-2xl shadow-2xl border border-slate-700/70 flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-blue-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Moon size={15} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-xs">Mode Gelap Segera Hadir</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded-md border border-amber-400/30 tracking-wider">
                Coming Soon
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">
              Fitur tema gelap sedang dalam tahap pengembangan & penyempurnaan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer ml-1"
            aria-label="Tutup notifikasi"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
