/* =========================================================
   Tab 3: HABITS
   Eigene Habits verwalten (bearbeiten, sortieren) und
   Vorschläge hinzufügen.
   ========================================================= */
import { icon } from '../icons.js';
import { esc, plural } from '../utils.js';
import { formatShort } from '../dates.js';
import { header, suggestionList } from './components.js';

export function renderHabits(el, ctx) {
  const { state, ui, info } = ctx;
  const n = state.habits.length;
  if (n < 2) ui.editMode = false;

  const right = n > 1
    ? `<button type="button" class="link-btn" data-action="toggle-edit">${ui.editMode ? 'Fertig' : 'Sortieren'}</button>`
    : '';

  const rows = state.habits
    .map((h, i) => {
      const since = h.since <= info.start ? 'Zählt ab Arc-Start' : `Zählt ab ${formatShort(h.since)}`;
      const text = `
        <span class="habit-icon">${icon(h.icon)}</span>
        <span class="habit-text">
          <span class="habit-name">${esc(h.name)}</span>
          <span class="habit-meta">${since}</span>
        </span>`;

      if (ui.editMode) {
        return `
          <div class="manage-row li">
            ${text}
            <div class="reorder">
              <button type="button" data-action="move" data-id="${esc(h.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(h.name)} nach oben">${icon('chevronUp', { size: 18, stroke: 2.4 })}</button>
              <button type="button" data-action="move" data-id="${esc(h.id)}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} aria-label="${esc(h.name)} nach unten">${icon('chevronDown', { size: 18, stroke: 2.4 })}</button>
            </div>
          </div>`;
      }
      return `
        <button type="button" class="manage-row li" data-action="edit-habit" data-id="${esc(h.id)}">
          ${text}
          ${icon('chevronRight', { size: 18, stroke: 2.2, cls: 'chev' })}
        </button>`;
    })
    .join('');

  el.innerHTML = `
    ${header(n ? plural(n, 'Habit', 'Habits') : 'Deine Routine', 'Habits', right)}
    ${n ? `<div class="list inset-icon">${rows}</div>` : ''}
    <button type="button" class="btn-secondary add-btn" data-action="add-habit">${icon('plus', { size: 18, stroke: 2.4 })}Neuer Habit</button>
    ${n ? '<p class="footnote">Tippe auf einen Habit, um ihn zu bearbeiten oder zu löschen.</p>' : ''}
    ${suggestionList(state)}`;
}
