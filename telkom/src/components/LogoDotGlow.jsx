import { useEffect, useRef } from 'react';

/*
 * DotGlow interaktif untuk panel login. Mengikuti "new ui login page.md":
 * - grid titik biasa yang menyala di sekitar kursor
 * - siluet logo Solaris (gradient biru, solaris-gradient-blue.svg) dari titik-titik halus;
 *   warna titik mengikuti gradasi logo, sparkle putih; titik logo menyala penuh saat kursor dekat
 * - pantulan cahaya (sheen) mengikuti kursor, hanya di dalam siluet logo
 * Canvas dipasang di dalam panel (bukan fixed), jadi koordinat dihitung relatif ke canvas.
 * Animasi hanya jalan di perangkat dengan mouse (pointer: fine); lainnya tampil statis.
 */

// Path dari solaris-gradient-blue.svg (viewBox 0 0 1417 1110). Perbarui jika file logo berubah.
const LOGO_VIEW = { w: 1417, h: 1110 };
const ORBIT_PATH =
  'M 1018,411 C 1116,407 1212,409 1267,449 C 1320,488 1302,557 1270,615 C 1210,725 1044,828 858,909 C 665,993 450,1032 279,1000 C 173,980 87,945 76,886 C 63,819 150,684 437,600 C 330,672 225,771 188,843 C 151,915 218,947 306,956 C 460,973 646,922 812,849 C 979,776 1125,671 1175,574 C 1215,496 1180,436 1018,411 Z';
const SPARKLE_PATHS = [
  'M 710,258 C 733,411 796,474 1021,516 C 796,558 733,621 710,774 C 687,621 624,558 399,516 C 624,474 687,411 710,258 Z',
  'M 1110,72 C 1125,160 1148,182 1256,199 C 1148,216 1125,238 1110,327 C 1095,238 1072,216 964,199 C 1072,182 1095,160 1110,72 Z',
];

const LOGO_SRC = '/solaris-gradient-blue.svg';

// Warna untuk panel biru gelap: titik putih redup, menyala biru di dekat kursor.
const CONFIG = {
  gridSpacing: 28,
  dotRadius: 1.3,
  glowRadius: 200,
  baseRgb: '255,255,255',
  baseAlpha: 0.22,
  glowRgb: '96,165,250',

  logoGridSpacing: 7,
  logoDotRadius: 1.5,
  logoIdleAlpha: 0.85,
  logoRevealRadius: 80,
  logoSheenRadius: 160,
  logoEase: 0.14,
};

