import { useEffect } from 'react';

// Hitungan lock aktif. Dipakai bersama supaya modal bertumpuk tidak saling
// membuka kunci scroll saat salah satunya ditutup.
let lockCount = 0;
let savedOverflow = '';

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
      }
    };
  }, [active]);
}
