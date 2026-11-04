/* =========================================================
   Motivations-Zitate – jeden Tag ein anderes.
   ========================================================= */
import { daySeed } from './dates.js';

const QUOTES = [
  'Der Winter fragt nicht, ob du Lust hast.',
  'Disziplin heißt: Du machst es trotzdem.',
  'Kleine Schritte. Jeden Tag. Keine Ausreden.',
  'Während andere Winterschlaf machen, baust du dich auf.',
  'Motivation kommt und geht. Gewohnheiten bleiben.',
  'Kalt draußen. Fokus drinnen.',
  'Du musst nicht perfekt sein. Nur konsequent.',
  'Im Frühling sehen alle das Ergebnis. Jetzt siehst nur du die Arbeit.',
  'Ein Häkchen mehr als gestern reicht.',
  'Die beste Version von dir entsteht im Winter.',
  'Keiner schaut zu. Genau deshalb zählt es.',
  'Fang an, bevor du dich bereit fühlst.',
  'Dein zukünftiges Ich schaut dir gerade zu.',
  'Komfort ist der größte Gegner deines Arcs.',
  'Heute ist kein Tag zum Aufgeben.',
  'Stille Arbeit, lauter Erfolg.',
  'Jeder Tag ist ein neuer Rep.',
  'Wer im Dunkeln trainiert, glänzt im Licht.',
  'Zieh es durch, auch wenn es niemand merkt.',
  'Schwer heißt nicht unmöglich.',
  'Nicht verhandeln. Machen.',
  'Die Kälte macht dich nicht schwächer, sondern härter.',
  'Erst die Gewohnheit, dann das Ergebnis.',
  'Ein verpasster Tag ist ein Ausrutscher. Zwei sind ein Muster.',
  'Weniger scrollen, mehr wachsen.',
  'Mach es heute so, dass du morgen stolz bist.',
  'Langsam ist okay. Stillstand nicht.',
  'Dein Arc, deine Regeln, dein Tempo.',
  'Konstanz schlägt Intensität.',
  'Bequem war gestern.',
  'Die Nächte werden länger. Deine Disziplin auch.',
  'Lass die Ergebnisse für dich sprechen.',
  'Eiskalt bleiben. Weitermachen.',
  'Was du täglich tust, formt, wer du wirst.',
  'Ausreden wärmen nicht.',
  'Ein Tag nach dem anderen. Bis zum Frühling.',
  'Gewinne den Morgen, gewinne den Tag.',
  'Leise grinden, laut zurückkommen.',
  'Selbstrespekt heißt: Versprechen an dich selbst halten.',
  'Der Arc endet. Die Gewohnheiten bleiben.',
];

/** Gibt für jeden Tag immer dasselbe Zitat zurück (aber jeden Tag ein anderes). */
export function quoteFor(dateKey) {
  return QUOTES[daySeed(dateKey) % QUOTES.length];
}
