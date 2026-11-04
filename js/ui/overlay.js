/* =========================================================
   Overlays: Bottom-Sheet, Bestätigungs-Dialog & Toast
   (alles, was ÜBER der App erscheint – wie bei iOS)
   ========================================================= */
import { esc } from '../utils.js';
import { icon } from '../icons.js';

/* ---------- Scrollen der Seite sperren, solange ein Overlay offen ist ---------- */
let locks = 0;
function lockScroll() {
  locks++;
  document.documentElement.classList.add('no-scroll');
}
function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (!locks) document.documentElement.classList.remove('no-scroll');
}

/**
 * Bottom-Sheet (fährt von unten rein, kann man runterwischen).
 * Gibt { el, close, setRightEnabled } zurück.
 */
export function openSheet({ title, body, rightLabel = 'Fertig', onRight }) {
  const root = document.createElement('div');
  root.className = 'sheet-root';
  root.innerHTML = `
    <div class="sheet-backdrop"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="sheet-header">
        <div class="sheet-grabber"></div>
        <div class="sheet-bar">
          <button type="button" class="sheet-btn" data-sheet="cancel">Abbrechen</button>
          <h2 class="sheet-title">${esc(title)}</h2>
          <button type="button" class="sheet-btn sheet-btn-primary" data-sheet="confirm">${esc(rightLabel)}</button>
        </div>
      </header>
      <div class="sheet-body">${body}</div>
    </section>`;

  document.body.append(root);
  lockScroll();

  const sheet = root.querySelector('.sheet');
  const backdrop = root.querySelector('.sheet-backdrop');
  const confirmBtn = root.querySelector('[data-sheet="confirm"]');

  // Ein Frame warten, damit die Einfahr-Animation startet
  void root.offsetHeight;
  root.classList.add('open');

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    root.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    unlockScroll();
    setTimeout(() => root.remove(), 450);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);

  backdrop.addEventListener('click', close);
  root.querySelector('[data-sheet="cancel"]').addEventListener('click', close);
  confirmBtn.addEventListener('click', () => onRight?.());

  /* ---- Runterwischen zum Schließen ---- */
  const header = root.querySelector('.sheet-header');
  let startY = null;
  let startTime = 0;
  let dy = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    startY = e.clientY;
    startTime = performance.now();
    dy = 0;
    sheet.classList.add('dragging');
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove', (e) => {
    if (startY == null) return;
    dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    backdrop.style.opacity = String(1 - Math.min(dy / 500, 0.6));
  });
  const endDrag = () => {
    if (startY == null) return;
    const speed = dy / Math.max(1, performance.now() - startTime);
    startY = null;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    backdrop.style.opacity = '';
    if (dy > 120 || speed > 0.7) close();
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);

  return {
    el: sheet,
    close,
    setRightEnabled(enabled) {
      confirmBtn.disabled = !enabled;
    },
  };
}

/**
 * Apple-Style Dialog mit "Abbrechen" und Bestätigen.
 * Gibt ein Promise zurück: true = bestätigt, false = abgebrochen.
 * Benutzung: if (await confirmDialog({...})) { … }
 */
export function confirmDialog({ title, message = '', confirmLabel = 'OK', cancelLabel = 'Abbrechen' }) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'alert-root';
    root.innerHTML = `
      <div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="alert-title">
        <div class="alert-body">
          <h2 class="alert-title" id="alert-title">${esc(title)}</h2>
          ${message ? `<p class="alert-msg">${esc(message)}</p>` : ''}
        </div>
        <div class="alert-actions">
          <button type="button" data-answer="no">${esc(cancelLabel)}</button>
          <button type="button" data-answer="yes">${esc(confirmLabel)}</button>
        </div>
      </div>`;

    document.body.append(root);
    lockScroll();
    void root.offsetHeight;
    root.classList.add('open');
    root.querySelector('[data-answer="yes"]').focus({ preventScroll: true });

    const finish = (answer) => {
      root.classList.remove('open');
      document.removeEventListener('keydown', onKey, true);
      unlockScroll();
      setTimeout(() => root.remove(), 250);
      resolve(answer);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      finish(false);
    };
    document.addEventListener('keydown', onKey, true);

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-answer]');
      if (btn) finish(btn.dataset.answer === 'yes');
      else if (e.target === root) finish(false);
    });
  });
}

/* ---------- Toast: kurze Info oben (wie die Dynamic Island) ---------- */
let toastEl = null;
let toastTimer = null;

export function toast(text, iconName = 'check') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.append(toastEl);
  }
  toastEl.innerHTML = `${icon(iconName, { size: 16, stroke: 2.6 })}<span></span>`;
  toastEl.querySelector('span').textContent = text;

  void toastEl.offsetHeight;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