export default function LogoDotGlow({ anchorRef, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Tanpa anchorRef, hanya grid DotGlow yang digambar (siluet logo dilewati)
    const anchor = anchorRef?.current ?? null;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const hitCtx = document.createElement('canvas').getContext('2d');
    const motionEnabled = window.matchMedia('(pointer: fine)').matches;

    let width = 0;
    let height = 0;
    let dots = [];
    let logoDots = [];
    let logoPath = null;
    let logoBox = null;
    let logoSheen = 0;
    const mouse = { x: -1000, y: -1000, tx: -1000, ty: -1000 };
    let raf = 0;
    let running = false;

    // Bangun ulang grid dan siluet logo sesuai ukuran canvas dan posisi anchor
    const build = () => {
      const c = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = c.width;
      height = c.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const a = anchor ? anchor.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      logoBox = { left: a.left - c.left, top: a.top - c.top, width: a.width, height: a.height };
      logoPath = null;
      logoDots = [];

      if (a.width > 0 && a.height > 0) {
        const matrix = new DOMMatrix([
          a.width / LOGO_VIEW.w, 0, 0, a.height / LOGO_VIEW.h, logoBox.left, logoBox.top,
        ]);
        const orbit = new Path2D(ORBIT_PATH);
        const sparkle = new Path2D();
        SPARKLE_PATHS.forEach((d) => sparkle.addPath(new Path2D(d), matrix));
        const orbitScaled = new Path2D();
        orbitScaled.addPath(orbit, matrix);

        logoPath = new Path2D();
        logoPath.addPath(orbitScaled);
        logoPath.addPath(sparkle);

        // Titik logo diambil dari piksel solaris-gradient-blue.svg yang sudah di-render ke ukuran anchor,
        // sehingga bentuk dan warnanya sama persis dengan file logo.
        if (anchor && logoReady) {
          const W = Math.round(a.width);
          const H = Math.round(a.height);
          const off = document.createElement('canvas');
          off.width = W;
          off.height = H;
          const octx = off.getContext('2d', { willReadFrequently: true });
          octx.drawImage(logoImg, 0, 0, W, H);
          const data = octx.getImageData(0, 0, W, H).data;
          const step = CONFIG.logoGridSpacing;
          for (let y = step / 2; y < H; y += step) {
            for (let x = step / 2; x < W; x += step) {
              const i = (Math.floor(y) * W + Math.floor(x)) * 4;
              const alpha = data[i + 3] / 255;
              if (alpha < 0.35) continue;
              logoDots.push({
                x: logoBox.left + x,
                y: logoBox.top + y,
                v: 0,
                a: alpha,
                rgb: `${data[i]},${data[i + 1]},${data[i + 2]}`,
              });
            }
          }
        }
      }

      dots = [];
      const cols = Math.ceil(width / CONFIG.gridSpacing);
      const rows = Math.ceil(height / CONFIG.gridSpacing);
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * CONFIG.gridSpacing;
          const y = j * CONFIG.gridSpacing;
          if (logoPath && hitCtx.isPointInPath(logoPath, x, y)) continue;
          dots.push({ x, y });
        }
      }
    };

    const drawBackgroundDots = () => {
      dots.forEach((dot) => {
        const d = Math.hypot(dot.x - mouse.x, dot.y - mouse.y);
        const glow = d < CONFIG.glowRadius ? Math.pow(1 - d / CONFIG.glowRadius, 2) : 0;

        ctx.beginPath();
        if (glow > 0) {
          ctx.fillStyle = `rgba(${CONFIG.glowRgb}, ${glow * 0.8})`;
          ctx.shadowBlur = glow > 0.5 ? 10 : 0;
          ctx.shadowColor = `rgba(${CONFIG.glowRgb}, ${glow})`;
          ctx.arc(dot.x, dot.y, CONFIG.dotRadius + glow * 1.5, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = `rgba(${CONFIG.baseRgb}, ${CONFIG.baseAlpha})`;
          ctx.shadowBlur = 0;
          ctx.arc(dot.x, dot.y, CONFIG.dotRadius, 0, Math.PI * 2);
        }
        ctx.fill();
      });
    };

    const drawLogo = (ease) => {
      if (!logoPath) return;
      const R = CONFIG.logoRevealRadius;
      ctx.shadowBlur = 0;

      logoDots.forEach((p) => {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const target = Math.min(1, Math.max(0, (R - d) / (R * 0.5)));
        p.v += (target - p.v) * CONFIG.logoEase;

        const alpha = p.a * (CONFIG.logoIdleAlpha + (1 - CONFIG.logoIdleAlpha) * p.v);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.rgb}, ${alpha})`;
        ctx.arc(p.x, p.y, CONFIG.logoDotRadius + p.v * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pantulan cahaya: hanya tampil saat kursor di atas siluet logo
      const onLogo = hitCtx.isPointInPath(logoPath, mouse.x, mouse.y) ? 1 : 0;
      logoSheen += (onLogo - logoSheen) * ease;
      if (logoSheen > 0.01) {
        const sr = CONFIG.logoSheenRadius;
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, sr);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * logoSheen})`);
        grad.addColorStop(0.4, `rgba(${CONFIG.glowRgb}, ${0.18 * logoSheen})`);
        grad.addColorStop(1, `rgba(${CONFIG.glowRgb}, 0)`);

        ctx.save();
        ctx.clip(logoPath);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = grad;
        ctx.fillRect(logoBox.left, logoBox.top, logoBox.width, logoBox.height);
        ctx.restore();
      }
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      mouse.x += (mouse.tx - mouse.x) * 0.1;
      mouse.y += (mouse.ty - mouse.y) * 0.1;
      drawBackgroundDots();
      drawLogo(CONFIG.logoEase);
    };

    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      loop();
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e) => {
      const c = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - c.left;
      mouse.ty = e.clientY - c.top;
    };
    const onLeave = (e) => {
      if (!e.relatedTarget) {
        mouse.tx = -1000;
        mouse.ty = -1000;
      }
    };
    const onVisibility = () => {
      if (!motionEnabled) return;
      if (document.hidden) stopLoop();
      else startLoop();
    };

    const ro = new ResizeObserver(() => {
      build();
      if (!motionEnabled) drawFrame();
    });
    // Gambar logo asli dipakai sebagai sumber titik; build ulang setelah file selesai dimuat
    const logoImg = new Image();
    let logoReady = false;
    logoImg.onload = () => {
      logoReady = true;
      build();
      if (!motionEnabled) drawFrame();
    };
    if (anchor) logoImg.src = LOGO_SRC;

    ro.observe(canvas);
    build();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerout', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    if (motionEnabled) startLoop();
    else drawFrame();

    return () => {
      stopLoop();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [anchorRef]);

  // translateZ(0): canvas di lapisan GPU sendiri, supaya tidak ikut ter-repaint saat lapisan logo (mask + filter) berubah
  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ transform: 'translateZ(0)' }}
      aria-hidden="true"
    />
  );
}
