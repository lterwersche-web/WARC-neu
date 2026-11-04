/* =========================================================
   Tab 1: HEUTE
   Tagesauswahl, Fortschrittsring, Zitat, Habits zum Abhaken
   und die Tagesnotiz.
   ========================================================= */
import { icon } from '../icons.js';
import { esc, plural } from '../utils.js';
import { addDays, diffDays, formatLong, formatFull, formatShort, formatWeekday, weekdayShort, dayOfMonth } from '../dates.js';
import { dayProgress, activeHabits, habitStats } from '../stats.js';
import { quoteFor } from '../quotes.js';
import { header, ring, suggestionList } from './components.js';

export function renderToday(el, ctx) {
  el.innerHTML = ctx.info.status === 'upcoming' ? upcomingView(ctx) : dayView(ctx);
}

/** Läuft NACH dem Rendern: Notizfeld auf passende Höhe bringen. */
export function mountToday(el) {
  el.querySelectorAll('[data-note]').forEach(autoGrow);
}

export function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function dayTitle(date, today) {
  if (date === today) return 'Heute';
  if (date === addDays(today, -1)) return 'Gestern';
  return formatWeekday(date);
}

/* ---------- Normaler Tag (Arc läuft oder ist vorbei) ---------- */
function dayView(ctx) {
  const { state, ui, today, info } = ctx;
  const date = ui.selectedDate;
  const dayNo = diffDays(info.start, date) + 1;
  const isCurrent = date === info.lastDay;

  const right = isCurrent
    ? `<span class="pill">Tag ${dayNo}<span class="pill-dim">&thinsp;/&thinsp;${info.days}</span></span>`
    : `<button type="button" class="pill pill-btn" data-action="go-today">${info.status === 'finished' ? 'Letzter Tag' : 'Zu heute'}${icon('chevronRight', { size: 14, stroke: 2.6 })}</button>`;

  const top = header(formatLong(date), dayTitle(date, today), right) + weekStrip(ctx);

  if (!state.habits.length) return top + emptyState(state);

  const p = dayProgress(state, date);
  return `
    ${top}
    ${info.status === 'finished' ? finishedCard(info) : ''}
    ${p.total ? ringCard(ctx, p) : noHabitsThatDay()}
    ${quoteCard(date, `Tag ${dayNo}`)}
    ${p.total ? habitSection(ctx, date) : ''}
    ${noteCard(state, date)}
    ${state.habits.length < 3 ? suggestionList(state, { title: 'Mehr Habits?' }) : ''}`;
}

/* ---------- Tages-Leiste zum Durchwischen ---------- */
function weekStrip(ctx) {
  const { state, ui, today, info } = ctx;
  let html = '';
  for (let k = info.start; k <= info.end; k = addDays(k, 1)) {
    const future = k > today;
    const p = future ? null : dayProgress(state, k);
    const selected = k === ui.selectedDate;
    const cls = ['day', selected && 'selected', k === today && 'is-today'].filter(Boolean).join(' ');
    const label = `${formatLong(k)}${p && p.total ? `, ${p.done} von ${p.total} erledigt` : ''}`;
    html += `
      <button type="button" class="${cls}" data-action="select-day" data-date="${k}" ${future ? 'disabled' : ''} aria-label="${label}" ${selected ? 'aria-current="date"' : ''}>
        <span class="day-wd">${weekdayShort(k)}</span>
        <span class="day-dot">${ring({ ratio: p?.ratio ?? 0, size: 36, stroke: 3 })}<span class="day-num">${dayOfMonth(k)}</span></span>
      </button>`;
  }
  return `<div class="strip" data-strip role="group" aria-label="Tage deines Arcs">${html}</div>`;
}

/* ---------- Großer Ring + Arc-Fortschritt ---------- */
function ringCard(ctx, p) {
  const { info, ui } = ctx;
  const pct = Math.round(p.ratio * 100);
  const left = p.total - p.done;
  const arcPct = Math.round(info.progress * 100);

  let sub;
  if (p.perfect) sub = 'Perfekter Tag. Eiskalt durchgezogen.';
  else if (p.done === 0) sub = `${plural(p.total, 'Habit wartet', 'Habits warten')} auf dich.`;
  else sub = `Noch ${left} bis zum perfekten Tag.`;

  let remaining;
  if (info.status === 'finished') remaining = 'Geschafft';
  else if (info.remaining === 0) remaining = 'Letzter Tag';
  else remaining = `${plural(info.remaining, 'Tag', 'Tage')} übrig`;

  return `
    <section class="card ring-card ${p.perfect ? 'perfect' : ''}">
      <div class="ring-wrap">
        ${ring({ ratio: p.ratio, size: 112, stroke: 11, from: ui.ringFrom })}
        <div class="ring-center"><span class="ring-pct">${pct}<small>%</small></span></div>
      </div>
      <div class="ring-info">
        <div class="ring-title">${p.done} von ${p.total}</div>
        <div class="ring-sub">${sub}</div>
        <div class="arc-progress">
          <div class="bar"><span style="width:${arcPct}%"></span></div>
          <div class="arc-meta"><span>Arc ${arcPct}&thinsp;%</span><span>${remaining}</span></div>
        </div>
      </div>
    </section>`;
}

