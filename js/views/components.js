/* =========================================================
   Wiederverwendbare Bausteine (Komponenten)
   Jede Funktion gibt ein Stück HTML als Text zurück.
   ========================================================= */
import { icon } from '../icons.js';
import { esc, clamp, haptic } from '../utils.js';
import { addDays, formatFull, isValidKey } from '../dates.js';
import { clampDays } from '../store.js';
import { SUGGESTIONS } from '../suggestions.js';

/** Seitenkopf mit kleiner Überschrift (eyebrow) und großem Titel. */
export function header(eyebrow, title, right = '') {
  return `
    <header class="page-header">
      <div class="eyebrow">${eyebrow}</div>
      <div class="title-row">
        <h1 class="large-title">${title}</h1>
        ${right}
      </div>
    </header>`;
}

/* ---------- Fortschrittsring (wie bei Apple Fitness) ----------
   Trick: Ein Kreis mit gestrichelter Linie. stroke-dasharray = Umfang,
   stroke-dashoffset verschiebt den Strich → so wird nur ein Teil sichtbar.
   Die Spur darunter ist nur eine dünne weiße Linie (kein Grau!).
   dashed = gestrichelte Spur für Tage, die noch kommen. */
export function ring({ ratio, size = 120, stroke = 12, track = 1.5, from = null, dashed = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const to = c * (1 - clamp(ratio, 0, 1));
  const start = from == null ? to : c * (1 - clamp(from, 0, 1));
  const hidden = start >= c - 0.5;
  const mid = size / 2;
  return `
    <svg class="ring" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle class="ring-track${dashed ? ' dashed' : ''}" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${track}"/>
      <circle class="ring-bar" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${start.toFixed(2)}"
        data-to="${to.toFixed(2)}" style="opacity:${hidden ? 0 : 1}"/>
    </svg>`;
}

/** Startet die Ring-Animation (vom alten zum neuen Wert). */
export function animateRings(root) {
  const bars = root.querySelectorAll('.ring-bar[data-to]');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      bars.forEach((bar) => {
        const c = parseFloat(bar.getAttribute('stroke-dasharray'));
        const to = parseFloat(bar.dataset.to);
        bar.style.strokeDashoffset = String(to);
        bar.style.opacity = to >= c - 0.5 ? '0' : '1';
      });
    }),
  );
}

/* ---------- Segmented Control (iOS-Umschalter) ----------
   options: [{ value, label }], der weiße "Thumb" gleitet zur Auswahl. */
export function segmented(name, options, selected) {
  const index = Math.max(0, options.findIndex((o) => o.value === selected));
  return `
    <div class="segmented" data-seg="${name}" style="--n:${options.length};--index:${index}">
      <span class="seg-thumb" aria-hidden="true"></span>
      ${options.map((o, i) => `<button type="button" class="seg-btn" data-seg-value="${o.value}" aria-pressed="${i === index}">${o.label}</button>`).join('')}
    </div>`;
}

/** Auswahl im Segmented Control setzen (Thumb verschieben, Text umfärben). */
export function selectSegment(segEl, value) {
  const buttons = [...segEl.querySelectorAll('[data-seg-value]')];
  const index = Math.max(0, buttons.findIndex((b) => b.dataset.segValue === value));
  segEl.style.setProperty('--index', index);
  buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
}

/* ---------- Arc-Zeitraum: Start, Dauer, Ende ---------- */
const PRESETS = [30, 60, 90, 100];

export function arcFields(arc) {
  const end = addDays(arc.start, arc.days - 1);
  return `
    <div class="list">
      <label class="row li">
        <span class="row-label">Start</span>
        <input class="date-input" type="date" name="start" value="${arc.start}" required>
      </label>
      <div class="row li">
        <span class="row-label">Dauer</span>
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="Einen Tag weniger">${icon('minus', { size: 16, stroke: 2.6 })}</button>
          <input type="number" name="days" inputmode="numeric" min="1" max="365" value="${arc.days}" aria-label="Dauer in Tagen">
          <span class="stepper-unit">Tage</span>
          <button type="button" data-step="1" aria-label="Einen Tag mehr">${icon('plus', { size: 16, stroke: 2.6 })}</button>
        </div>
      </div>
      <div class="row li">
        <span class="row-label">Ende</span>
        <span class="row-value" data-end>${formatFull(end)}</span>
      </div>
    </div>
    <div class="chips" role="group" aria-label="Schnellauswahl Dauer">
      ${PRESETS.map((n) => `<button type="button" class="chip ${n === arc.days ? 'active' : ''}" data-days="${n}">${n} Tage</button>`).join('')}
    </div>`;
}

/** Macht die Arc-Felder interaktiv. onChange bekommt { start, days }. */
export function bindArcFields(root, { onChange } = {}) {
  const startInput = root.querySelector('[name="start"]');
  const daysInput = root.querySelector('[name="days"]');
  const endLabel = root.querySelector('[data-end]');

  const read = () => ({
    start: isValidKey(startInput.value) ? startInput.value : null,
    days: clampDays(Number(daysInput.value) || 1),
  });

  const refresh = () => {
    const { start, days } = read();
    if (start) endLabel.textContent = formatFull(addDays(start, days - 1));
    root.querySelectorAll('[data-days]').forEach((chip) => {
      chip.classList.toggle('active', Number(chip.dataset.days) === days);
    });
  };

  const emit = () => {
    const value = read();
    daysInput.value = value.days;
    refresh();
    if (value.start) onChange?.(value);
  };

  startInput.addEventListener('change', emit);
  daysInput.addEventListener('input', refresh);
  daysInput.addEventListener('change', emit);

  root.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    const preset = e.target.closest('[data-days]');
    if (step) daysInput.value = clampDays((Number(daysInput.value) || 0) + Number(step.dataset.step));
    else if (preset) daysInput.value = preset.dataset.days;
    else return;
    haptic(5);
    emit();
  });

  return { read };
}

/* ---------- Vorschlagsliste (für leere Zustände & Habits-Tab) ---------- */
export function suggestionList(state, { title = 'Vorschläge' } = {}) {
  const taken = new Set(state.habits.map((h) => h.name.trim().toLowerCase()));
  const items = SUGGESTIONS.filter((s) => !taken.has(s.name.toLowerCase()));
  if (!items.length) return '';

  const rows = items
    .map(
      (s) => `
      <div class="suggest-row li">
        <button type="button" class="suggest-main" data-action="suggest-edit" data-name="${esc(s.name)}" data-icon="${s.icon}">
          <span class="habit-icon">${icon(s.icon)}</span>
          <span class="habit-text">
            <span class="habit-name">${esc(s.name)}</span>
            <span class="habit-meta">Antippen zum Anpassen</span>
          </span>
        </button>
        <button type="button" class="add-circle" data-action="suggest-add" data-name="${esc(s.name)}" data-icon="${s.icon}" aria-label="${esc(s.name)} direkt hinzufügen">
          ${icon('plus', { size: 18, stroke: 2.6 })}
        </button>
      </div>`,
    )
    .join('');

  return `
    <div class="section-head"><h2 class="section-title">${title}</h2></div>
    <div class="list inset-icon">${rows}</div>
    <p class="footnote">Mit <b>+</b> direkt hinzufügen oder antippen, um Name und Icon vorher anzupassen.</p>`;
}
