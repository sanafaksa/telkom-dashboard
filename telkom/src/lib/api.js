// Base URL API dari .env (VITE_API_BASE_URL). Default '/api' untuk deploy satu domain.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message ?? `Request gagal (${status})`);
    this.status = status;
    this.data = data; // 422 upload: { message, total_errors, errors: [{ row, messages[] }] }
  }
}

const CHALLENGE_KEY = 'hosting_challenge_reload';

// InfinityFree membalas challenge anti-bot (HTML, status 200) jika cookie __test kedaluwarsa.
function isHostingChallenge(res) {
  const type = res.headers.get('Content-Type') ?? '';
  return res.ok && type.includes('text/html');
}

function recoverFromChallenge() {
  if (!sessionStorage.getItem(CHALLENGE_KEY)) {
    sessionStorage.setItem(CHALLENGE_KEY, '1');
    window.location.reload();
  }
  throw new ApiError(0, {
    message: 'Sesi hosting kedaluwarsa. Halaman dimuat ulang, silakan ulangi upload.',
  });
}

function buildUrl(path, params) {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url;
}

function buildHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Event saat sesi idle berakhir. Halaman tidak di-reload agar data yang sedang dikerjakan tetap ada. */
export const SESSION_EXPIRED_EVENT = 'session-expired';

async function handle(res) {
  if (isHostingChallenge(res)) recoverFromChallenge();
  if (res.ok) {
    sessionStorage.removeItem(CHALLENGE_KEY);
    return res.status === 204 ? null : res.json();
  }

  // 401 pada endpoint non-auth = sesi berakhir (idle). Login/logout tidak memicu overlay.
  const isAuthPath = res.url ? new URL(res.url).pathname.includes('/auth/') : false;
  if (res.status === 401 && !isAuthPath) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response bukan JSON
  }

  // Token kedaluwarsa / dicabut / akun dinonaktifkan → bersihkan sesi lalu ke halaman login.
  if (res.status === 401 && localStorage.getItem('token')) {
    localStorage.removeItem('token');
    localStorage.removeItem('telkom_user');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }

  throw new ApiError(res.status, data);
}

async function send(method, path, body) {
  return handle(
    await fetch(buildUrl(path), {
      method,
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export const apiPut = (path, body) => send('PUT', path, body ?? {});
export const apiPatch = (path, body) => send('PATCH', path, body ?? {});
export const apiDelete = (path) => send('DELETE', path);

export async function apiGet(path, params) {
  return handle(await fetch(buildUrl(path, params), { headers: buildHeaders() }));
}

export async function apiPost(path, body) {
  const isForm = body instanceof FormData;
  return handle(
    await fetch(buildUrl(path), {
      method: 'POST',
      headers: buildHeaders(isForm ? {} : { 'Content-Type': 'application/json' }),
      body: isForm ? body : JSON.stringify(body ?? {}),
    }),
  );
}

/** POST body mentah (blob / potongan file), tanpa multipart. Header tambahan lewat `headers`. */
export async function apiPostRaw(path, blob, headers = {}) {
  return handle(
    await fetch(buildUrl(path), {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/octet-stream', ...headers }),
      body: blob,
    }),
  );
}

/** Download file (export / template). Nama file diambil dari header Content-Disposition. */
export async function apiDownload(path, params, fallbackName = 'download') {
  const res = await fetch(buildUrl(path, params), { headers: buildHeaders({ Accept: '*/*' }) });
  if (isHostingChallenge(res)) recoverFromChallenge();
  if (!res.ok) await handle(res);

  const cd = res.headers.get('Content-Disposition') ?? '';
  const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return filename;
}