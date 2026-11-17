// Form popup dengan autosave draft (localStorage, per pengguna) dan status "belum disimpan ke database".
// Draft = salinan isian sementara di browser ini. Tombol Simpan = menulis ke database.

import { useEffect, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from './draft';

/** Bandingkan dua isian form. Urutan key diabaikan, null dan '' dianggap sama. */
export function isSameValues(a, b) {
  const normalize = (o) =>
    Object.keys(o ?? {})
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: o[k] ?? '' }), {});
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/**
 * @param draftKey  kunci draft (satu per notulensi / action plan)
 * @param baseline  isian dari database saat popup dibuka
 */
export function useDraftForm(draftKey, baseline) {
  const [base] = useState(() => baseline);
  const [init] = useState(() => {
    const stored = loadDraft(draftKey);
    const restorable = !!stored?.value && !isSameValues(stored.value, base);
    return {
      values: restorable ? { ...base, ...stored.value } : base,
      restored: restorable,
      savedAt: restorable ? stored.savedAt : null
    };
  });

  const [values, setValues] = useState(init.values);
  const [restored, setRestored] = useState(init.restored);
  const [savedAt, setSavedAt] = useState(init.savedAt);
  const dirty = !isSameValues(values, base);

  // Autosave: draft ditulis 400 ms setelah perubahan terakhir. Kalau sudah sama dengan database, draft dihapus.
  useEffect(() => {
    const t = setTimeout(() => {
      if (isSameValues(values, base)) {
        clearDraft(draftKey);
        setSavedAt(null);
      } else {
        saveDraft(draftKey, values);
        setSavedAt(new Date().toISOString());
      }
    }, 400);
    return () => clearTimeout(t);
  }, [values, base, draftKey]);

  // Tutup tab / reload saat masih ada perubahan: browser minta konfirmasi
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const discardDraft = () => {
    clearDraft(draftKey);
    setValues(base);
    setRestored(false);
    setSavedAt(null);
  };

  const markSaved = () => {
    clearDraft(draftKey);
    setRestored(false);
    setSavedAt(null);
  };

  return { values, setValues, base, dirty, restored, savedAt, discardDraft, markSaved };
}
