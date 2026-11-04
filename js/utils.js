/* =========================================================
   Kleine Helfer, die überall gebraucht werden.
   ========================================================= */

/**
 * Macht Text "sicher" für HTML.
 * Wenn jemand als Habit-Namen z. B. "<script>" eintippt, soll das als
 * Text angezeigt und NICHT als Code ausgeführt werden.
 */
export function esc(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (c) => map[c]);
}

/** Kurzes Vibrieren (funktioniert auf Android, iPhone ignoriert es einfach). */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* Kein Vibrationsmotor? Kein Problem. */
  }
}

/** "1 Tag" vs. "2 Tage" – Einzahl/Mehrzahl automatisch. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Zahl in einen Bereich zwingen, z. B. clamp(120, 0, 100) → 100 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Hat die Person "Bewegung reduzieren" in den Systemeinstellungen an? */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
