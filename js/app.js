/* =========================================================
   WINTER ARC – Einstiegspunkt der App

   Ablauf in einem Satz:
   Nutzer tippt → Aktion ändert den Store → Store sagt "geändert!"
   → render() zeichnet die aktuelle Ansicht neu.

   Das nennt man "unidirektionaler Datenfluss" – Daten fließen
   immer nur in eine Richtung. Macht Bugs viel seltener.
   ========================================================= */
import {
  getState, subscribe, flush, toggleHabit, addHabit, moveHabit,
  startArc, exportData, importData, resetAll, setNote, setReminder,
} from './store.js';
import { todayKey } from './dates.js';
import { arcInfo, dayProgress } from './stats.js';
import { nudgeFor, downloadReminder } from './reminder.js';
import { icon } from './icons.js';
import { haptic } from './utils.js';
import { toast, confirmDialog } from './ui/overlay.js';
import { snowBurst } from './ui/snow.js';
import { animateRings } from './views/components.js';
import { renderToday, mountToday, autoGrow } from './views/today.js';
import { renderProgress } from './views/progress.js';
import { renderHabits } from './views/habits.js';
import { renderSettings, mountSettings } from './views/settings.js';
import { renderOnboarding, mountOnboarding } from './views/onboarding.js';
import { openHabitSheet } from './views/habitSheet.js';

const appEl = document.getElementById('app');
const tabbarEl = document.getElementById('tabbar');

const TABS = [
  { id: 'today', label: 'Heute', icon: 'checkCircle' },
  { id: 'progress', label: 'Fortschritt', icon: 'chart' },
  { id: 'habits', label: 'Habits', icon: 'list' },
  { id: 'settings', label: 'Einstellungen', icon: 'sliders' },
];

const VIEWS = {
  today: { render: renderToday, mount: mountToday },
  progress: { render: renderProgress },
  habits: { render: renderHabits },
  settings: { render: renderSettings, mount: mountSettings },
};

/* UI-Zustand: Dinge, die NICHT gespeichert werden müssen
   (welcher Tab offen ist, welcher Tag ausgewählt ist …) */
const ui = {
  tab: 'today',
  prevTab: null,
  selectedDate: null,
  ringFrom: null,
  lastToggled: null,
  centerStrip: true,
  editMode: false,
  obStep: 1,
  obArc: { start: todayKey(), days: 90 },
};

function getCtx() {
  const state = getState();
  const today = todayKey();
  return { state, ui, today, info: arcInfo(state.arc, today) };
}

/* =========================================================
   RENDERN
   ========================================================= */
let enterTimer = null;

function render() {
  const ctx = getCtx();
  const onboarded = ctx.state.onboarded;

  tabbarEl.hidden = !onboarded;
  document.body.classList.toggle('has-tabbar', onboarded);
  appEl.classList.toggle('is-onboarding', !onboarded);

  if (!onboarded) {
    renderOnboarding(appEl, ctx);
    mountOnboarding(appEl, ctx, { onStart: handleStart });
    ui.prevTab = null;
    return;
  }

  // Ausgewählten Tag gültig halten (nicht in der Zukunft, nicht vor dem Start)
  const { info } = ctx;
  if (info.status === 'upcoming') ui.selectedDate = null;
  else if (!ui.selectedDate || ui.selectedDate < info.start || ui.selectedDate > info.lastDay) {
    ui.selectedDate = info.lastDay;
  }

  const tabChanged = ui.prevTab !== ui.tab;
  if (tabChanged) ui.ringFrom = 0;
  const prevScroll = tabChanged ? null : appEl.querySelector('[data-strip]')?.scrollLeft ?? null;

  const view = VIEWS[ui.tab];
  view.render(appEl, ctx);
  view.mount?.(appEl, ctx);

  if (tabChanged) {
    playEnterAnimation();
    window.scrollTo(0, 0);
  }

  ui.prevTab = ui.tab;
  updateTabbar();
  animateRings(appEl);
  syncStrip(prevScroll, !tabChanged);
  ui.ringFrom = null;
  ui.lastToggled = null;
}

