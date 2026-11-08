/* =========================================================
   Tab 2: FORTSCHRITT
   Arc-Fortschritt, Kennzahlen, Kalender-Heatmap und
   Statistik pro Habit.
   ========================================================= */
import { icon } from '../icons.js';
import { esc, plural } from '../utils.js';
import { addDays, weekdayIndex, dayOfMonth, formatShort, monthShort } from '../dates.js';
import { dayProgress, habitStats, overallStats, rangeKeys, scheduleLabel } from '../stats.js';
import { header } from './components.js';

export function renderProgress(el, ctx) {
  const { state, today, info } = ctx;
  const o = overallStats(state, info, today);
  const arcPct = Math.round(info.progress * 100);

  let left;
  let right;
  if (info.status === 'upcoming') {
    left = `Start in ${plural(info.daysUntilStart, 'Tag', 'Tagen')}`;
    right = `${info.days} Tage`;
  } else if (info.status === 'finished') {
    left = `${info.days} von ${info.days} Tagen`;
    right = 'Abgeschlossen';
  } else {
    left = `Tag ${info.dayIndex} von ${info.days}`;
    right = info.remaining === 0 ? 'Letzter Tag' : `${info.remaining} übrig`;
  }

  el.innerHTML = `
    ${header('Winter Arc', 'Fortschritt')}

    <section class="card arc-card">
      <div class="arc-top">
        <span class="eyebrow">Arc-Fortschritt</span>
        <span class="arc-dates">${formatShort(info.start)} – ${formatShort(info.end)}</span>
      </div>
      <div class="arc-big">${arcPct}<small>%</small></div>
      <div class="bar bar-lg"><span style="width:${arcPct}%"></span></div>
      <div class="arc-meta"><span>${left}</span><span>${right}</span></div>
    </section>

    <div class="tiles">
      ${tile('flame', o.currentPerfect, o.currentPerfect === 1 ? 'Tag' : 'Tage', 'Aktuelle Serie')}
      ${tile('trophy', o.bestPerfect, o.bestPerfect === 1 ? 'Tag' : 'Tage', 'Rekord-Serie')}
      ${tile('checkCircle', Math.round(o.rate * 100), '%', 'Erfüllt')}
      ${tile('star', o.perfectDays, '', 'Perfekte Tage')}
    </div>
    <p class="footnote">Serien zählen perfekte Tage, also Tage, an denen du alle fälligen Habits geschafft hast. Pausentage unterbrechen keine Serie.</p>

    <div class="section-head"><h2 class="section-title">Kalender</h2></div>
    <section class="card heat-card">${heatmap(ctx)}</section>

    <div class="section-head"><h2 class="section-title">Pro Habit</h2></div>
    ${habitStatsList(ctx)}`;
}

function tile(iconName, value, unit, label) {
  return `
    <div class="tile">
      <span class="tile-icon">${icon(iconName, { size: 17, stroke: 2.2 })}</span>
      <div class="tile-value">${value}${unit ? `<small>${unit}</small>` : ''}</div>
      <div class="tile-label">${label}</div>
    </div>`;
}

/* ---------- Kalender-Heatmap ----------
   Jede Zeile = eine Woche (Mo–So), jedes Kästchen = ein Tag.
   Je mehr erledigt, desto weiter füllt sich das Kästchen von unten
   mit Weiß – wie ein Akku. (--fill steuert die Füllhöhe im CSS.) */
function heatmap(ctx) {
  const { state, today, info } = ctx;
  const gridStart = addDays(info.start, -weekdayIndex(info.start));
  const gridEnd = addDays(info.end, 6 - weekdayIndex(info.end));
  const inArc = (k) => k >= info.start && k <= info.end;

  let html = '<span></span>';
  html += ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => `<span class="heat-dow">${d}</span>`).join('');

  let i = 0;
  let firstRow = true;
  for (let week = gridStart; week <= gridEnd; week = addDays(week, 7)) {
    const days = rangeKeys(week, addDays(week, 6));
    const arcDays = days.filter(inArc);
    const monthStart = firstRow ? arcDays[0] : arcDays.find((k) => dayOfMonth(k) === 1);
    html += `<span class="heat-month">${monthStart ? monthShort(monthStart) : ''}</span>`;
    firstRow = false;

    for (const k of days) {
      if (!inArc(k)) {
        html += '<span class="cell out"></span>';
      } else if (k > today) {
        html += `<span class="cell future" style="--i:${i++}"></span>`;
      } else {
        const p = dayProgress(state, k);
        const fill = p.active ? Math.round(p.ratio * 100) : 0;
        const label = p.active ? `${formatShort(k)}: ${p.done} von ${p.total}` : `${formatShort(k)}: Pause`;
        html += `<button type="button" class="cell ${p.active ? '' : 'rest'} ${k === today ? 'today' : ''}" style="--i:${i++};--fill:${fill}%" data-action="heat-day" data-date="${k}" aria-label="${label}" title="${label}"></button>`;
      }
    }
  }

  return `
    <div class="heat">${html}</div>
    <div class="heat-legend">
      <span class="legend-item"><i style="--fill:0%"></i><i style="--fill:50%"></i><i style="--fill:100%"></i>0–100&thinsp;%</span>
      <span class="legend-item"><i class="rest"></i>Pause</span>
      <span class="legend-item"><i class="future"></i>Kommt noch</span>
    </div>`;
}

/* ---------- Statistik pro Habit ---------- */
function habitStatsList(ctx) {
  const { state, today, info } = ctx;
  if (!state.habits.length) {
    return `
      <section class="card empty empty-small">
        <p>Noch keine Habits, also auch noch keine Statistik.</p>
        <button type="button" class="btn-primary btn-inline" data-action="goto-tab" data-tab="habits">Habits anlegen</button>
      </section>`;
  }

  const rows = state.habits
    .map((h) => {
      const s = habitStats(state, h, info, today);
      const pct = Math.round(s.rate * 100);
      const unit = s.unit === 'week' ? 'Wochen' : 'Tage';
      return `
        <div class="stat-row li">
          <span class="habit-icon">${icon(h.icon)}</span>
          <div class="stat-main">
            <div class="stat-top"><span class="habit-name">${esc(h.name)}</span><span class="stat-pct">${pct}<small>%</small></span></div>
            <div class="bar"><span style="width:${pct}%"></span></div>
            <div class="habit-meta">
              <span>${scheduleLabel(h.schedule)}</span>
              <span class="sep">·</span>${icon('flame', { size: 12, stroke: 2.2 })}<span>${s.current}</span>
              <span class="sep">·</span><span>Rekord ${s.best}</span>
              <span class="sep">·</span><span>${s.done}/${s.total} ${unit}</span>
            </div>
          </div>
        </div>`;
    })
    .join('');

  return `<div class="list inset-icon">${rows}</div>`;
}
