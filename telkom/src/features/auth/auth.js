import { apiGet, apiPost } from '../../lib/api';
import { playLogoutTransition } from './logoutTransition';

const TOKEN_KEY = 'token';
const USER_KEY = 'telkom_user';

export const ROLE_LABEL = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  support: 'Support',
  user: 'User',
};

export const ROLE_TONE = {
  super_admin: 'bg-violet-100 text-violet-700',
  admin: 'bg-blue-100 text-blue-700',
  staff: 'bg-emerald-100 text-emerald-700',
  support: 'bg-amber-100 text-amber-700',
  user: 'bg-slate-100 text-slate-600',
};

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('solaris:user'));
}

export const isLoggedIn = () => !!localStorage.getItem(TOKEN_KEY);

/**
 * Cek permission untuk MENAMPILKAN menu/tombol saja.
 * Salinan di localStorage bisa diubah pengguna, jadi ini bukan pengaman:
 * setiap endpoint tetap memeriksa permission di backend dari role di database.
 */
export function can(...permissions) {
  const owned = getUser()?.permissions ?? [];
  return permissions.some((p) => owned.includes(p));
}

export const hasRole = (...roles) => roles.includes(getUser()?.role);

/** Dipertahankan untuk kode lama: "admin" = boleh upload/rollback EDK. */
export const isAdmin = () => can('edk.upload');

/** Ambil ulang role & permission terbaru dari server (dipanggil saat aplikasi dibuka). */
export async function refreshUser() {
  const user = await apiGet('/auth/me');
  saveUser(user);
  return user;
}

export async function login(nip, password, remember = false, turnstileToken = '') {
  const res = await apiPost('/auth/login', {
    nip,
    password,
    remember,
    'cf-turnstile-response': turnstileToken,
  });
  localStorage.setItem(TOKEN_KEY, res.token);
  saveUser(res.user);
  return res.user;
}

let loggingOut = false;

/**
 * Hapus token di server + lokal sambil memutar transisi pintu menutup ("See you"),
 * lalu reload ke /login (sekalian membersihkan cache react-query).
 */
export async function logout() {
  if (loggingOut) return;
  loggingOut = true;

  const token = localStorage.getItem(TOKEN_KEY);
  const name = getUser()?.name;

  // Pencabutan token di server berjalan bersamaan dengan animasi. Sengaja pakai fetch langsung
  // (bukan apiPost) supaya token yang sudah kedaluwarsa tidak memotong animasi dengan redirect 401.
  const revoke = token
    ? fetch(`${(import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')}/auth/logout`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(4000),
      }).catch(() => {})
    : Promise.resolve();

  await Promise.all([revoke, playLogoutTransition(name).catch(() => {})]);

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.assign('/login');
}
