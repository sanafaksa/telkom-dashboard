// Draft lokal per pengguna: isian form (localStorage) dan file upload yang belum diproses (IndexedDB).
// Setiap draft yang tersimpan juga dicatat di "registri" supaya bisa ditampilkan lagi setelah reload / login ulang.
// Semua akses dibungkus try/catch; kalau storage tidak tersedia (mode privat, kuota penuh), halaman tetap jalan tanpa draft.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getUser } from '../features/auth/auth';

/**
 * Dipanggil di halaman yang punya draft. Jika pengguna datang dari notifikasi draft
 * (location.state.openDraft === key), onOpen dijalankan agar form / modal upload langsung terbuka
 * dengan isi draft yang sudah dipulihkan.
 */
export function useOpenDraftIntent(key, onOpen) {
  const location = useLocation();
  useEffect(() => {
    if (location.state?.openDraft === key) onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}

const PREFIX = 'draft';
const REGISTRY_KEY = '__registry';

// Draft yang ditampilkan di notifikasi. Key harus sama dengan yang dipakai saat simpan/hapus.
export const DRAFT_CATALOG = {
  'mom-support-form': { label: 'Input manual MoM & Support Needed', route: '/support-needed' },
  'edk-upload-files': { label: 'Upload file EDK Monitoring', route: '/edk-monitoring' },
  'monitoring-order-upload-files': { label: 'Upload file Monitoring Order SJT', route: '/monitoring-order-sjt' },
  'koreksi-psak-upload-file': { label: 'Upload Rekap Koreksi PSAK', route: '/koreksi-jurbal-psak' },
  'kuadran-upload-files': { label: 'Upload file Kuadran SJT', route: '/kuadran' }
};

function scopedKey(key) {
  const user = getUser();
  // Payload login memakai "nip" (bukan "nik"). Tanpa ini, user yang tidak punya email berbagi draft "anon".
  const owner = user?.email || user?.nip || 'anon';
  return `${PREFIX}:${owner}:${key}`;
}

/* ---------- Registri draft ---------- */

function readRegistry() {
  try {
    return JSON.parse(localStorage.getItem(scopedKey(REGISTRY_KEY))) ?? {};
  } catch {
    return {};
  }
}

function writeRegistry(reg) {
  try {
    localStorage.setItem(scopedKey(REGISTRY_KEY), JSON.stringify(reg));
  } catch {
    // abaikan
  }
}

function registerDraft(key) {
  if (!DRAFT_CATALOG[key]) return;
  const reg = readRegistry();
  reg[key] = { savedAt: new Date().toISOString() };
  writeRegistry(reg);
}

function unregisterDraft(key) {
  const reg = readRegistry();
  if (!(key in reg)) return;
  delete reg[key];
  writeRegistry(reg);
}

/**
 * Daftar draft yang masih ada (terbaru dulu). Draft file dicek ke IndexedDB,
 * jadi entri yang file-nya sudah hilang tidak ditampilkan.
 */
export async function listDrafts() {
  const reg = readRegistry();
  const entries = Object.entries(reg).filter(([key]) => DRAFT_CATALOG[key]);
  const valid = await Promise.all(
    entries.map(async ([key, meta]) => {
      const isFile = key.endsWith('-files') || key.endsWith('-file');
      const present = isFile ? (await loadDraftFiles(key)).length > 0 : !!loadDraft(key);
      return present ? { key, ...DRAFT_CATALOG[key], savedAt: meta.savedAt } : null;
    })
  );
  return valid.filter(Boolean).sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

/* ---------- Isian form (JSON) ---------- */

export function loadDraft(key, fallback = null) {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveDraft(key, value) {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify({ savedAt: new Date().toISOString(), value }));
    registerDraft(key);
  } catch {
    // kuota penuh / storage diblokir: abaikan
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(scopedKey(key));
    unregisterDraft(key);
  } catch {
    // abaikan
  }
}

/* ---------- File upload (IndexedDB) ---------- */

const DB_NAME = 'telkom-drafts';
const STORE = 'files';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req?.result ?? null);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Simpan daftar file yang dipilih di halaman upload. Array kosong dianggap menghapus draft. */
export async function saveDraftFiles(key, files) {
  if (!files.length) return clearDraftFiles(key);
  try {
    const records = files.map((f) => ({ name: f.name, type: f.type, lastModified: f.lastModified, blob: f }));
    await withStore('readwrite', (s) => s.put(records, scopedKey(key)));
    registerDraft(key);
  } catch {
    // abaikan: draft file hanya bonus
  }
}

/** Ambil kembali file draft sebagai File[] (kosong jika tidak ada). */
export async function loadDraftFiles(key) {
  try {
    const records = await withStore('readonly', (s) => s.get(scopedKey(key)));
    if (!Array.isArray(records)) return [];
    return records.map(
      (r) => new File([r.blob], r.name, { type: r.type, lastModified: r.lastModified })
    );
  } catch {
    return [];
  }
}

export async function clearDraftFiles(key) {
  try {
    await withStore('readwrite', (s) => s.delete(scopedKey(key)));
    unregisterDraft(key);
  } catch {
    // abaikan
  }
}
