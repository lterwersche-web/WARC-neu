/* =========================================================
   Bottom-Sheet: Habit erstellen oder bearbeiten
   ========================================================= */
import { icon, HABIT_ICONS, ICON_LABELS } from '../icons.js';
import { esc, haptic } from '../utils.js';
import { formatShort } from '../dates.js';
import { addHabit, updateHabit, deleteHabit } from '../store.js';
import { scheduleLabel, WEEKDAYS_SHORT, WEEKDAYS_LONG } from '../stats.js';
import { SUGGESTIONS } from '../suggestions.js';
import { openSheet, confirmDialog, toast } from '../ui/overlay.js';
import { segmented, selectSegment } from './components.js';

const RHYTHM_HINTS = {
  daily: 'Jeden Tag fällig.',
  days: 'Nur an diesen Tagen fällig. An den anderen hast du Pause, und deine Serie läuft weiter.',
  weekly: 'Egal an welchem Tag. Zählt als Bonus: Abhaken bringt dir was, auslassen kostet keinen perfekten Tag.',
};

/**
 * @param ctx      aktueller App-Kontext (state, today, info)
 * @param habit    vorhandener Habit → Bearbeiten-Modus
 * @param prefill  { name, icon } → Neuer Habit, schon ausgefüllt (aus Vorschlag)
 */
export function openHabitSheet(ctx, { habit = null, prefill = null } = {}) {
  const { state, today, info } = ctx;
  const isEdit = Boolean(habit);
  const current = habit?.schedule ?? { type: 'daily' };
  const draft = {
    name: habit?.name ?? prefill?.name ?? '',
    icon: habit?.icon ?? prefill?.icon ?? 'star',
    rhythm: current.type,
    days: current.type === 'days' ? [...current.days] : [0, 2, 4],
    times: current.type === 'weekly' ? current.times : 3,
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

  const rhythmSection = `
    <div class="sheet-section">
      <div class="section-label">Rhythmus</div>
      ${segmented('rhythm', [
        { value: 'daily', label: 'Täglich' },
        { value: 'days', label: 'Feste Tage' },
        { value: 'weekly', label: 'X pro Woche' },
      ], draft.rhythm)}
      <div class="rhythm-detail" data-detail="days" ${draft.rhythm === 'days' ? '' : 'hidden'}>
        <div class="weekdays" role="group" aria-label="Wochentage">
          ${WEEKDAYS_SHORT.map((d, i) => `<button type="button" class="wd" data-wd="${i}" aria-pressed="${draft.days.includes(i)}" aria-label="${WEEKDAYS_LONG[i]}">${d}</button>`).join('')}
        </div>
      </div>
      <div class="rhythm-detail" data-detail="weekly" ${draft.rhythm === 'weekly' ? '' : 'hidden'}>
        <div class="list">
          <div class="row">
            <span class="row-label">Ziel</span>
            <div class="stepper">
              <button type="button" data-times="-1" aria-label="Weniger">${icon('minus', { size: 16, stroke: 2.6 })}</button>
              <span class="stepper-value" data-times-value>${draft.times}</span>
              <span class="stepper-unit">× pro Woche</span>
              <button type="button" data-times="1" aria-label="Mehr">${icon('plus', { size: 16, stroke: 2.6 })}</button>
            </div>
          </div>
        </div>
      </div>
      <p class="footnote" data-rhythm-hint>${RHYTHM_HINTS[draft.rhythm]}</p>
    </div>`;

  const sinceSection = !canChooseSince ? '' : `
    <div class="sheet-section">
      <div class="section-label">Zählt ab</div>
      ${segmented('since', [
        { value: 'start', label: 'Ab Arc-Start' },
        { value: 'later', label: laterLabel },
      ], sinceMode)}
      <p class="footnote">Ab wann zählt der Habit für Serien und Statistik? Mit „Ab Arc-Start“ kannst du vergangene Tage nachtragen.</p>
    </div>`;

  const body = `
    <div class="preview">
      <div class="preview-icon" data-preview-icon>${icon(draft.icon, { size: 34, stroke: 1.8 })}</div>
      <div class="preview-name ${draft.name ? '' : 'placeholder'}" data-preview-name>${esc(draft.name || 'Neuer Habit')}</div>
      <div class="preview-rhythm" data-preview-rhythm></div>
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
    ${rhythmSection}
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
  const previewRhythm = el.querySelector('[data-preview-rhythm]');

  function currentSchedule() {
    if (draft.rhythm === 'days') return { type: 'days', days: [...draft.days].sort((a, b) => a - b) };
    if (draft.rhythm === 'weekly') return { type: 'weekly', times: draft.times };
    return { type: 'daily' };
  }

  /* ---- Vorschau oben aktualisieren ---- */
  function updatePreview({ bumpIcon = false } = {}) {
    previewName.textContent = draft.name.trim() || 'Neuer Habit';
    previewName.classList.toggle('placeholder', !draft.name.trim());
    previewIcon.innerHTML = icon(draft.icon, { size: 34, stroke: 1.8 });
    previewRhythm.textContent = draft.rhythm === 'days' && !draft.days.length ? 'Wähl mindestens einen Tag' : scheduleLabel(currentSchedule());
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
    const valid = Boolean(draft.name.trim()) && !(draft.rhythm === 'days' && !draft.days.length);
    sheet.setRightEnabled(valid);
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
    const seg = e.target.closest('[data-seg-value]');
    const wd = e.target.closest('[data-wd]');
    const times = e.target.closest('[data-times]');

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
      const group = seg.closest('[data-seg]');
      selectSegment(group, seg.dataset.segValue);
      if (group.dataset.seg === 'since') sinceMode = seg.dataset.segValue;
      if (group.dataset.seg === 'rhythm') {
        draft.rhythm = seg.dataset.segValue;
        el.querySelectorAll('[data-detail]').forEach((d) => { d.hidden = d.dataset.detail !== draft.rhythm; });
        el.querySelector('[data-rhythm-hint]').textContent = RHYTHM_HINTS[draft.rhythm];
        updatePreview();
      }
      haptic(4);
    } else if (wd) {
      const day = Number(wd.dataset.wd);
      draft.days = draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day];
      wd.setAttribute('aria-pressed', String(draft.days.includes(day)));
      haptic(4);
      updatePreview();
    } else if (times) {
      draft.times = Math.min(6, Math.max(1, draft.times + Number(times.dataset.times)));
      el.querySelector('[data-times-value]').textContent = draft.times;
      haptic(4);
      updatePreview();
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
    if (draft.rhythm === 'days' && !draft.days.length) {
      toast('Wähl mindestens einen Tag', 'calendar');
      return;
    }

    let since;
    if (!canChooseSince) since = isEdit ? habit.since : (today < info.start ? info.start : today);
    else if (sinceMode === 'start') since = info.start;
    else since = isEdit && habit.since > info.start ? habit.since : today;

    const schedule = currentSchedule();
    if (isEdit) {
      updateHabit(habit.id, { name, icon: draft.icon, since, schedule });
      toast('Gespeichert');
    } else {
      addHabit({ name, icon: draft.icon, since, schedule });
      toast(`„${name}“ hinzugefügt`, 'plus');
    }
    haptic(10);
    sheet.close();
  }
}
