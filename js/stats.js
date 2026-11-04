/* =========================================================
   Statistik: Fortschritt, Streaks & Quoten

   Hier wird nur GERECHNET, nichts angezeigt. Die Funktionen
   bekommen den state und geben Zahlen zurück.
   ========================================================= */
import { addDays, diffDays } from './dates.js';

/** Alle Tage von `from` bis `to` als Liste: ["…-01", "…-02", …] */
export function rangeKeys(from, to) {
  const keys = [];
  for (let k = from; k <= to; k = addDays(k, 1)) keys.push(k);
  return keys;
}

/**
 * Infos zum Arc: Wann endet er? Läuft er schon? Welcher Tag ist heute?
 * status: "upcoming" (startet noch) | "active" (läuft) | "finished" (vorbei)
 */
export function arcInfo(arc, today) {
  const end = addDays(arc.start, arc.days - 1);
  const status = today < arc.start ? 'upcoming' : today > end ? 'finished' : 'active';

  // Letzter Tag, den man schon abhaken kann
  const lastDay = status === 'upcoming' ? null : status === 'finished' ? end : today;
  const dayIndex = status === 'active' ? diffDays(arc.start, today) + 1 : status === 'finished' ? arc.days : 0;

  return {
    start: arc.start,
    end,
    days: arc.days,
    status,
    lastDay,
    dayIndex,
    daysUntilStart: status === 'upcoming' ? diffDays(today, arc.start) : 0,
    remaining: status === 'active' ? diffDays(today, end) : status === 'upcoming' ? arc.days : 0,
    progress: dayIndex / arc.days,
  };
}

/** Welche Habits zählen an diesem Tag? (Ein Habit zählt erst ab seinem "since"-Datum.) */
export function activeHabits(state, dateKey) {
  return state.habits.filter((h) => h.since <= dateKey);
}

/** Wie viel ist an einem Tag erledigt? */
export function dayProgress(state, dateKey) {
  const habits = activeHabits(state, dateKey);
  const log = state.logs[dateKey] ?? [];
  const done = habits.filter((h) => log.includes(h.id)).length;
  const total = habits.length;
  return {
    done,
    total,
    ratio: total ? done / total : 0,
    perfect: total > 0 && done === total,
  };
}

/**
 * Aktuelle Serie: Von hinten zählen, wie viele Tage am Stück geklappt haben.
 * Trick: Wenn HEUTE noch nicht erledigt ist, ist die Serie nicht gerissen –
 * der Tag ist ja noch nicht vorbei. Dann zählen wir ab gestern.
 */
function currentRun(keys, test, today) {
  let i = keys.length - 1;
  if (i >= 0 && keys[i] === today && !test(keys[i])) i--;
  let count = 0;
  while (i >= 0 && test(keys[i])) {
    count++;
    i--;
  }
  return count;
}

/** Längste Serie überhaupt. */
function bestRun(keys, test) {
  let best = 0;
  let current = 0;
  for (const k of keys) {
    current = test(k) ? current + 1 : 0;
    if (current > best) best = current;
  }
  return best;
}

/** Statistik für EINEN Habit. */
export function habitStats(state, habit, info, today) {
  const empty = { current: 0, best: 0, rate: 0, done: 0, total: 0 };
  if (!info.lastDay) return empty;

  const first = habit.since > info.start ? habit.since : info.start;
  if (first > info.lastDay) return empty;

  const keys = rangeKeys(first, info.lastDay);
  const isDone = (k) => (state.logs[k] ?? []).includes(habit.id);
  // Heute zählt erst mit, wenn es erledigt ist (sonst würde die Quote morgens sinken)
  const counted = keys.filter((k) => k !== today || isDone(k));
  const done = counted.filter(isDone).length;

  return {
    current: currentRun(keys, isDone, today),
    best: bestRun(keys, isDone),
    rate: counted.length ? done / counted.length : 0,
    done,
    total: counted.length,
  };
}

/** Gesamt-Statistik über alle Habits. "Perfekter Tag" = alle Habits geschafft. */
export function overallStats(state, info, today) {
  const empty = { currentPerfect: 0, bestPerfect: 0, perfectDays: 0, rate: 0 };
  if (!info.lastDay || !state.habits.length) return empty;

  // Cache, damit jeder Tag nur einmal berechnet wird
  const cache = new Map();
  const progress = (k) => {
    if (!cache.has(k)) cache.set(k, dayProgress(state, k));
    return cache.get(k);
  };

  const keys = rangeKeys(info.start, info.lastDay);
  let done = 0;
  let total = 0;
  let perfectDays = 0;

  for (const k of keys) {
    const p = progress(k);
    if (k === today && !p.perfect) continue;
    done += p.done;
    total += p.total;
    if (p.perfect) perfectDays++;
  }

  const isPerfect = (k) => progress(k).perfect;
  return {
    currentPerfect: currentRun(keys, isPerfect, today),
    bestPerfect: bestRun(keys, isPerfect),
    perfectDays,
    rate: total ? done / total : 0,
  };
}