function playEnterAnimation() {
  appEl.classList.remove('view-enter');
  void appEl.offsetWidth; // Trick: zwingt den Browser, die Animation neu zu starten
  appEl.classList.add('view-enter');
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => appEl.classList.remove('view-enter'), 1300);
}

/** Tages-Leiste: Scroll-Position merken bzw. ausgewählten Tag in die Mitte holen. */
function syncStrip(prevScroll, smooth) {
  const strip = appEl.querySelector('[data-strip]');
  if (!strip) return;
  if (prevScroll != null) strip.scrollLeft = prevScroll;
  if (ui.centerStrip) {
    const sel = strip.querySelector('.day.selected');
    if (sel) {
      const left = sel.offsetLeft - (strip.clientWidth - sel.offsetWidth) / 2;
      strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }
  }
  ui.centerStrip = false;
}

/* =========================================================
   TAB-BAR
   ========================================================= */
function buildTabbar() {
  tabbarEl.innerHTML = `
    <div class="tabbar-inner">
      <span class="tab-thumb" aria-hidden="true"></span>
      ${TABS.map((t) => `
        <button type="button" class="tab" data-tab="${t.id}">
          ${icon(t.icon, { size: 22, stroke: 2 })}
          <span>${t.label}</span>
        </button>`).join('')}
    </div>`;

  tabbarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });
}

