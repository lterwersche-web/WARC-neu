/* =========================================================
   Store = das "Gedächtnis" der App

   Alle Daten liegen in EINEM Objekt (state). Es wird im
   localStorage des Browsers gespeichert, bleibt also auch nach
   dem Schließen erhalten – aber nur auf diesem Gerät.

   So sieht der state aus:
   {
     onboarded: true,
     arc:    { start: "2026-11-04", days: 90 },
     habits: [{ id, name, icon, since }],
     logs:   { "2026-11-04": ["habitId1", "habitId2"] },  ← erledigte Habits pro Tag
     notes:  { "2026-11-04": "Heute 5 km gelaufen" }
   }

   Wichtig: Andere Dateien ändern den state NIE direkt, sondern
   rufen die Funktionen unten auf (addHabit, toggleHabit …).
   Danach werden alle "Zuhörer" (subscribe) informiert und die
   Oberfläche zeichnet sich neu.
   ========================================================= */
import { todayKey, isValidKey } from './dates.js';
import { HABIT_ICONS } from './icons.js';

const STORAGE_KEY = 'winter-arc:v1';
const MAX_DAYS = 365;
const MAX_NAME = 40;
const MAX_NOTE = 5000;

const listeners = new Set();
let saveTimer = null;

/** Dauer immer zwischen 1 und 365 Tagen halten. */
export function clampDays(n) {
  const value = Math.round(Number(n));
  if (!Number.isFinite(value)) return 90;
  return Math.min(MAX_DAYS, Math.max(1, value));
}

function createDefaults() {
  return {
    version: 1,
    onboarded: false,
    arc: { start: todayKey(), days: 90 },
    habits: [],
    logs: {},
    notes: {},
  };
}

/**
 * Prüft und säubert Daten (z. B. aus einem Backup).
 * Alles, was komisch aussieht, fliegt raus – so kann eine
 * kaputte Datei die App nicht crashen.
 */
function sanitize(raw) {
  const s = createDefaults();
  if (!raw || typeof raw !== 'object') return s;

  s.onboarded = Boolean(raw.onboarded);

  if (raw.arc && typeof raw.arc === 'object') {
    if (isValidKey(raw.arc.start)) s.arc.start = raw.arc.start;
    if (raw.arc.days != null) s.arc.days = clampDays(raw.arc.days);
  }

  if (Array.isArray(raw.habits)) {
    const seen = new Set();
    for (const h of raw.habits) {
      if (!h || typeof h.id !== 'string' || !h.id || h.id.length > 64 || seen.has(h.id)) continue;
      if (typeof h.name !== 'string' || !h.name.trim()) continue;
      seen.add(h.id);
      s.habits.push({
        id: h.id,
        name: h.name.trim().slice(0, MAX_NAME),
        icon: HABIT_ICONS.includes(h.icon) ? h.icon : 'star',
        since: isValidKey(h.since) ? h.since : s.arc.start,
      });
    }
  }

  const ids = new Set(s.habits.map((h) => h.id));
  if (raw.logs && typeof raw.logs === 'object') {
    for (const [key, list] of Object.entries(raw.logs)) {
      if (!isValidKey(key) || !Array.isArray(list)) continue;
      const clean = [...new Set(list.filter((id) => ids.has(id)))];
      if (clean.length) s.logs[key] = clean;
    }
  }

  if (raw.notes && typeof raw.notes === 'object') {
    for (const [key, text] of Object.entries(raw.notes)) {
      if (isValidKey(key) && typeof text === 'string' && text.trim()) s.notes[key] = text.slice(0, MAX_NOTE);
    }
  }

  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : createDefaults();
  } catch {
    return createDefaults();
  }
}

let state = load();

/* ---------- Speichern ---------- */

function save() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Speicher voll oder vom Browser blockiert (z. B. privates Fenster) */
  }
}

/** Erst kurz warten, dann speichern (für Tippen in der Notiz – spart Arbeit). */
function saveLater() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

/** Falls noch etwas "wartet": jetzt sofort speichern. */
export function flush() {
  if (saveTimer) save();
}

/** Speichern + allen Bescheid geben, dass sich etwas geändert hat. */
function commit() {
  save();
  listeners.forEach((fn) => fn(state));
}

/* ---------- Lesen & Zuhören ---------- */

export const getState = () => state;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ---------- Aktionen: Arc ---------- */

export function startArc({ start, days }) {
  state.arc = { start, days: clampDays(days) };
  state.onboarded = true;
  commit();
}

export function updateArc({ start, days }) {
  state.arc = {
    start: isValidKey(start) ? start : state.arc.start,
    days: clampDays(days ?? state.arc.days),
  };
  commit();
}

/* ---------- Aktionen: Habits ---------- */

export function addHabit({ name, icon, since }) {
  const habit = { id: uid(), name: name.trim().slice(0, MAX_NAME), icon, since };
  state.habits.push(habit);
  commit();
  return habit;
}

export function updateHabit(id, { name, icon, since }) {
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) return;
  if (name) habit.name = name.trim().slice(0, MAX_NAME);
  if (icon) habit.icon = icon;
  if (since) habit.since = since;
  commit();
}

export function deleteHabit(id) {
  state.habits = state.habits.filter((h) => h.id !== id);
  // Auch alle Häkchen dieses Habits entfernen
  for (const key of Object.keys(state.logs)) {
    state.logs[key] = state.logs[key].filter((x) => x !== id);
    if (!state.logs[key].length) delete state.logs[key];
  }
  commit();
}

/** Habit in der Liste nach oben (-1) oder unten (+1) schieben. */
export function moveHabit(id, direction) {
  const i = state.habits.findIndex((h) => h.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= state.habits.length) return;
  [state.habits[i], state.habits[j]] = [state.habits[j], state.habits[i]];
  commit();
}

/** Häkchen setzen oder entfernen. Gibt zurück, ob der Habit jetzt erledigt ist. */
export function toggleHabit(dateKey, id) {
  const list = state.logs[dateKey] ?? [];
  const wasDone = list.includes(id);
  const next = wasDone ? list.filter((x) => x !== id) : [...list, id];
  if (next.length) state.logs[dateKey] = next;
  else delete state.logs[dateKey];
  commit();
  return !wasDone;
}

/* ---------- Aktionen: Notizen ---------- */

/** Notiz speichern – OHNE die Oberfläche neu zu zeichnen (sonst springt der Cursor). */
export function setNote(dateKey, text) {
  if (text.trim()) state.notes[dateKey] = text.slice(0, MAX_NOTE);
  else delete state.notes[dateKey];
  saveLater();
}

/* ---------- Backup ---------- */

export function exportData() {
  return JSON.stringify({ app: 'winter-arc', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importData(json) {
  const raw = JSON.parse(json);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.habits) || !raw.arc) {
    throw new Error('Kein gültiges Winter-Arc-Backup');
  }
  state = sanitize({ ...raw, onboarded: true });
  commit();
}

export function resetAll() {
  clearTimeout(saveTimer);
  saveTimer = null;
  state = createDefaults();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* egal */
  }
  listeners.forEach((fn) => fn(state));
}
