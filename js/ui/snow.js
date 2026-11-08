/* =========================================================
   Schnee ❄
   - snowBurst(): kurzer Schneefall als Belohnung (perfekter Tag)
   - snowBackground(): ruhiger Dauer-Schneefall im Hintergrund
   ========================================================= */
import { prefersReducedMotion } from '../utils.js';

const rand = (min, max) => min + Math.random() * (max - min);

/* Reinweiße Flocken in verschiedenen Größen – Tiefe entsteht nur durch Größe & Tempo */
function flakeStyle({ duration, delay }) {
  const size = rand(2, 6.5);
  return [
    `left:${rand(0, 100).toFixed(2)}%`,
    `width:${size.toFixed(1)}px`,
    `height:${size.toFixed(1)}px`,
    `--dx:${rand(-60, 60).toFixed(0)}px`,
    `animation-duration:${duration.toFixed(2)}s`,
    `animation-delay:${delay.toFixed(2)}s`,
  ].join(';');
}

/** Einmaliger Schneefall über den ganzen Bildschirm. */
export function snowBurst(count = 44) {
  if (prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'snow-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const flake = document.createElement('span');
    flake.className = 'flake';
    flake.style.cssText = flakeStyle({ duration: rand(2.4, 4.4), delay: rand(0, 0.9) });
    layer.append(flake);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 6000);
}

/** HTML für endlosen, ruhigen Hintergrund-Schnee (Onboarding). */
export function snowBackground(count = 28) {
  if (prefersReducedMotion()) return '';
  let html = '';
  for (let i = 0; i < count; i++) {
    const duration = rand(10, 20);
    // Negative Verzögerung = Flocke ist beim Start schon "mitten im Fall"
    html += `<span class="flake flake-bg" style="${flakeStyle({ duration, delay: -rand(0, duration) })}"></span>`;
  }
  return `<div class="snow-bg" aria-hidden="true">${html}</div>`;
}
