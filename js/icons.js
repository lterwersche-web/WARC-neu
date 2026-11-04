/* =========================================================
   Icons

   Alle Icons sind kleine SVG-Zeichnungen (Linien statt Pixel).
   Vorteil: gestochen scharf auf jedem Display und die Farbe
   kommt automatisch aus CSS (stroke="currentColor").
   ========================================================= */

const PATHS = {
  /* ---------- Habit-Icons ---------- */
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  snowflake:
    '<path d="M12 2v20M2 12h20M6.5 6.5l11 11M17.5 6.5l-11 11"/><path d="m9 4 3 3 3-3M9 20l3-3 3 3M4 9l3 3-3 3M20 9l-3 3 3 3"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  droplet: '<path d="M12 2.7S6 9.2 6 14a6 6 0 0 0 12 0c0-4.8-6-11.3-6-11.3z"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  phoneOff: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2M3 3l18 18"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6.1"/>',
  heart:
    '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  cup: '<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',

  /* ---------- UI-Icons ---------- */
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  chart: '<path d="M6 20V11M12 20V4M18 20v-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  sliders:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
};

/** Diese Icons kann man für Habits auswählen (Reihenfolge = Reihenfolge im Raster). */
export const HABIT_ICONS = [
  'dumbbell', 'snowflake', 'book', 'droplet', 'ban',
  'moon', 'sun', 'activity', 'target', 'pen',
  'phoneOff', 'leaf', 'heart', 'cup', 'flame',
  'bolt', 'music', 'code', 'clock', 'star',
];

/** Deutsche Namen – damit Screenreader sagen können, was das Icon zeigt. */
export const ICON_LABELS = {
  dumbbell: 'Hantel', snowflake: 'Schneeflocke', book: 'Buch', droplet: 'Tropfen', ban: 'Verbot',
  moon: 'Mond', sun: 'Sonne', activity: 'Puls', target: 'Ziel', pen: 'Stift',
  phoneOff: 'Handy aus', leaf: 'Blatt', heart: 'Herz', cup: 'Tasse', flame: 'Flamme',
  bolt: 'Blitz', music: 'Musik', code: 'Code', clock: 'Uhr', star: 'Stern',
};

/**
 * Gibt das SVG für ein Icon als HTML-Text zurück.
 * Beispiel: icon('flame', { size: 16 })
 */
export function icon(name, { size = 24, stroke = 2, cls = '' } = {}) {
  const body = Object.prototype.hasOwnProperty.call(PATHS, name) ? PATHS[name] : PATHS.star;
  return `<svg class="icon${cls ? ` ${cls}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
