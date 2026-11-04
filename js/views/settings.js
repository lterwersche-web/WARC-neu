/* =========================================================
   Tab 4: EINSTELLUNGEN
   Arc-Zeitraum, Backup, "Als App installieren", Reset.
   ========================================================= */
import { icon } from '../icons.js';
import { updateArc } from '../store.js';
import { header, arcFields, bindArcFields } from './components.js';

export function renderSettings(el, ctx) {
  const { state } = ctx;
  el.innerHTML = `
    ${header('Winter Arc', 'Einstellungen')}

    <div class="section-label">Dein Arc</div>
    <div data-arc-fields>${arcFields(state.arc)}</div>
    <p class="footnote">Ändere Start oder Dauer jederzeit. Deine Häkchen bleiben gespeichert.</p>

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

    <p class="app-footer">Winter Arc · v1.0<br>Bleib eiskalt.</p>`;
}

export function mountSettings(el) {
  const root = el.querySelector('[data-arc-fields]');
  bindArcFields(root, { onChange: (arc) => updateArc(arc) });
}
