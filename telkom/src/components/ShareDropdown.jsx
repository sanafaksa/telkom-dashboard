import { useState, useRef, useEffect } from 'react';
import { Share2, ChevronDown, Check, Image, Link2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * Converts any modern CSS color (oklch, oklab, color-mix, lch, lab) into standard rgb/rgba
 * using an offscreen 1x1 canvas so html2canvas 1.4.1 never fails or skips table rendering.
 */
function createCssColorSanitizer() {
  const cvs = document.createElement('canvas');
  cvs.width = 1;
  cvs.height = 1;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  const cache = new Map();

  const toRgb = (cssColor) => {
    if (!cssColor) return cssColor;
    if (cache.has(cssColor)) return cache.get(cssColor);
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = cssColor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const res =
        a === 0
          ? 'rgba(0, 0, 0, 0)'
          : a === 255
          ? `rgb(${r}, ${g}, ${b})`
          : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      cache.set(cssColor, res);
      return res;
    } catch {
      return 'rgb(100, 116, 139)';
    }
  };

  // Replace any oklch(...), oklab(...), color(...), lch(...), lab(...) function with rgb/rgba
  const sanitizeColorString = (str) => {
    if (!str || !/(oklch|oklab|color|lch|lab)\s*\(/i.test(str)) {
      return str;
    }
    return str.replace(/(?:oklch|oklab|color|lch|lab)\([^()]*\)/gi, (match) => toRgb(match));
  };

  return { toRgb, sanitizeColorString };
}

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
  'fill',
  'stroke'
];

/**
 * Captures a DOM element cleanly as a PNG blob by mounting an isolated clone at (0,0)
 * so html2canvas bounds are 100% exact and never shifted by other elements on the page.
 */
