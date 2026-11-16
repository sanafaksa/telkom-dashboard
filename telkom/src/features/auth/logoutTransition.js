/**
 * Transisi keluar: dua daun pintu menutup dari kiri & kanan (kebalikan dari
 * animasi pintu terbuka saat login), lalu muncul tulisan "See you".
 * Dibuat dengan DOM biasa supaya bisa dipanggil dari mana saja (logout() bukan komponen React).
 */
const DOOR_MS = 750;
const HOLD_MS = 1100;
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function playLogoutTransition(name = '') {
  // Animasi selalu jalan, tidak mengikuti setelan reduced-motion OS/browser.
  const firstName = String(name).trim().split(/\s+/)[0] ?? '';

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow:hidden;font-family:Inter,system-ui,sans-serif;';

  const door = (side) => {
    const el = document.createElement('div');
    const left = side === 'left';
    el.style.cssText = [
      'position:absolute;top:0;bottom:0;width:50%',
      left ? 'left:0' : 'right:0',
      left
        ? 'background:linear-gradient(135deg,#061438 0%,#0A266E 55%,#1242B5 100%)'
        : 'background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 55%,#E2E8F0 100%)',
      `box-shadow:${left ? '3px' : '-3px'} 0 18px rgba(34,211,238,0.55)`,
      `transform:translateX(${left ? '-100%' : '100%'})`,
      `transition:transform ${DOOR_MS}ms ${EASE},opacity 250ms ease`,
      'will-change:transform',
    ].join(';');
    return el;
  };

  const leftDoor = door('left');
  const rightDoor = door('right');

  const message = document.createElement('div');
  message.style.cssText = [
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px',
    'opacity:0;transform:scale(0.94)',
    'transition:opacity 350ms ease,transform 350ms ease',
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText =
    'background:#fff;border:1px solid rgba(226,232,240,0.9);border-radius:28px;padding:30px 44px;text-align:center;box-shadow:0 24px 60px rgba(6,36,106,0.28);max-width:420px;';

  const title = document.createElement('div');
  title.textContent = 'See you! 👋';
  title.style.cssText = 'font-size:34px;font-weight:900;letter-spacing:-0.02em;color:#06246A;line-height:1.1;';

  const sub = document.createElement('div');
  sub.textContent = firstName ? `Sampai jumpa lagi, ${firstName}.` : 'Sampai jumpa lagi.';
  sub.style.cssText = 'margin-top:8px;font-size:13px;font-weight:500;color:#64748B;';

  const brand = document.createElement('div');
  brand.textContent = 'SOLARIS';
  brand.style.cssText = 'margin-top:16px;font-size:11px;font-weight:900;letter-spacing:0.35em;color:#2563EB;';

  card.append(title, sub, brand);
  message.append(card);
  overlay.append(leftDoor, rightDoor, message);
  document.documentElement.style.overflow = 'hidden'; // sembunyikan scrollbar selama pintu menutup
  document.body.append(overlay);

  // Paksa layout dulu supaya posisi awal ter-render, baru jalankan transisi.
  void overlay.offsetWidth;
  leftDoor.style.transform = 'translateX(0)';
  rightDoor.style.transform = 'translateX(0)';
  leftDoor.style.opacity = '1';
  rightDoor.style.opacity = '1';

  await sleep(DOOR_MS - 150);
  message.style.opacity = '1';
  message.style.transform = 'scale(1)';

  await sleep(HOLD_MS);
}
