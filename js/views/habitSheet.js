/* =========================================================
   Bottom-Sheet: Habit erstellen oder bearbeiten
   ========================================================= */
import { icon, HABIT_ICONS, ICON_LABELS } from '../icons.js';
import { esc, haptic } from '../utils.js';
import { formatShort } from '../dates.js';
import { addHabit, updateHabit, deleteHabit } from '../store.js';
import { SUGGESTIONS } from '../suggestions.js';
import { openSheet, confirmDialog, toast } from '../ui/overlay.js';

/**
 * @param ctx      aktueller App-Kontext (state, today, info)
 * @param habit    vorhandener Habit → Bearbeiten-Modus
 * @param prefill  { name, icon } → Neuer Habit, schon ausgefüllt (aus Vorschlag)
 */
export function openHabitSheet(ctx, { habit = null, prefill = null } = {}) {
  const { state, today, info } = ctx;
  const isEdit = Boolean(habit);
  const draft = {
    name: habit?.name ?? prefill?.name ?? '',
    icon: habit?.icon ?? prefill?.icon ?? 'star',
  };

  // "Zählt ab" nur anzeigen, wenn der Arc schon vor heute gestartet ist
  const canChooseSince = info.status !== 'upcoming' && today > info.start;
  let sinceMode = isEdit
    ? (habit.since <= info.start ? 'start' : 'later')
    : (info.status === 'finished' ? 'start' : 'later');
  const laterLabel = isEdit && habit.since > info.start ? `Ab ${formatShort(habit.since)}` : 'Ab heute';

  const taken = new Set(state.habits.filter((h) => h !== habit).map((h) => h.name.trim().toLowerCase()));

  const suggestions = isEdit ? '' : `
    <div class="sheet-section">
      <div class="section-label">Vorschläge</div>
      <div class="suggestions">
        ${SUGGESTIONS.map((s) => `
          <button type="button" class="suggestion ${taken.has(s.name.toLowerCase()) ? 'added' : ''} ${prefill?.name === s.name ? 'selected' : ''}" data-sug-name="${esc(s.name)}" data-sug-icon="${s.icon}">
            ${icon(s.icon, { size: 17 })}<span>${esc(s.name)}</span>
          </button>`).join('')}
      </div>
    </div>`;

  const sinceSection = !canChooseSince ? '' : `
    <div class="sheet-section">
      <div class="section-label">Zählt ab</div>
      <div class="segmented" data-index="${sinceMode === 'start' ? 0 : 1}">
        <span class="seg-thumb"></span>
        <button type="button" class="seg-btn" data-since="start">Ab Arc-Start</button>
        <button type="button" class="seg-btn" data-since="later">${laterLabel}</button>
      </div>
      <p class="footnote">Ab wann zählt der Habit für Serien und Statistik? Mit „Ab Arc-Start“ kannst du vergangene Tage nachtragen.</p>
    </div>`;

  const body = `
    <div class="preview">
      <div class="preview-icon" data-preview-icon>${icon(draft.icon, { size: 34, stroke: 1.8 })}</div>
      <div class="preview-name ${draft.name ? '' : 'placeholder'}" data-preview-name>${esc(draft.name || 'Neuer Habit')}</div>
    </div>
    ${suggestions}
    <div class="sheet-section">
      <div class="section-label">Name</div>
      <div class="list"><input class="text-input" name="name" maxlength="40" placeholder="z. B. Kalt duschen" value="${esc(draft.name)}" autocomplete="off" enterkeyhint="done" aria-label="Name des Habits"></div>
    </div>
    <div class="sheet-section">
      <div class="section-label">Icon</div>
      <div class="icon-grid">
        ${HABIT_ICONS.map((n) => `
          <button type="button" class="icon-opt ${n === draft.icon ? 'selected' : ''}" data-icon-opt="${n}" aria-label="${ICON_LABELS[n]}" aria-pressed="${n === draft.icon}">${icon(n)}</button>`).join('')}
      </div>
    </div>
    ${sinceSection}
    ${isEdit ? `<button type="button" class="btn-secondary btn-danger" data-delete>${icon('trash', { size: 18 })}Habit löschen</button>` : ''}`;

  const sheet = openSheet({
    title: isEdit ? 'Habit bearbeiten' : 'Neuer Habit',
    body,
    rightLabel: isEdit ? 'Sichern' : 'Hinzufügen',
    onRight: save,
  });

  const el = sheet.el;
  const nameInput = el.querySelector('[name="name"]');
  const previewIcon = el.querySelector('[data-preview-icon]');
  const previewName = el.querySelector('[data-preview-name]');

  /* ---- Vorschau oben aktualisieren ---- */
  function updatePreview({ bumpIcon = false } = {}) {
    previewName.textContent = draft.name.trim() || 'Neuer Habit';
    previewName.classList.toggle('placeholder', !draft.name.trim());
    previewIcon.innerHTML = icon(draft.icon, { size: 34, stroke: 1.8 });
    if (bumpIcon) {
      previewIcon.classList.remove('bump');
      void previewIcon.offsetWidth;
      previewIcon.classList.add('bump');
    }
    el.querySelectorAll('[data-icon-opt]').forEach((b) => {
      const on = b.dataset.iconOpt === draft.icon;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
    sheet.setRightEnabled(Boolean(draft.name.trim()));
  }
  updatePreview();

  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value;
    el.querySelectorAll('.suggestion.selected').forEach((b) => b.classList.remove('selected'));
    updatePreview();
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  el.addEventListener('click', async (e) => {
    const sug = e.target.closest('[data-sug-name]');
    const opt = e.target.closest('[data-icon-opt]');
    const seg = e.target.closest('[data-since]');

    if (sug) {
      draft.name = sug.dataset.sugName;
      draft.icon = sug.dataset.sugIcon;
      nameInput.value = draft.name;
      el.querySelectorAll('.suggestion').forEach((b) => b.classList.toggle('selected', b === sug));
      haptic(5);
      updatePreview({ bumpIcon: true });
    } else if (opt) {
      draft.icon = opt.dataset.iconOpt;
      haptic(5);
      updatePreview({ bumpIcon: true });
    } else if (seg) {
      sinceMode = seg.dataset.since;
      seg.parentElement.dataset.index = sinceMode === 'start' ? '0' : '1';
      haptic(4);
    } else if (e.target.closest('[data-delete]')) {
      const ok = await confirmDialog({
        title: 'Habit löschen?',
        message: `„${habit.name}“ und alle Häkchen dazu werden gelöscht.`,
        confirmLabel: 'Löschen',
      });
      if (ok) {
        deleteHabit(habit.id);
        sheet.close();
        toast('Habit gelöscht', 'trash');
      }
    }
  });

  /* ---- Speichern ---- */
  function save() {
    const name = draft.name.trim();
    if (!name) return;

    let since;
    if (!canChooseSince) since = isEdit ? habit.since : (today < info.start ? info.start : today);
    else if (sinceMode === 'start') since = info.start;
    else since = isEdit && habit.since > info.start ? habit.since : today;

    if (isEdit) {
      updateHabit(habit.id, { name, icon: draft.icon, since });
      toast('Gespeichert');
    } else {
      addHabit({ name, icon: draft.icon, since });
      toast(`„${name}“ hinzugefügt`, 'plus');
    }
    haptic(10);
    sheet.close();
  }
}