export async function captureElementToBlob(targetEl, backgroundColor = '#FFFFFF', { scale = 2 } = {}) {
  if (!targetEl) throw new Error('Target element not found');

  const { sanitizeColorString } = createCssColorSanitizer();

  // Measure full table/scroll width inside the target so wide tables are never clipped
  let maxInnerWidth = targetEl.scrollWidth || targetEl.offsetWidth || 1000;
  targetEl.querySelectorAll('table, .overflow-x-auto').forEach((el) => {
    if (el.scrollWidth > maxInnerWidth) {
      maxInnerWidth = el.scrollWidth + 56; // +56px card padding
    }
  });

  const captureWidth = Math.max(targetEl.offsetWidth || 0, maxInnerWidth);

  // Create an isolated stage at (0,0) behind the page so html2canvas bounds are (0,0,captureWidth,finalHeight)
  const stage = document.createElement('div');
  stage.setAttribute('data-capture-stage', 'true');
  stage.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${captureWidth}px;
    background: ${backgroundColor};
    padding: 16px;
    margin: 0;
    z-index: -9999;
    pointer-events: none;
    overflow: visible;
    box-sizing: border-box;
  `;

  const clone = targetEl.cloneNode(true);
  const origNodes = [targetEl, ...Array.from(targetEl.querySelectorAll('*'))];
  const clonedNodes = [clone, ...Array.from(clone.querySelectorAll('*'))];

  // Copy computed styles and sanitize any oklch/oklab/color() values to rgb/rgba
  clonedNodes.forEach((cNode, idx) => {
    const oNode = origNodes[idx];
    if (!oNode || !cNode.style) return;
    const cs = window.getComputedStyle(oNode);

    for (const prop of COLOR_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && /(oklch|oklab|color|lch|lab)\s*\(/i.test(val)) {
        cNode.style.setProperty(prop, sanitizeColorString(val), 'important');
      }
    }

    const boxShadow = cs.getPropertyValue('box-shadow');
    if (boxShadow && /(oklch|oklab|color|lch|lab)\s*\(/i.test(boxShadow)) {
      cNode.style.setProperty('box-shadow', sanitizeColorString(boxShadow), 'important');
    }

    const bgImage = cs.getPropertyValue('background-image');
    if (bgImage && /(oklch|oklab|color|lch|lab)\s*\(/i.test(bgImage)) {
      cNode.style.setProperty('background-image', sanitizeColorString(bgImage), 'important');
    }

    // Sync form values (input/select/textarea) into the clone
    if (oNode.tagName === 'SELECT' && cNode.tagName === 'SELECT') {
      cNode.value = oNode.value;
    } else if (oNode.tagName === 'INPUT' && cNode.tagName === 'INPUT') {
      cNode.value = oNode.value;
    }

    // Disable animations/transforms that can shift html2canvas rendering
    cNode.style.animation = 'none';
    cNode.style.transition = 'none';
  });

  // html2canvas menggambar background & border <tr> selebar baris penuh, sehingga menimpa
  // sel rowSpan dari baris sebelumnya (teks header terpotong / tercoret garis).
  // Pindahkan warna <tr> ke sel-selnya sendiri, lalu kosongkan background & border <tr>.
  clonedNodes.forEach((cNode, idx) => {
    if (cNode.tagName !== 'TR') return;
    const oNode = origNodes[idx];
    const trCs = window.getComputedStyle(oNode);
    const isClear = (c) => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
    const trBg = trCs.backgroundColor;
    const trBorderW = parseFloat(trCs.borderBottomWidth) || 0;
    const trBorder =
      trBorderW > 0 && trCs.borderBottomStyle !== 'none'
        ? `${trCs.borderBottomWidth} ${trCs.borderBottomStyle} ${sanitizeColorString(trCs.borderBottomColor)}`
        : null;

    Array.from(oNode.children).forEach((oCell, i) => {
      const cCell = cNode.children[i];
      if (!cCell) return;
      const cellCs = window.getComputedStyle(oCell);
      if (!isClear(trBg) && isClear(cellCs.backgroundColor)) {
        cCell.style.setProperty('background-color', sanitizeColorString(trBg), 'important');
      }
      if (trBorder && !(parseFloat(cellCs.borderBottomWidth) > 0)) {
        cCell.style.setProperty('border-bottom', trBorder, 'important');
      }
    });
    cNode.style.setProperty('background', 'transparent', 'important');
    cNode.style.setProperty('border', 'none', 'important');
  });

  clone.style.width = '100%';
  clone.style.maxWidth = 'none';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.margin = '0';

  clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-auto').forEach((el) => {
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
    el.style.width = '100%';
  });

  // Jangan ikut memotret menu dropdown / elemen yang ditandai ignore
  clone.querySelectorAll('[data-html2canvas-ignore]').forEach((el) => el.remove());

  stage.appendChild(clone);
  document.body.appendChild(stage);

  // html2canvas 1.4.1 mengukur baseline font memakai <img> 1x1 (data:image/gif) di dokumen ASLI.
  // Preflight Tailwind membuat img { display:block }, sehingga baseline salah dan semua teks
  // tergambar lebih rendah lalu terpotong. Paksa img pengukur itu inline selama capture saja.
  const metricsFix = document.createElement('style');
  metricsFix.setAttribute('data-capture-fix', 'true');
  metricsFix.textContent = 'img[src^="data:image/gif;base64,R0lGOD"]{display:inline !important;}';
  document.head.appendChild(metricsFix);

  try {
    // Allow browser 1 frame to lay out the isolated stage
    await new Promise((r) => requestAnimationFrame(r));
    const finalWidth = stage.offsetWidth || captureWidth;
    const finalHeight = stage.scrollHeight || stage.offsetHeight || 600;

    const canvas = await html2canvas(stage, {
      backgroundColor,
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      x: 0,
      y: 0,
      width: finalWidth,
      height: finalHeight,
      windowWidth: finalWidth,
      windowHeight: finalHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedStage) => {
        // Remove every other element in clonedDoc.body so ONLY clonedStage can ever be rendered
        Array.from(clonedDoc.body.children).forEach((child) => {
          if (child !== clonedStage) {
            child.remove();
          }
        });
        if (clonedStage) {
          clonedStage.style.position = 'fixed';
          clonedStage.style.left = '0px';
          clonedStage.style.top = '0px';
          clonedStage.style.zIndex = '999999';
        }
        clonedDoc.querySelectorAll('style').forEach((styleTag) => {
          if (styleTag.textContent && /(oklch|oklab|lch|lab)\s*\(/i.test(styleTag.textContent)) {
            styleTag.textContent = sanitizeColorString(styleTag.textContent);
          }
        });
      }
    });

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } finally {
    if (stage.parentNode) {
      stage.parentNode.removeChild(stage);
    }
    metricsFix.remove();
  }
}

export default function ShareDropdown({
  className = '',
  buttonLabel = 'Salin & Bagikan',
  captureSelector = '#edk-main-content',
  pictureTargets = null
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

  // Capture any selector or custom Canvas renderer as Picture (Copy to Clipboard + Fallback PNG Download)
  const handleCopySelectorAsPicture = async (
    selector,
    label = 'Tabel',
    bg = '#FFFFFF',
    renderBlob = null
  ) => {
    setOpen(false);
    setLoading(true);

    try {
      // Tunggu React menutup dropdown (2 frame) sebelum halaman di-clone
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      let blob = null;
      if (typeof renderBlob === 'function') {
        blob = await renderBlob();
      } else {
        const target =
          (selector && document.querySelector(selector)) ||
          (captureSelector && document.querySelector(captureSelector)) ||
          document.querySelector('main') ||
          document.body;

        blob = await captureElementToBlob(target, bg);
      }
      if (!blob) {
        showFeedback('Gagal membuat gambar screenshot');
        setLoading(false);
        return;
      }

      try {
        if (navigator.clipboard?.write && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showFeedback(`Gambar ${label} berhasil disalin ke clipboard!`, 'picture');
        } else {
          throw new Error('ClipboardItem not supported');
        }
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solaris-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showFeedback(`Gambar ${label} diunduh sebagai file PNG!`, 'picture');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Gagal mengambil gambar');
    } finally {
      setLoading(false);
    }
  };

  // 2. Copy Report Link
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

  const pictureOptions =
    Array.isArray(pictureTargets) && pictureTargets.length > 0
      ? pictureTargets.map((pt) => ({
          id: `pic_${pt.id}`,
          icon: Image,
          title: pt.title,
          subtitle: pt.subtitle,
          action: () =>
            handleCopySelectorAsPicture(
              pt.selector,
              pt.label || pt.title,
              pt.bg || '#FFFFFF',
              pt.renderBlob
            )
        }))
      : [
          {
            id: 'picture',
            icon: Image,
            title: 'Copy as Picture',
            subtitle: 'Screenshot otomatis seluruh halaman',
            action: () => handleCopySelectorAsPicture(captureSelector, 'Halaman', '#F6F8FC')
          }
        ];

  const menuOptions = [
    ...pictureOptions,
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
          data-html2canvas-ignore="true"
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
        <div data-html2canvas-ignore="true" className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <Check size={15} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
