/* =========================================================
   ONBOARDING (erster Start)
   Schritt 1: Willkommen + Features
   Schritt 2: Zeitraum wählen → Arc starten
   ========================================================= */
import { icon } from '../icons.js';
import { toast } from '../ui/overlay.js';
import { snowBackground } from '../ui/snow.js';
import { arcFields, bindArcFields } from './components.js';

const FEATURES = [
  ['flame', 'Streaks', 'Bleib dran und sieh zu, wie deine Serien wachsen.'],
  ['grid', 'Arc-Kalender', 'Jeder Tag deines Arcs auf einen Blick.'],
  ['pen', 'Tagesnotiz', 'Halte fest, wie dein Tag wirklich lief.'],
  ['bolt', 'Täglicher Push', 'Jeden Tag ein neuer Gedanke, der dich antreibt.'],
];

export function renderOnboarding(el, ctx) {
  el.innerHTML = `
    <div class="onboarding">
      ${snowBackground()}
      ${ctx.ui.obStep === 1 ? stepWelcome() : stepTimeframe(ctx)}
    </div>`;
}

function stepWelcome() {
  return `
    <div class="ob-step">
      <div class="ob-logo">${icon('snowflake', { size: 46, stroke: 1.4 })}</div>
      <h1 class="ob-title">Winter Arc</h1>
      <p class="ob-sub">Während alle Winterschlaf machen, baust du dich auf.</p>
      <div class="features">
        ${FEATURES.map(([ic, title, text]) => `
          <div class="feature">
            <span class="feature-icon">${icon(ic, { size: 28, stroke: 1.8 })}</span>
            <div><h3>${title}</h3><p>${text}</p></div>
          </div>`).join('')}
      </div>
      <div class="ob-actions">
        <button type="button" class="btn-primary" data-action="ob-next">Los geht's</button>
      </div>
    </div>`;
}

function stepTimeframe(ctx) {
  return `
    <form class="ob-step" data-ob-form novalidate>
      <button type="button" class="back-btn" data-action="ob-back">${icon('chevronLeft', { size: 20, stroke: 2.4 })}Zurück</button>
      <h1 class="ob-title ob-left">Dein Zeitraum</h1>
      <p class="ob-sub ob-left">Wann startet dein Arc und wie lange geht er? Du kannst das später jederzeit ändern.</p>
      <div data-arc-fields>${arcFields(ctx.ui.obArc)}</div>
      <div class="ob-actions">
        <button type="submit" class="btn-primary">Arc starten</button>
      </div>
    </form>`;
}

export function mountOnboarding(el, ctx, { onStart }) {
  const form = el.querySelector('[data-ob-form]');
  if (!form) return;
  const fields = bindArcFields(form.querySelector('[data-arc-fields]'), {
    onChange: (arc) => {
      ctx.ui.obArc = arc;
    },
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const arc = fields.read();
    if (!arc.start) {
      toast('Wähl ein Startdatum', 'clock');
      return;
    }
    onStart(arc);
  });
}
