/* =========================================================
   Datum-Helfer

   Wir speichern jeden Tag als Text im Format "YYYY-MM-DD",
   z. B. "2026-11-04". Warum?
   - Man kann ihn einfach vergleichen: "2026-11-04" < "2026-11-05" ✔
   - Er eignet sich perfekt als Schlüssel (Key) in einem Objekt.
   - Keine Zeitzonen-Probleme, weil keine Uhrzeit drinsteckt.
   ========================================================= */

const LOCALE = 'de-DE';
const MS_PER_DAY = 86_400_000;

const pad = (n) => String(n).padStart(2, '0');

/** Date-Objekt → "2026-11-04" (in lokaler Zeit) */
export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Der heutige Tag als Key */
export function todayKey() {
  return toKey(new Date());
}

/** "2026-11-04" → Date-Objekt (Mitternacht, lokale Zeit) */
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Prüft, ob ein Text ein echtes Datum ist (z. B. "2026-02-31" ist es nicht). */
export function isValidKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toKey(parseKey(key)) === key;
}

/**
 * Fortlaufende Tagesnummer (Tage seit 1970).
 * Wir rechnen in UTC, damit die Zeitumstellung (Sommer/Winter)
 * keine 23- oder 25-Stunden-Tage reinschmuggelt.
 */
function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** Wie viele Tage liegen zwischen zwei Keys? diffDays("…-01", "…-04") → 3 */
export function diffDays(from, to) {
  return dayNumber(to) - dayNumber(from);
}

/** Tage dazu- oder abziehen: addDays("2026-11-04", 1) → "2026-11-05" */
export function addDays(key, n) {
  const date = parseKey(key);
  date.setDate(date.getDate() + n);
  return toKey(date);
}

/** Wochentag als Zahl: Montag = 0 … Sonntag = 6 */
export function weekdayIndex(key) {
  return (parseKey(key).getDay() + 6) % 7;
}

/** Tag im Monat: "2026-11-04" → 4 */
export function dayOfMonth(key) {
  return Number(key.slice(8, 10));
}

/** Eine stabile Zahl pro Tag (z. B. für das Zitat des Tages) */
export function daySeed(key) {
  return dayNumber(key);
}

/* ---------- Schön formatieren (auf Deutsch) ---------- */

const fmt = (options) => new Intl.DateTimeFormat(LOCALE, options);
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fFull = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const fShort = fmt({ day: 'numeric', month: 'short' });
const fWeekday = fmt({ weekday: 'long' });
const fWeekdayShort = fmt({ weekday: 'short' });
const fMonthShort = fmt({ month: 'short' });

const noDot = (text) => text.replace(/\.$/, '');

/** "Mittwoch, 4. November" */
export const formatLong = (key) => fLong.format(parseKey(key));
/** "4. November 2026" */
export const formatFull = (key) => fFull.format(parseKey(key));
/** "4. Nov" */
export const formatShort = (key) => noDot(fShort.format(parseKey(key)));
/** "Mittwoch" */
export const formatWeekday = (key) => fWeekday.format(parseKey(key));
/** "Mi" */
export const weekdayShort = (key) => noDot(fWeekdayShort.format(parseKey(key)));
/** "Nov" */
export const monthShort = (key) => noDot(fMonthShort.format(parseKey(key)));
