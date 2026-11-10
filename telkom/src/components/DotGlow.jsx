import { useEffect, useRef } from 'react';

export default function DotGlow({
  className = '',
  spacing = 28,          // jarak antar titik (px)
  radius = 1.2,          // ukuran titik dasar
  glowRadius = 160,      // jangkauan cahaya dari kursor (px)
  rgb = '56,189,248',    // warna titik (RGB, cyan-sky)
  baseAlpha = 0.18,      // redup saat tidak disentuh
  respectReducedMotion = false, // false = efek tetap jalan walau OS minta reduced motion
  glowStrength = 1,              // 1 = normal, makin kecil makin redup

}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    const mouse = { x: -9999, y: -9999 };   // posisi yang ditampilkan (dihaluskan)
    const target = { x: -9999, y: -9999 };  // posisi kursor asli
    let active = 0;                          // 0..1, fade in/out saat kursor masuk/keluar

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
    };

    const onLeaveWindow = (e) => {
      if (!e.relatedTarget) {
        target.x = -9999;
        target.y = -9999;
      }
    };

    const draw = () => {
      mouse.x += (target.x - mouse.x) * 0.15;
      mouse.y += (target.y - mouse.y) * 0.15;
      const inside = target.x > -9000 ? 1 : 0;
      active += (inside - active) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const offX = (width - (cols - 1) * spacing) / 2;
      const offY = (height - (rows - 1) * spacing) / 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = offX + i * spacing;
          const y = offY + j * spacing;

          let glow = 0;
          if (!reduceMotion && active > 0.01) {
            const d = Math.hypot(x - mouse.x, y - mouse.y);
            if (d < glowRadius) {
              const t = 1 - d / glowRadius;
              glow = t * t * active;
            }
          }

          ctx.beginPath();
          ctx.arc(x, y, radius + glow * 1.8 * glowStrength, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${baseAlpha + glow * 0.9 * glowStrength})`;
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerout', onLeaveWindow);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onLeaveWindow);
    };
    }, [spacing, radius, glowRadius, rgb, baseAlpha, glowStrength, respectReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