function quoteCard(date, meta) {
  return `
    <section class="quote-card">
      <span class="quote-mark" aria-hidden="true">“</span>
      <p class="quote-text">${esc(quoteFor(date))}</p>
      <span class="quote-meta">Gedanke des Tages · ${meta}</span>
    </section>`;
}

/* ---------- Habits zum Abhaken ---------- */
function habitSection(ctx, date) {
  return `
    <div class="section-head">
      <h2 class="section-title">Habits</h2>
      <button type="button" class="link-btn" data-action="add-habit">${icon('plus', { size: 18, stroke: 2.4 })}Neu</button>
    </div>
    <div class="list inset-icon">${habitRows(ctx, date)}</div>`;
}

function habitRows(ctx, date) {
  const { state, ui, today, info } = ctx;
  const log = state.logs[date] ?? [];
  return activeHabits(state, date)
    .map((h) => {
      const done = log.includes(h.id);
      const { current } = habitStats(state, h, info, today);
      const meta = current > 0
        ? `${icon('flame', { size: 13, stroke: 2.2 })}<span>${plural(current, 'Tag', 'Tage')} Serie</span>`
        : '<span>Starte deine Serie</span>';
      const cls = ['habit-row', 'li', done && 'done', ui.lastToggled === h.id && 'pop'].filter(Boolean).join(' ');
      return `
        <button type="button" class="${cls}" data-action="toggle" data-id="${esc(h.id)}" aria-pressed="${done}">
          <span class="habit-icon">${icon(h.icon)}</span>
          <span class="habit-text">
            <span class="habit-name">${esc(h.name)}</span>
            <span class="habit-meta">${meta}</span>
          </span>
          <span class="check" aria-hidden="true">${icon('check', { size: 16, stroke: 3 })}</span>
        </button>`;
    })
    .join('');
}

/* ---------- Tagesnotiz ---------- */
function noteCard(state, date) {
  const note = state.notes[date] ?? '';
  return `
    <div class="section-head"><h2 class="section-title">Tagesnotiz</h2></div>
    <div class="card note-card">
      <textarea class="note-input" data-note rows="3" maxlength="5000" placeholder="Wie lief dein Tag? Was nimmst du mit?" aria-label="Tagesnotiz">${esc(note)}</textarea>
      <div class="note-foot"><span data-note-status>${note ? 'Gespeichert' : ''}</span><span>${formatShort(date)}</span></div>
    </div>`;
}

/* ---------- Sonderfälle ---------- */
function emptyState(state) {
  return `
    <section class="card empty">
      <div class="empty-icon">${icon('snowflake', { size: 30, stroke: 1.6 })}</div>
      <h3>Noch keine Habits</h3>
      <p>Schnapp dir einen Vorschlag oder erstell deinen eigenen Habit.</p>
      <button type="button" class="btn-primary btn-inline" data-action="add-habit">${icon('plus', { size: 18, stroke: 2.4 })}Eigener Habit</button>
    </section>
    ${suggestionList(state)}`;
}

function noHabitsThatDay() {
  return `
    <section class="card empty empty-small">
      <p>An diesem Tag waren noch keine Habits aktiv.</p>
    </section>`;
}

function finishedCard(info) {
  return `
    <section class="card finished-card">
      <span class="tile-icon">${icon('trophy', { size: 18, stroke: 2 })}</span>
      <div class="finished-text">
        <div class="finished-title">Arc abgeschlossen</div>
        <div class="finished-sub">${info.days} Tage durchgezogen. Respekt.</div>
      </div>
      <button type="button" class="pill pill-btn" data-action="goto-tab" data-tab="progress">Bilanz</button>
    </section>`;
}

/* ---------- Arc hat noch nicht begonnen ---------- */
function upcomingView(ctx) {
  const { state, today, info } = ctx;
  const n = info.daysUntilStart;
  const habits = state.habits
    .map(
      (h) => `
      <div class="habit-row li is-static">
        <span class="habit-icon">${icon(h.icon)}</span>
        <span class="habit-text"><span class="habit-name">${esc(h.name)}</span><span class="habit-meta">Bereit</span></span>
      </div>`,
    )
    .join('');

  return `
    ${header(formatLong(today), 'Heute')}
    <section class="card countdown">
      <div class="countdown-num">${n}</div>
      <div class="countdown-label">${n === 1 ? 'Tag' : 'Tage'} bis zum Start</div>
      <p class="countdown-text">Dein Winter Arc startet am ${formatFull(info.start)} und geht ${info.days} Tage. Bereite dich vor.</p>
    </section>
    ${quoteCard(today, 'Vorbereitung')}
    ${state.habits.length
      ? `<div class="section-head"><h2 class="section-title">Deine Habits</h2><button type="button" class="link-btn" data-action="add-habit">${icon('plus', { size: 18, stroke: 2.4 })}Neu</button></div><div class="list inset-icon">${habits}</div>`
      : emptyState(state)}`;
}
