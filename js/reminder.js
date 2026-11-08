/* =========================================================
   Erinnerung

   1. Kalender-Wecker: Wir bauen eine .ics-Datei. Das ist das
      Standard-Format für Kalender-Termine. Das iPhone importiert sie
      mit einem Tipp, und der Alarm klingelt dann jeden Tag, auch wenn
      die App zu ist. Ganz ohne Server.
   2. In-App-Hinweis: Ab der Uhrzeit zeigt "Heute" ein Banner,
      wenn noch Habits offen sind.
   ========================================================= */
import { dayProgress } from './stats.js';

const pad = (n) => String(n).padStart(2, '0');

/** Aktuelle Uhrzeit als "HH:MM" */
export function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Soll das Banner "Noch X offen" gerade angezeigt werden? */
export function nudgeFor(state, info, today, dateKey) {
  const { enabled, time } = state.reminder;
  if (!enabled || info.status !== 'active' || dateKey !== today) return null;
  if (nowTime() < time) return null;
  const p = dayProgress(state, today);
  return p.open > 0 ? { open: p.open, time } : null;
}

/* ---------- .ics bauen ---------- */

/** Sonderzeichen für das Kalender-Format "entschärfen" */
const icsText = (text) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Zeilen über 70 Zeichen umbrechen (Regel des .ics-Formats: Folgezeile beginnt mit Leerzeichen) */
function fold(line) {
  const parts = [];
  for (let i = 0; i < line.length; i += 60) parts.push((i ? ' ' : '') + line.slice(i, i + 60));
  return parts.join('\r\n');
}

const compactDate = (key) => key.replace(/-/g, '');

function utcStamp() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Täglicher Termin mit Alarm, vom ersten Tag bis zum Arc-Ende.
 * Die Zeit hat absichtlich KEINE Zeitzone ("floating"),
 * damit 20:00 immer 20:00 auf deinem Handy bleibt.
 */
export function buildIcs({ time, from, until, url }) {
  const [h, m] = time.split(':');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Winter Arc//Habit Tracker//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:winter-arc-${compactDate(from)}-${h}${m}@winter-arc.app`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART:${compactDate(from)}T${h}${m}00`,
    'DURATION:PT10M',
    `RRULE:FREQ=DAILY;UNTIL=${compactDate(until)}T235959`,
    `SUMMARY:${icsText('Winter Arc: Habits checken')}`,
    `DESCRIPTION:${icsText(`Zeit für deinen Winter Arc. Hak deine Habits ab.\n${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText('Winter Arc: Habits checken')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Lädt die .ics-Datei herunter. Safari fragt dann: "Zum Kalender hinzufügen?" */
export function downloadReminder(state, info, today) {
  const from = today > info.start ? today : info.start;
  const ics = buildIcs({
    time: state.reminder.time,
    from,
    until: info.end,
    url: `${location.origin}${location.pathname}`,
  });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'winter-arc-erinnerung.ics';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
