const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message ?? `Request gagal (${status})`);
    this.status = status;
    this.data = data; // 422 upload: { message, total_errors, errors: [{ row, messages[] }] }
  }
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

async function handle(res) {
  if (res.ok) return res.status === 204 ? null : res.json();

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response bukan JSON
  }
  throw new ApiError(res.status, data);
}

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

/** Download file (export / template). Nama file diambil dari header Content-Disposition. */
export async function apiDownload(path, params, fallbackName = 'download') {
  const res = await fetch(buildUrl(path, params), { headers: buildHeaders({ Accept: '*/*' }) });
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