/* =========================================================
   Statistik: Fortschritt, Streaks & Quoten

   Hier wird nur GERECHNET, nichts angezeigt. Die Funktionen
   bekommen den state und geben Zahlen zurück.

   Drei Arten von Habits (habit.schedule.type):
   - "daily"  → jeden Tag fällig
   - "days"   → nur an festen Wochentagen fällig, sonst Pause
   - "weekly" → flexibel X-mal pro Woche. Zählt als BONUS:
                abhaken = +1, nicht abhaken = kein Minus
   ========================================================= */
import { addDays, diffDays, weekdayIndex } from './dates.js';

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/** Alle Tage von `from` bis `to` als Liste: ["…-01", "…-02", …] */
export function rangeKeys(from, to) {
  const keys = [];
  for (let k = from; k <= to; k = addDays(k, 1)) keys.push(k);
  return keys;
}

/** Montag der Woche, in der `key` liegt. */
export function weekStart(key) {
  return addDays(key, -weekdayIndex(key));
}

/* ---------- Arc ---------- */

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

/* ---------- Rhythmus ---------- */

export const isFlexible = (habit) => habit.schedule?.type === 'weekly';

/** Kurzer Text zum Rhythmus: "Täglich", "Mo · Mi · Fr", "3× pro Woche" */
export function scheduleLabel(schedule) {
  if (schedule?.type === 'days') return schedule.days.map((d) => WEEKDAYS_SHORT[d]).join(' · ');
  if (schedule?.type === 'weekly') return `${schedule.times}× pro Woche`;
  return 'Täglich';
}

/** Taucht der Habit an diesem Tag in der Liste auf? */
export function isDueOn(habit, dateKey) {
  if (habit.since > dateKey) return false;
  if (habit.schedule?.type === 'days') return habit.schedule.days.includes(weekdayIndex(dateKey));
  return true;
}

/** Alle Habits, die an diesem Tag dran sind. */
export function habitsForDay(state, dateKey) {
  return state.habits.filter((h) => isDueOn(h, dateKey));
}

/** Habits, die es schon gibt, die aber heute Pause haben (feste Tage). */
export function restingHabits(state, dateKey) {
  return state.habits.filter((h) => h.since <= dateKey && !isDueOn(h, dateKey));
}

export function isDone(state, dateKey, habitId) {
  return (state.logs[dateKey] ?? []).includes(habitId);
}

/** Wie oft wurde ein Habit in der Woche von `dateKey` erledigt? (für "2/3 diese Woche") */
export function weekCount(state, habit, dateKey) {
  const monday = weekStart(dateKey);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(monday, i);
    if (k >= habit.since && isDone(state, k, habit.id)) count++;
  }
  return count;
}

/* ---------- Tagesfortschritt ---------- */

/**
 * Wie viel ist an einem Tag erledigt?
 * - done/total zählen nur PFLICHT-Habits (täglich + feste Tage)
 * - bonus = erledigte flexible Habits
 * - active = false heißt: An dem Tag war nichts fällig (Pausentag)
 */
export function dayProgress(state, dateKey) {
  let total = 0;
  let done = 0;
  let bonus = 0;

  for (const h of state.habits) {
    if (!isDueOn(h, dateKey)) continue;
    const checked = isDone(state, dateKey, h.id);
    if (isFlexible(h)) {
      if (checked) bonus++;
    } else {
      total++;
      if (checked) done++;
    }
  }

  return {
    done,
    total,
    bonus,
    open: total - done,
    active: total + bonus > 0,
    ratio: total ? done / total : bonus ? 1 : 0,
    perfect: total ? done === total : bonus > 0,
  };
}

/* ---------- Serien ----------
   Jede Prüfung gibt true (geschafft), false (verpasst) oder
   null (zählt nicht: Pausentag oder heute noch offen) zurück.
   null wird übersprungen und unterbricht die Serie NICHT. */
function runs(results) {
  let best = 0;
  let streak = 0;
  for (const r of results) {
    if (r === null) continue;
    streak = r ? streak + 1 : 0;
    if (streak > best) best = streak;
  }

  let current = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === null) continue;
    if (!results[i]) break;
    current++;
  }

  const counted = results.filter((r) => r !== null);
  const done = counted.filter(Boolean).length;
  return { current, best, done, total: counted.length, rate: counted.length ? done / counted.length : 0 };
}

const EMPTY = { current: 0, best: 0, done: 0, total: 0, rate: 0 };

/** Statistik für EINEN Habit. unit = "day" oder "week" */
export function habitStats(state, habit, info, today) {
  if (!info.lastDay) return { ...EMPTY, unit: isFlexible(habit) ? 'week' : 'day' };
  const first = habit.since > info.start ? habit.since : info.start;
  if (first > info.lastDay) return { ...EMPTY, unit: isFlexible(habit) ? 'week' : 'day' };

  return isFlexible(habit) ? weeklyStats(state, habit, info, today, first) : dailyStats(state, habit, today, first, info);
}

function dailyStats(state, habit, today, first, info) {
  const results = rangeKeys(first, info.lastDay).map((k) => {
    if (!isDueOn(habit, k)) return null; // Pausentag
    if (isDone(state, k, habit.id)) return true;
    return k === today ? null : false; // heute ist noch nicht vorbei
  });
  return { ...runs(results), unit: 'day' };
}

/** Flexible Habits: Eine Woche gilt als geschafft, wenn das Wochenziel erreicht ist. */
function weeklyStats(state, habit, info, today, first) {
  const results = [];
  for (let monday = weekStart(first); monday <= info.lastDay; monday = addDays(monday, 7)) {
    const from = monday < first ? first : monday;
    const sunday = addDays(monday, 6);
    const to = sunday > info.end ? info.end : sunday;

    // Angebrochene Wochen (z. B. Arc startet am Donnerstag) fair behandeln
    const need = Math.min(habit.schedule.times, diffDays(from, to) + 1);
    let count = 0;
    for (let k = from; k <= to && k <= info.lastDay; k = addDays(k, 1)) {
      if (isDone(state, k, habit.id)) count++;
    }

    const running = info.status === 'active' && today >= from && today <= to;
    results.push(count >= need ? true : running ? null : false);
  }
  return { ...runs(results), unit: 'week' };
}

/** Gesamt-Statistik. "Perfekter Tag" = alle fälligen Pflicht-Habits geschafft. */
export function overallStats(state, info, today) {
  const empty = { currentPerfect: 0, bestPerfect: 0, perfectDays: 0, rate: 0 };
  if (!info.lastDay || !state.habits.length) return empty;

  let done = 0;
  let total = 0;
  let perfectDays = 0;

  const results = rangeKeys(info.start, info.lastDay).map((k) => {
    const p = dayProgress(state, k);
    if (!p.active) return null;
    if (k === today && !p.perfect) return null;
    done += p.done;
    total += p.total;
    if (p.perfect) perfectDays++;
    return p.perfect;
  });

  const r = runs(results);
  return { currentPerfect: r.current, bestPerfect: r.best, perfectDays, rate: total ? done / total : 0 };
}
