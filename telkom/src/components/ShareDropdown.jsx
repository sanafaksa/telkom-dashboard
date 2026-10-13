import { useState, useRef, useEffect } from 'react';
import { Share2, ChevronDown, Check, Image, Grid3x3, Link2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function ShareDropdown({
  className = '',
  buttonLabel = 'Salin & Bagikan',
  tableSelector = 'table',
  captureSelector = '#edk-main-content'
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [dropdownAlign, setDropdownAlign] = useState('right');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // If closer to left screen edge than dropdown width (~290px), align left
      if (rect.left < 280) {
        setDropdownAlign('left');
      } else {
        setDropdownAlign('right');
      }
    }

    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const showFeedback = (msg, key = null) => {
    setFeedback(msg);
    if (key) setCopiedKey(key);
    setTimeout(() => {
      setFeedback(null);
      setCopiedKey(null);
    }, 2500);
  };

  // 1. Copy as Picture (html2canvas)
  const handleCopyPicture = async () => {
    setOpen(false);
    setLoading(true);
    try {
      const target =
        document.querySelector(captureSelector) ||
        document.querySelector('main') ||
        document.querySelector('.overflow-x-auto') ||
        document.body;

      const canvas = await html2canvas(target, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showFeedback('Gagal membuat gambar report');
          setLoading(false);
          return;
        }

        try {
          if (navigator.clipboard?.write && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showFeedback('Gambar report berhasil disalin ke clipboard!', 'picture');
          } else {
            throw new Error('ClipboardItem not supported');
          }
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-capture-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          showFeedback('Gambar report diunduh sebagai file PNG!', 'picture');
        } finally {
          setLoading(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setLoading(false);
      showFeedback('Gagal mengambil gambar report');
    }
  };

  // 2. Copy as Table (TSV + HTML format)
  const handleCopyTable = async () => {
    setOpen(false);
    try {
      const table = document.querySelector(tableSelector);
      if (!table) {
        showFeedback('Data tabel tidak ditemukan');
        return;
      }

      let tsv = '';
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach((cell) => {
          const text = cell.innerText.replace(/[\t\n]+/g, ' ').trim();
          rowData.push(text);
        });
        if (rowData.length > 0) {
          tsv += rowData.join('\t') + '\n';
        }
      });

      if (navigator.clipboard?.write && window.ClipboardItem) {
        const blobHtml = new Blob([table.outerHTML], { type: 'text/html' });
        const blobText = new Blob([tsv], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }

      showFeedback('Data tabel berhasil disalin (siap paste di Excel)!', 'table');
    } catch (err) {
      console.error(err);
      showFeedback('Gagal menyalin data tabel');
    }
  };

  // 3. Copy Report Link
  const handleCopyLink = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      showFeedback('Link halaman berhasil disalin!', 'link');
    } catch (err) {
      console.error(err);
      showFeedback('Gagal menyalin link');
    }
  };

  const menuOptions = [
    {
      id: 'picture',
      icon: Image,
      title: 'Copy as Picture',
      subtitle: 'Salin report sebagai gambar',
      action: handleCopyPicture
    },
    {
      id: 'table',
      icon: Grid3x3,
      title: 'Copy as Table',
      subtitle: 'Salin data tabel (Excel/CSV)',
      action: handleCopyTable
    },
    {
      id: 'link',
      icon: Link2,
      title: 'Copy Report Link',
      subtitle: 'Salin link halaman ini',
      action: handleCopyLink
    }
  ];

  const defaultBtnClass =
    'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer';

  return (
    <div className="relative inline-block" ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
        className={className || defaultBtnClass}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin text-[#2563EB]" />
        ) : copiedKey ? (
          <Check size={14} className="text-emerald-600" />
        ) : (
          <Share2 size={14} className="text-slate-500" />
        )}
        <span>{loading ? 'Memproses...' : copiedKey ? 'Tersalin' : buttonLabel}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu (Matches Screenshot) */}
      {open && (
        <div
          className={`absolute top-full mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12),0_4px_16px_-2px_rgba(0,0,0,0.06)] z-50 p-2 animate-[fadeIn_0.15s_ease-out] ${
            dropdownAlign === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="space-y-1">
            {menuOptions.map((opt) => {
              const IconComponent = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={opt.action}
                  className="w-full flex items-start gap-3.5 p-3 rounded-xl hover:bg-rose-50/60 hover:text-slate-900 transition-colors text-left cursor-pointer group"
                >
                  <div className="shrink-0 mt-0.5 text-slate-700 group-hover:text-slate-900 transition-colors">
                    <IconComponent size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 leading-snug group-hover:text-slate-900">
                      {opt.title}
                    </p>
                    <p className="text-[11px] text-slate-400 font-normal leading-snug mt-0.5">
                      {opt.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <Check size={15} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
