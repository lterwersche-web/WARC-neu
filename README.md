# ❄ Winter Arc

**Dein Habit Tracker für den Winter Arc.** Während alle Winterschlaf machen, baust du dich auf.

Clean, schwarz-weiß und im Apple-Look. Läuft im Browser und lässt sich auf dem iPhone wie eine echte App installieren, auch offline.

---

## Features

| Feature | Was es macht |
|---|---|
| **Eigener Zeitraum** | Startdatum und Dauer (1–365 Tage) frei wählbar, jederzeit änderbar |
| **Habits** | Startet leer, mit 13 Vorschlägen: direkt hinzufügen (`+`) oder vorher anpassen |
| **Tages-Leiste** | Durch alle Arc-Tage wischen, jeder Tag mit eigenem Fortschrittsring |
| **Fortschrittsring** | Zeigt, wie viel du heute geschafft hast. Perfekter Tag = Schneefall ❄ |
| **Streaks** | Serien pro Habit und für perfekte Tage (heute zählt erst, wenn er vorbei ist) |
| **Kalender-Heatmap** | Alle Arc-Tage auf einen Blick: je heller, desto mehr geschafft |
| **Tagesnotiz** | Kurzes Journal pro Tag, speichert automatisch |
| **Gedanke des Tages** | Jeden Tag ein neues Motivations-Zitat |
| **Backup** | Daten als JSON exportieren und wieder importieren |
| **Offline & installierbar** | PWA mit Service Worker |

---

## Starten

Die App braucht keine Installation und kein `npm install`. Nur ein kleiner lokaler Server, weil Browser JavaScript-Module (`import`/`export`) nicht direkt von der Festplatte laden:

```bash
# im Projektordner
python3 -m http.server 8000
```

Dann im Browser öffnen: **http://localhost:8000**

> **Tipp:** Wenn du Code änderst und nichts passiert, lade die Seite **zweimal** neu. Der Service Worker liefert erst die gespeicherte Version aus und holt die neue im Hintergrund.

### Auf dem iPhone installieren

1. Die App online stellen (z. B. mit GitHub Pages, siehe unten)
2. In **Safari** öffnen → **Teilen** → **„Zum Home-Bildschirm“**
3. Fertig, Winter Arc startet jetzt im Vollbild wie eine echte App

### Mit GitHub Pages online stellen

1. Auf GitHub ins Repo → **Settings** → **Pages**
2. Bei *Source* den Branch auswählen (z. B. `main`) und Ordner `/ (root)`
3. Nach ca. 1 Minute ist die App unter `https://<dein-name>.github.io/<repo>/` erreichbar

---

## Projektstruktur

```
WARC/
├── index.html            ← Das HTML-Gerüst (fast leer, JS füllt es)
├── manifest.webmanifest  ← Infos für "Als App installieren" (Name, Icon, Farben)
├── sw.js                 ← Service Worker: macht die App offline-fähig
├── css/
│   └── style.css         ← Das komplette Design (Farben, Layout, Animationen)
├── icons/                ← App-Icon in verschiedenen Größen
└── js/
    ├── app.js            ← Startpunkt: verbindet alles, reagiert auf Klicks
    ├── store.js          ← Datenspeicher (localStorage) + alle Änderungen
    ├── stats.js          ← Rechnet Streaks, Quoten, Fortschritt aus
    ├── dates.js          ← Datum-Helfer ("2026-11-04" rechnen & formatieren)
    ├── icons.js          ← Alle Icons als SVG
    ├── quotes.js         ← Motivations-Zitate
    ├── suggestions.js    ← Habit-Vorschläge
    ├── utils.js          ← Kleine Helfer (z. B. Text sicher machen)
    ├── ui/
    │   ├── overlay.js    ← Bottom-Sheet, Dialog, Toast
    │   └── snow.js       ← Schnee-Effekte
    └── views/            ← Die einzelnen Screens
        ├── today.js      ← Tab "Heute"
        ├── progress.js   ← Tab "Fortschritt"
        ├── habits.js     ← Tab "Habits"
        ├── settings.js   ← Tab "Einstellungen"
        ├── onboarding.js ← Willkommens-Screens beim ersten Start
        ├── habitSheet.js ← Sheet zum Erstellen/Bearbeiten
        └── components.js ← Wiederverwendbare Bausteine (Ring, Header …)
```

---

## So funktioniert's (für Lernende)

### 1. Datenfluss in eine Richtung

```
 Du tippst  →  Aktion (app.js)  →  Store ändert Daten (store.js)
                                         │
 Bildschirm  ←  render() zeichnet neu  ←─┘  "Hey, was hat sich geändert!"
```

Die Oberfläche ändert nie direkt Daten. Sie ruft eine Funktion im Store auf (`toggleHabit`, `addHabit` …), der Store speichert und sagt allen Bescheid, und dann wird neu gezeichnet. Das nennt man **unidirektionalen Datenfluss**, das gleiche Prinzip wie bei React.

### 2. So sehen die gespeicherten Daten aus

```js
{
  arc:    { start: "2026-11-04", days: 90 },
  habits: [{ id: "…", name: "Gym", icon: "dumbbell", since: "2026-11-04" }],
  logs:   { "2026-11-04": ["id-von-gym", "id-von-wasser"] },  // erledigt pro Tag
  notes:  { "2026-11-04": "Heute 5 km gelaufen" }
}
```

Tage werden als Text `"YYYY-MM-DD"` gespeichert. Den kann man einfach vergleichen (`"2026-11-04" < "2026-11-05"`), und es gibt keinen Zeitzonen-Stress.

### 3. Event Delegation

Statt jedem Button einen eigenen Klick-Listener zu geben, hört `app.js` **einmal** auf den ganzen Bildschirm und schaut nach `data-action="…"`:

```html
<button data-action="toggle" data-id="abc">…</button>
```

```js
actions[target.dataset.action](target);   // → actions.toggle(target)
```

### 4. Design-Tokens

Alle Farben, Radien und Animationskurven stehen ganz oben in `css/style.css` unter `:root`. Willst du z. B. eine Akzentfarbe, änderst du **eine** Zeile und sie wirkt überall.

---

## Datenschutz

Alle Daten bleiben **nur auf deinem Gerät** (im `localStorage` des Browsers). Es gibt keinen Server, kein Tracking und keinen Account. Darum regelmäßig ein Backup exportieren.