function updateTabbar() {
  const index = TABS.findIndex((t) => t.id === ui.tab);
  tabbarEl.querySelector('.tabbar-inner')?.style.setProperty('--i', index);
  tabbarEl.querySelectorAll('[data-tab]').forEach((b) => {
    if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

function switchTab(id) {
  if (id === ui.tab) {
    // Wie bei iOS: Nochmal auf den aktiven Tab tippen → nach oben scrollen
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  ui.tab = id;
  ui.editMode = false;
  ui.centerStrip = true;
  haptic(4);
  render();
}

/* =========================================================
   AKTIONEN (alles mit data-action="…" im HTML)
   ========================================================= */
function defaultSince(info, today) {
  return info.status === 'active' ? today : info.start;
}

const actions = {
  toggle(el) {
    const date = ui.selectedDate;
    const id = el.dataset.id;
    ui.ringFrom = dayProgress(getState(), date).ratio; // Ring animiert vom alten Wert aus
    ui.lastToggled = id;
    const nowDone = toggleHabit(date, id); // → Store ändert sich → render()
    haptic(nowDone ? 12 : 6);
    if (nowDone && dayProgress(getState(), date).perfect) {
      snowBurst();
      toast('Perfekter Tag. Stark.', 'snowflake');
    }
  },

  'select-day'(el) {
    ui.selectedDate = el.dataset.date;
    ui.centerStrip = true;
    haptic(4);
    render();
  },

  'go-today'() {
    ui.selectedDate = null; // render() setzt dann automatisch den aktuellen Tag
    ui.centerStrip = true;
    render();
  },

  'add-habit'() {
    openHabitSheet(getCtx());
  },

  'edit-habit'(el) {
    const habit = getState().habits.find((h) => h.id === el.dataset.id);
    if (habit) openHabitSheet(getCtx(), { habit });
  },

  'suggest-edit'(el) {
    openHabitSheet(getCtx(), { prefill: { name: el.dataset.name, icon: el.dataset.icon } });
  },

  'suggest-add'(el) {
    const { info, today } = getCtx();
    addHabit({ name: el.dataset.name, icon: el.dataset.icon, since: defaultSince(info, today) });
    haptic(10);
    toast(`„${el.dataset.name}“ hinzugefügt`, 'plus');
  },

  'toggle-edit'() {
    ui.editMode = !ui.editMode;
    render();
  },

  move(el) {
    moveHabit(el.dataset.id, Number(el.dataset.dir));
    haptic(4);
  },

  'heat-day'(el) {
    ui.selectedDate = el.dataset.date;
    ui.tab = 'today';
    ui.centerStrip = true;
    haptic(4);
    render();
  },

  'goto-tab'(el) {
    switchTab(el.dataset.tab);
  },

  export() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `winter-arc-backup-${todayKey()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup erstellt', 'download');
  },

  'reminder-toggle'() {
    const enabled = !getState().reminder.enabled;
    setReminder({ enabled });
    haptic(8);
    if (enabled) toast('Erinnerung an. Lade jetzt den Wecker in deinen Kalender.', 'bell');
  },

  'reminder-ics'() {
    const { state, info, today } = getCtx();
    downloadReminder(state, info, today);
    toast('Kalender-Wecker erstellt', 'calendar');
  },

  import() {
    const input = appEl.querySelector('[data-import-file]');
    if (!input) return;
    input.value = '';
    input.click();
  },

  async reset() {
    const ok = await confirmDialog({
      title: 'Alles zurücksetzen?',
      message: 'Alle Habits, Häkchen und Notizen werden gelöscht. Das kann man nicht rückgängig machen.',
      confirmLabel: 'Löschen',
    });
    if (!ok) return;
    Object.assign(ui, { tab: 'today', prevTab: null, selectedDate: null, obStep: 1, obArc: { start: todayKey(), days: 90 } });
    resetAll();
    window.scrollTo(0, 0);
  },

  'ob-next'() {
    ui.obStep = 2;
    render();
    window.scrollTo(0, 0);
  },

  'ob-back'() {
    ui.obStep = 1;
    render();
  },
};

function handleStart(arc) {
  Object.assign(ui, { tab: 'today', prevTab: null, selectedDate: null, centerStrip: true });
  startArc(arc);
  haptic(12);
  toast('Dein Arc läuft. Zieh durch!', 'snowflake');
}

/* =========================================================
   EVENTS
   Statt jedem Button einen eigenen Listener zu geben, hören wir
   EINMAL auf #app und schauen, worauf geklickt wurde.
   Das nennt man "Event Delegation".
   ========================================================= */
appEl.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target || target.disabled) return;
  actions[target.dataset.action]?.(target, e);
});

// Notiz tippen → speichern (ohne neu zu rendern, sonst springt der Cursor)
let noteTimer = null;
appEl.addEventListener('input', (e) => {
  if (!e.target.matches('[data-note]') || !ui.selectedDate) return;
  autoGrow(e.target);
  setNote(ui.selectedDate, e.target.value);
  const status = appEl.querySelector('[data-note-status]');
  if (!status) return;
  status.textContent = 'Speichert …';
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    status.textContent = e.target.value.trim() ? 'Gespeichert' : '';
  }, 700);
});

// Backup-Datei ausgewählt
appEl.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-import-file]')) return;
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const ok = await confirmDialog({
      title: 'Backup importieren?',
      message: 'Deine aktuellen Daten werden durch das Backup ersetzt.',
      confirmLabel: 'Importieren',
    });
    if (!ok) return;
    ui.selectedDate = null;
    ui.centerStrip = true;
    importData(text);
    toast('Backup importiert');
  } catch {
    toast('Das ist kein gültiges Backup', 'ban');
  }
});

/* ---------- Neuer Tag? Erinnerungs-Zeit erreicht? ----------
   Läuft jede Minute und wenn du die App wieder öffnest. */
let knownDay = todayKey();
let knownNudge = null;

function nudgeKey() {
  const { state, info, today } = getCtx();
  const nudge = nudgeFor(state, info, today, today);
  return nudge ? `${nudge.open}` : '';
}

function checkClock() {
  const now = todayKey();
  if (now !== knownDay) {
    knownDay = now;
    ui.selectedDate = null;
    ui.centerStrip = true;
    render();
  } else if (ui.tab === 'today' && nudgeKey() !== knownNudge) {
    render();
  }
  knownNudge = nudgeKey();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
  else checkClock();
});
window.addEventListener('pagehide', flush);
setInterval(checkClock, 60_000);

/* ---------- Offline-Fähigkeit (Service Worker) ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Kein Problem – dann eben ohne Offline-Modus */
    });
  });
}

/* ---------- Los geht's ---------- */
subscribe(render);
buildTabbar();
render();
knownNudge = nudgeKey();
