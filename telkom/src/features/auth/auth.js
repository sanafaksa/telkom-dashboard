import { apiPost } from '../../lib/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'telkom_user';

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export const isLoggedIn = () => !!localStorage.getItem(TOKEN_KEY);

export const isAdmin = () => getUser()?.role === 'admin';

export async function login(loginId, password, remember = false) {
  const res = await apiPost('/auth/login', { login: loginId, password, remember });
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res.user;
}

/** Hapus token di server + lokal, lalu reload ke /login (sekalian membersihkan cache react-query). */
export async function logout() {
  try {
    await apiPost('/auth/logout');
  } catch {
    // token mungkin sudah kedaluwarsa; tetap lanjut keluar
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.assign('/login');
}