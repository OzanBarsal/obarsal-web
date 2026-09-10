export const OPENING_KEY = 'obarsal:opened';

type Connection = { saveData?: boolean; effectiveType?: string };

export function gate(key: string): void {
  let stored: string | null;
  try { stored = sessionStorage.getItem(key); } catch { return; }
  if (stored) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.visibilityState !== 'visible') return;
  const c = (navigator as Navigator & { connection?: Connection }).connection;
  if (c && (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')) return;
  try { sessionStorage.setItem(key, '1'); } catch { return; }
  document.documentElement.dataset.opening = 'playing';
}

// The function's own source is the inline script, so the gate is one definition, unit-tested here
// and shipped verbatim; nothing in it may close over this module.
export const openingGateScript = `(${gate.toString()})(${JSON.stringify(OPENING_KEY)})`;
