/* =========================================================
   Tab 4: EINSTELLUNGEN
   Arc-Zeitraum, Erinnerung, Backup, "Als App installieren", Reset.
   ========================================================= */
import { icon } from '../icons.js';
import { updateArc, setReminder } from '../store.js';
import { header, arcFields, bindArcFields } from './components.js';

export function renderSettings(el, ctx) {
  const { state, info } = ctx;
  const { enabled, time } = state.reminder;
  const finished = info.status === 'finished';

  el.innerHTML = `
    ${header('Winter Arc', 'Einstellungen')}

    <div class="section-label">Dein Arc</div>
    <div data-arc-fields>${arcFields(state.arc)}</div>
    <p class="footnote">Ändere Start oder Dauer jederzeit. Deine Häkchen bleiben gespeichert.</p>

    <div class="section-label">Erinnerung</div>
    <div class="list">
      <div class="row li">
        ${icon('bell', { size: 20 })}
        <span class="row-label">Tägliche Erinnerung</span>
        <button type="button" class="switch" role="switch" aria-checked="${enabled}" aria-label="Tägliche Erinnerung" data-action="reminder-toggle"></button>
      </div>
      ${enabled ? `
        <label class="row li">
          ${icon('clock', { size: 20 })}
          <span class="row-label">Uhrzeit</span>
          <input class="date-input" type="time" name="reminder-time" value="${time}" required>
        </label>
        <button type="button" class="row li row-btn" data-action="reminder-ics" ${finished ? 'disabled' : ''}>
          ${icon('calendar', { size: 20 })}<span>Wecker in Kalender laden</span>${icon('chevronRight', { size: 18, stroke: 2.2, cls: 'chev' })}
        </button>` : ''}
    </div>
    <p class="footnote">${enabled
      ? `Der Kalender-Termin klingelt jeden Tag um ${time} Uhr, auch wenn die App zu ist. Ab dann zeigt dir Winter Arc außerdem, was noch offen ist. Tipp: Lade den Wecker in <b>Safari</b>. Änderst du die Uhrzeit, lösch den alten Termin im Kalender und lade ihn neu.`
      : 'Schalte die Erinnerung ein, damit du keinen Tag vergisst.'}</p>

    <div class="section-label">Daten</div>
    <div class="list">
      <button type="button" class="row li row-btn" data-action="export">${icon('download', { size: 20 })}<span>Backup exportieren</span></button>
      <button type="button" class="row li row-btn" data-action="import">${icon('upload', { size: 20 })}<span>Backup importieren</span></button>
    </div>
    <input type="file" accept="application/json,.json" data-import-file hidden>
    <p class="footnote">Deine Daten liegen nur auf diesem Gerät (im Browser). Mach ab und zu ein Backup.</p>

    <div class="section-label">Als App nutzen</div>
    <div class="card install-card">
      <div class="install-step"><span class="install-num">1</span><span>Öffne Winter Arc in <b>Safari</b> und tippe auf <b>Teilen</b>.</span></div>
      <div class="install-step"><span class="install-num">2</span><span>Wähle <b>„Zum Home-Bildschirm“</b>.</span></div>
      <div class="install-step"><span class="install-num">3</span><span>Fertig. Winter Arc startet jetzt wie eine echte App, auch offline.</span></div>
    </div>
    <p class="footnote">Android: In Chrome über das Menü (⋮) „App installieren“ wählen.</p>

    <div class="section-label">Gefahrenzone</div>
    <div class="list">
      <button type="button" class="row li row-btn" data-action="reset">${icon('trash', { size: 20 })}<span>Alles zurücksetzen</span></button>
    </div>

    <p class="app-footer">Winter Arc · v2.0<br>Bleib eiskalt.</p>`;
}

export function mountSettings(el) {
  bindArcFields(el.querySelector('[data-arc-fields]'), { onChange: (arc) => updateArc(arc) });

  const timeInput = el.querySelector('[name="reminder-time"]');
  timeInput?.addEventListener('change', () => setReminder({ time: timeInput.value }));
}
