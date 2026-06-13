# Etappe 1 – Timer-MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein voll funktionsfähiger Intervall-Trainings-Timer als Web-App (beide Bildschirme, gespeicherte Einstellungen, konfigurierbare Signaltöne); Puls zunächst als manueller Test-Wert.

**Architecture:** Reines HTML/CSS/JavaScript mit nativen ES-Modulen, kein Build-Schritt. Die reine Logik (Einstellungen, Timer-Maschine, Klang-Zuordnung) liegt in eigenständigen, per Vitest getesteten Modulen. Die Oberfläche und die Tonausgabe sind dünne Browser-Schichten, die diese Module nutzen und manuell geprüft werden.

**Tech Stack:** HTML5, CSS3, JavaScript (ES-Module), Web Audio API (Tonerzeugung), Vitest (Tests, läuft über Node/npm).

**Testing-Strategie:** Vitest testet die DOM-freien Module (`settings.js`, `timer.js`, `sound.js`-Datenanteile). Persistenz wird über ein injizierbares Speicher-Objekt getestet (kein jsdom nötig). Oberfläche, Tonausgabe und das Zusammenspiel werden über klar beschriebene manuelle Browser-Checks geprüft.

**Hinweis zur Abgrenzung (laut Spec):** Pulszonen-Einfärbung und Puls-Alarm gehören zu Etappe 2. In Etappe 1 wird der Puls als schlichter (weißer) Test-Wert angezeigt; die Pulsgrenzen lassen sich aber bereits einstellen und werden gespeichert. Bluetooth ist nicht Teil von Etappe 1.

---

## Datei-Struktur (nach Etappe 1)

```
Traings App/
├── index.html              # Grundgerüst beider Bildschirme
├── css/
│   └── style.css           # gesamtes Styling (Layout C + Einstellungen)
├── js/
│   ├── settings.js         # Einstellungs-Modell, Validierung, Laden/Speichern
│   ├── timer.js            # Timer-Zustandsmaschine (Phasen, Countdown, Runden)
│   ├── sound.js            # Klang-Bibliothek + Tonausgabe (Web Audio)
│   ├── ui.js               # Zeichnen/Aktualisieren beider Bildschirme
│   └── app.js              # verdrahtet alles, Start/Tick-Schleife
├── tests/
│   ├── settings.test.js
│   ├── timer.test.js
│   └── sound.test.js
├── package.json            # Vitest als Dev-Abhängigkeit, npm test
├── .gitignore
└── docs/superpowers/...    # Spec & Pläne (bereits vorhanden)
```

Jede Datei hat eine klare Aufgabe; `app.js` ist der einzige Ort, der die Module verbindet und Browser-APIs (`setInterval`, `localStorage`, `AudioContext`, DOM) anstößt.

---

## Task 1: Projekt-Gerüst & Werkzeuge

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: Ordner `js/`, `css/`, `tests/` (durch die ersten Dateien)

- [ ] **Step 1: Git-Repository anlegen**

Run:
```bash
git init
```
Expected: „Initialized empty Git repository …"

- [ ] **Step 2: `.gitignore` schreiben**

Create `.gitignore`:
```gitignore
node_modules/
.superpowers/
.DS_Store
```

- [ ] **Step 3: `package.json` schreiben**

Create `package.json`:
```json
{
  "name": "intervall-puls-timer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Abhängigkeiten installieren**

Run:
```bash
npm install
```
Expected: `node_modules/` entsteht, keine Fehler, „added N packages".

- [ ] **Step 5: Testlauf ohne Tests prüfen**

Run:
```bash
npx vitest run --passWithNoTests
```
Expected: „No test files found" bzw. grüner Durchlauf ohne Fehler.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: Projekt-Gerüst mit Vitest"
```

---

## Task 2: Einstellungs-Modul (`settings.js`)

**Files:**
- Create: `js/settings.js`
- Test: `tests/settings.test.js`

Verantwortung: Standardwerte liefern, eingegebene Werte validieren/begrenzen, Einstellungen über ein injizierbares Speicher-Objekt laden/speichern.

- [ ] **Step 1: Failing test für Standardwerte schreiben**

Create `tests/settings.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, clampSettings } from '../js/settings.js';

describe('DEFAULT_SETTINGS', () => {
  it('hat sinnvolle Startwerte', () => {
    expect(DEFAULT_SETTINGS.rounds).toBe(10);
    expect(DEFAULT_SETTINGS.trainingSec).toBe(40);
    expect(DEFAULT_SETTINGS.pauseSec).toBe(20);
    expect(DEFAULT_SETTINGS.pulseLower).toBe(110);
    expect(DEFAULT_SETTINGS.pulseUpper).toBe(150);
    expect(DEFAULT_SETTINGS.volume).toBeCloseTo(0.7);
    expect(DEFAULT_SETTINGS.sounds.phaseChange.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.sounds.countdown.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.sounds.pulseAlarm.enabled).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npx vitest run tests/settings.test.js`
Expected: FAIL – „Failed to resolve import '../js/settings.js'" o. ä.

- [ ] **Step 3: `settings.js` mit Standardwerten anlegen**

Create `js/settings.js`:
```js
export const DEFAULT_SETTINGS = {
  rounds: 10,
  trainingSec: 40,
  pauseSec: 20,
  pulseLower: 110,
  pulseUpper: 150,
  volume: 0.7,
  sounds: {
    phaseChange: { enabled: true, soundId: 'doppelpiep' },
    countdown: { enabled: true, soundId: 'kurzer-piep' },
    pulseAlarm: { enabled: true, soundId: 'alarm-glocke' },
  },
};

const STORAGE_KEY = 'intervallPulsTimer.settings';

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function clampSettings(input) {
  const s = { ...DEFAULT_SETTINGS, ...(input || {}) };
  const rounds = clampInt(s.rounds, 1, 99, DEFAULT_SETTINGS.rounds);
  const trainingSec = clampInt(s.trainingSec, 1, 3599, DEFAULT_SETTINGS.trainingSec);
  const pauseSec = clampInt(s.pauseSec, 0, 3599, DEFAULT_SETTINGS.pauseSec);
  let pulseLower = clampInt(s.pulseLower, 30, 250, DEFAULT_SETTINGS.pulseLower);
  let pulseUpper = clampInt(s.pulseUpper, 30, 250, DEFAULT_SETTINGS.pulseUpper);
  if (pulseUpper <= pulseLower) pulseUpper = pulseLower + 1;
  let volume = Number(s.volume);
  if (!Number.isFinite(volume)) volume = DEFAULT_SETTINGS.volume;
  volume = Math.min(1, Math.max(0, volume));

  const mergeSound = (key) => {
    const d = DEFAULT_SETTINGS.sounds[key];
    const v = (s.sounds && s.sounds[key]) || {};
    return {
      enabled: typeof v.enabled === 'boolean' ? v.enabled : d.enabled,
      soundId: typeof v.soundId === 'string' ? v.soundId : d.soundId,
    };
  };

  return {
    rounds, trainingSec, pauseSec, pulseLower, pulseUpper, volume,
    sounds: {
      phaseChange: mergeSound('phaseChange'),
      countdown: mergeSound('countdown'),
      pulseAlarm: mergeSound('pulseAlarm'),
    },
  };
}

export function loadSettings(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return clampSettings(DEFAULT_SETTINGS);
    return clampSettings(JSON.parse(raw));
  } catch {
    return clampSettings(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings, storage) {
  const clean = clampSettings(settings);
  storage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}
```

- [ ] **Step 4: Test laufen lassen (muss bestehen)**

Run: `npx vitest run tests/settings.test.js`
Expected: PASS (1 Test grün).

- [ ] **Step 5: Failing tests für Validierung & Persistenz ergänzen**

Append to `tests/settings.test.js`:
```js
describe('clampSettings', () => {
  it('begrenzt Runden auf mindestens 1', () => {
    expect(clampSettings({ rounds: 0 }).rounds).toBe(1);
  });
  it('erlaubt Pause 0, aber Training mindestens 1', () => {
    expect(clampSettings({ pauseSec: 0 }).pauseSec).toBe(0);
    expect(clampSettings({ trainingSec: 0 }).trainingSec).toBe(1);
  });
  it('erzwingt Obergrenze über Untergrenze', () => {
    const s = clampSettings({ pulseLower: 150, pulseUpper: 150 });
    expect(s.pulseUpper).toBeGreaterThan(s.pulseLower);
  });
  it('begrenzt Lautstärke auf 0..1', () => {
    expect(clampSettings({ volume: 5 }).volume).toBe(1);
    expect(clampSettings({ volume: -2 }).volume).toBe(0);
  });
});

describe('load/save', () => {
  function fakeStorage() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, v),
    };
  }
  it('liefert Defaults ohne gespeicherte Daten', () => {
    const s = loadSettings(fakeStorage());
    expect(s.rounds).toBe(10);
  });
  it('speichert und lädt denselben Wert', () => {
    const storage = fakeStorage();
    saveSettings({ ...DEFAULT_SETTINGS, rounds: 5 }, storage);
    expect(loadSettings(storage).rounds).toBe(5);
  });
  it('repariert beschädigte Daten zu Defaults', () => {
    const storage = fakeStorage();
    storage.setItem('intervallPulsTimer.settings', '{kaputt');
    expect(loadSettings(storage).rounds).toBe(10);
  });
});
```
Und ergänze den Import oben um `loadSettings, saveSettings`:
```js
import { DEFAULT_SETTINGS, clampSettings, loadSettings, saveSettings } from '../js/settings.js';
```

- [ ] **Step 6: Tests laufen lassen (alle grün)**

Run: `npx vitest run tests/settings.test.js`
Expected: PASS (alle Tests grün).

- [ ] **Step 7: Commit**

```bash
git add js/settings.js tests/settings.test.js
git commit -m "feat: Einstellungs-Modul mit Validierung und Persistenz"
```

---

## Task 3: Timer-Zustandsmaschine (`timer.js`)

**Files:**
- Create: `js/timer.js`
- Test: `tests/timer.test.js`

Verantwortung: Reiner Ablauf Training→Pause→nächste Runde. `tick()` rückt eine Sekunde vor und liefert die dabei aufgetretenen Ereignisse (countdown 3/2/1, phaseChange, finished) zurück. Kein Timer/`setInterval` hier – das macht `app.js`.

- [ ] **Step 1: Failing tests für Grundzustand & Tick schreiben**

Create `tests/timer.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createTimer } from '../js/timer.js';

const cfg = { rounds: 2, trainingSec: 3, pauseSec: 2 };

describe('createTimer', () => {
  it('startet im Leerlauf, Runde 1, Training, volle Trainingszeit', () => {
    const t = createTimer(cfg);
    expect(t.getState()).toEqual({
      status: 'idle', phase: 'training', round: 1, remaining: 3,
    });
  });

  it('tick ohne start tut nichts', () => {
    const t = createTimer(cfg);
    expect(t.tick()).toEqual([]);
    expect(t.getState().remaining).toBe(3);
  });

  it('start + tick zählt herunter', () => {
    const t = createTimer(cfg);
    t.start();
    t.tick();
    expect(t.getState().remaining).toBe(2);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npx vitest run tests/timer.test.js`
Expected: FAIL – Import von `../js/timer.js` schlägt fehl.

- [ ] **Step 3: `timer.js` implementieren**

Create `js/timer.js`:
```js
export function createTimer(config) {
  const rounds = config.rounds;
  const trainingSec = config.trainingSec;
  const pauseSec = config.pauseSec;

  let state = {
    status: 'idle', // 'idle' | 'running' | 'paused' | 'finished'
    phase: 'training', // 'training' | 'pause'
    round: 1,
    remaining: trainingSec,
  };

  function getState() {
    return { ...state };
  }

  function start() {
    if (state.status === 'idle' || state.status === 'paused') {
      state.status = 'running';
    }
  }

  function pause() {
    if (state.status === 'running') state.status = 'paused';
  }

  function stop() {
    state = { status: 'finished', phase: state.phase, round: state.round, remaining: 0 };
  }

  function advancePhase(events) {
    if (state.phase === 'training' && pauseSec > 0) {
      state.phase = 'pause';
      state.remaining = pauseSec;
      events.push({ type: 'phaseChange', to: 'pause', round: state.round });
      return;
    }
    // Pause beendet (oder übersprungen) -> nächste Runde
    if (state.round >= rounds) {
      state.status = 'finished';
      state.remaining = 0;
      events.push({ type: 'finished' });
      return;
    }
    state.round += 1;
    state.phase = 'training';
    state.remaining = trainingSec;
    events.push({ type: 'phaseChange', to: 'training', round: state.round });
  }

  function tick() {
    const events = [];
    if (state.status !== 'running') return events;
    state.remaining -= 1;
    if (state.remaining > 0 && state.remaining <= 3) {
      events.push({ type: 'countdown', value: state.remaining });
    }
    if (state.remaining <= 0) {
      advancePhase(events);
    }
    return events;
  }

  return { getState, start, pause, stop, tick };
}
```

- [ ] **Step 4: Tests laufen lassen (grün)**

Run: `npx vitest run tests/timer.test.js`
Expected: PASS (3 Tests grün).

- [ ] **Step 5: Failing tests für Übergänge, Countdown, Ende & Pause-0 ergänzen**

Append to `tests/timer.test.js`:
```js
function tickN(t, n) {
  const all = [];
  for (let i = 0; i < n; i++) all.push(...t.tick());
  return all;
}

describe('Übergänge & Ereignisse', () => {
  it('emittiert countdown 3,2,1 in einer Trainingsphase', () => {
    const t = createTimer({ rounds: 1, trainingSec: 4, pauseSec: 0 });
    t.start();
    const ev = tickN(t, 3); // remaining 4->3->2->1
    const counts = ev.filter((e) => e.type === 'countdown').map((e) => e.value);
    expect(counts).toEqual([3, 2, 1]);
  });

  it('wechselt von Training zu Pause', () => {
    const t = createTimer(cfg); // training 3, pause 2
    t.start();
    const ev = tickN(t, 3); // 3->2->1->0 => phaseChange
    expect(ev).toContainEqual({ type: 'phaseChange', to: 'pause', round: 1 });
    expect(t.getState()).toMatchObject({ phase: 'pause', round: 1, remaining: 2 });
  });

  it('wechselt nach der Pause in die nächste Runde', () => {
    const t = createTimer(cfg);
    t.start();
    tickN(t, 3); // -> Pause Runde 1 (remaining 2)
    const ev = tickN(t, 2); // Pause 2->1->0 => nächste Runde
    expect(ev).toContainEqual({ type: 'phaseChange', to: 'training', round: 2 });
    expect(t.getState()).toMatchObject({ phase: 'training', round: 2, remaining: 3 });
  });

  it('endet nach der letzten Runde mit finished', () => {
    const t = createTimer(cfg); // 2 Runden
    t.start();
    tickN(t, 3); // Pause R1
    tickN(t, 2); // Training R2
    tickN(t, 3); // Pause R2
    const ev = tickN(t, 2); // Pause R2 zu Ende -> finished
    expect(ev).toContainEqual({ type: 'finished' });
    expect(t.getState().status).toBe('finished');
  });

  it('überspringt die Pause, wenn pauseSec 0 ist', () => {
    const t = createTimer({ rounds: 2, trainingSec: 2, pauseSec: 0 });
    t.start();
    const ev = tickN(t, 2); // Training R1 -> direkt nächste Runde Training
    expect(ev).toContainEqual({ type: 'phaseChange', to: 'training', round: 2 });
    expect(t.getState()).toMatchObject({ phase: 'training', round: 2 });
  });

  it('pause() hält an, danach läuft start() weiter', () => {
    const t = createTimer(cfg);
    t.start();
    t.tick(); // remaining 2
    t.pause();
    expect(t.tick()).toEqual([]); // pausiert: kein Fortschritt
    expect(t.getState().remaining).toBe(2);
    t.start();
    t.tick();
    expect(t.getState().remaining).toBe(1);
  });
});
```

- [ ] **Step 6: Tests laufen lassen (alle grün)**

Run: `npx vitest run tests/timer.test.js`
Expected: PASS (alle Tests grün).

- [ ] **Step 7: Commit**

```bash
git add js/timer.js tests/timer.test.js
git commit -m "feat: Timer-Zustandsmaschine mit Phasen, Countdown und Runden"
```

---

## Task 4: Klang-Modul (`sound.js`)

**Files:**
- Create: `js/sound.js`
- Test: `tests/sound.test.js`

Verantwortung: Feste Klang-Bibliothek bereitstellen (Liste für Dropdowns) und Klänge mit der Web Audio API abspielen. Getestet wird der DOM-/Audio-freie Datenanteil (`SOUND_LIBRARY`, `getToneSpec`). Die Ausgabe (`createPlayer`) ist eine dünne Browser-Schicht und wird manuell geprüft.

- [ ] **Step 1: Failing tests für die Klang-Bibliothek schreiben**

Create `tests/sound.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { SOUND_LIBRARY, getToneSpec } from '../js/sound.js';

describe('SOUND_LIBRARY', () => {
  it('enthält die erwarteten Klänge mit id und label', () => {
    const ids = SOUND_LIBRARY.map((s) => s.id);
    expect(ids).toEqual([
      'kurzer-piep', 'doppelpiep', 'hoher-piep',
      'glocke', 'gong', 'klick', 'alarm-glocke',
    ]);
    for (const s of SOUND_LIBRARY) {
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
});

describe('getToneSpec', () => {
  it('liefert eine nicht-leere Tonfolge für jede id', () => {
    for (const s of SOUND_LIBRARY) {
      const spec = getToneSpec(s.id);
      expect(Array.isArray(spec)).toBe(true);
      expect(spec.length).toBeGreaterThan(0);
      for (const note of spec) {
        expect(typeof note.freq).toBe('number');
        expect(typeof note.dur).toBe('number');
        expect(note.dur).toBeGreaterThan(0);
      }
    }
  });

  it('fällt bei unbekannter id auf einen Standard-Piep zurück', () => {
    const spec = getToneSpec('gibtsnicht');
    expect(spec.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npx vitest run tests/sound.test.js`
Expected: FAIL – Import von `../js/sound.js` schlägt fehl.

- [ ] **Step 3: `sound.js` implementieren**

Create `js/sound.js`:
```js
// Eine "Note" = { freq: Hz, dur: Sekunden, gap?: Sekunden Pause danach, type?: Wellenform }
const TONE_SPECS = {
  'kurzer-piep': [{ freq: 880, dur: 0.12 }],
  'doppelpiep': [{ freq: 880, dur: 0.1, gap: 0.07 }, { freq: 880, dur: 0.1 }],
  'hoher-piep': [{ freq: 1320, dur: 0.12 }],
  'glocke': [{ freq: 1568, dur: 0.5, type: 'sine' }],
  'gong': [{ freq: 196, dur: 0.9, type: 'sine' }],
  'klick': [{ freq: 1500, dur: 0.03, type: 'square' }],
  'alarm-glocke': [
    { freq: 988, dur: 0.12, gap: 0.06 },
    { freq: 988, dur: 0.12, gap: 0.06 },
    { freq: 988, dur: 0.12 },
  ],
};

export const SOUND_LIBRARY = [
  { id: 'kurzer-piep', label: 'Kurzer Piep' },
  { id: 'doppelpiep', label: 'Doppelpiep' },
  { id: 'hoher-piep', label: 'Hoher Piep' },
  { id: 'glocke', label: 'Glocke' },
  { id: 'gong', label: 'Gong' },
  { id: 'klick', label: 'Klick' },
  { id: 'alarm-glocke', label: 'Alarm-Glocke' },
];

export function getToneSpec(id) {
  return TONE_SPECS[id] || TONE_SPECS['kurzer-piep'];
}

// Browser-Schicht: erzeugt einen Player, der Klänge über Web Audio abspielt.
// volumeProvider() liefert die aktuelle Lautstärke 0..1.
export function createPlayer(volumeProvider) {
  let ctx = null;

  // Muss durch eine Nutzer-Geste (z. B. Start-Knopf) einmal aufgerufen werden,
  // weil iOS Audio sonst stummschaltet.
  function unlock() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function play(soundId) {
    if (!ctx) unlock();
    const volume = Math.min(1, Math.max(0, volumeProvider()));
    if (volume <= 0) return;
    const spec = getToneSpec(soundId);
    let start = ctx.currentTime;
    for (const note of spec) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type || 'triangle';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.dur + 0.02);
      start += note.dur + (note.gap || 0.04);
    }
  }

  return { unlock, play };
}
```

- [ ] **Step 4: Tests laufen lassen (grün)**

Run: `npx vitest run tests/sound.test.js`
Expected: PASS (alle Tests grün).

- [ ] **Step 5: Gesamt-Testlauf**

Run: `npm test`
Expected: PASS – alle Test-Dateien (settings, timer, sound) grün.

- [ ] **Step 6: Commit**

```bash
git add js/sound.js tests/sound.test.js
git commit -m "feat: Klang-Bibliothek und Web-Audio-Player"
```

---

## Task 5: HTML-Grundgerüst & Styling

**Files:**
- Create: `index.html`
- Create: `css/style.css`

Verantwortung: Beide Bildschirme als HTML-Struktur (Einstellungen sichtbar, Training versteckt) plus Styling nach Layout C / Einstellungs-Mockup. Noch ohne Logik.

- [ ] **Step 1: `index.html` schreiben**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Intervall-Timer</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <!-- Bildschirm 1: Einstellungen -->
  <main id="screen-settings" class="screen">
    <h1>Intervall-Timer</h1>

    <section class="group">
      <h2>Ablauf</h2>
      <div class="row">
        <div class="row-label">Runden</div>
        <div class="stepper">
          <button class="step" data-step="rounds" data-delta="-1">−</button>
          <span class="val" id="val-rounds">10</span>
          <button class="step" data-step="rounds" data-delta="1">+</button>
        </div>
      </div>
      <div class="row">
        <div class="row-label">Training</div>
        <div class="stepper">
          <button class="step" data-step="trainingSec" data-delta="-5">−</button>
          <span class="val" id="val-trainingSec">00:40</span>
          <button class="step" data-step="trainingSec" data-delta="5">+</button>
        </div>
      </div>
      <div class="row">
        <div class="row-label">Pause</div>
        <div class="stepper">
          <button class="step" data-step="pauseSec" data-delta="-5">−</button>
          <span class="val" id="val-pauseSec">00:20</span>
          <button class="step" data-step="pauseSec" data-delta="5">+</button>
        </div>
      </div>
    </section>

    <section class="group">
      <h2>Pulszonen</h2>
      <div class="row">
        <div class="row-label">Untergrenze</div>
        <div class="stepper">
          <button class="step" data-step="pulseLower" data-delta="-5">−</button>
          <span class="val zone-low" id="val-pulseLower">110</span>
          <button class="step" data-step="pulseLower" data-delta="5">+</button>
        </div>
      </div>
      <div class="row">
        <div class="row-label">Obergrenze</div>
        <div class="stepper">
          <button class="step" data-step="pulseUpper" data-delta="-5">−</button>
          <span class="val zone-high" id="val-pulseUpper">150</span>
          <button class="step" data-step="pulseUpper" data-delta="5">+</button>
        </div>
      </div>
    </section>

    <section class="group">
      <h2>Signaltöne</h2>
      <div class="sound-row" data-sound="phaseChange">
        <div class="sound-top">
          <span class="row-label">Phasenwechsel-Ton</span>
          <button class="toggle" data-toggle="phaseChange" aria-pressed="true"></button>
        </div>
        <div class="sound-ctl">
          <select class="sound-select" data-select="phaseChange"></select>
          <button class="preview" data-preview="phaseChange">▶</button>
        </div>
      </div>
      <div class="sound-row" data-sound="countdown">
        <div class="sound-top">
          <span class="row-label">Countdown-Piepser (3-2-1)</span>
          <button class="toggle" data-toggle="countdown" aria-pressed="true"></button>
        </div>
        <div class="sound-ctl">
          <select class="sound-select" data-select="countdown"></select>
          <button class="preview" data-preview="countdown">▶</button>
        </div>
      </div>
      <div class="sound-row" data-sound="pulseAlarm">
        <div class="sound-top">
          <span class="row-label">Puls-Alarm</span>
          <button class="toggle" data-toggle="pulseAlarm" aria-pressed="true"></button>
        </div>
        <div class="sound-ctl">
          <select class="sound-select" data-select="pulseAlarm"></select>
          <button class="preview" data-preview="pulseAlarm">▶</button>
        </div>
      </div>
      <div class="row">
        <div class="row-label">Lautstärke</div>
        <input type="range" id="val-volume" min="0" max="100" value="70" />
      </div>
    </section>

    <button id="start-btn" class="primary-btn">▶ Training starten</button>
  </main>

  <!-- Bildschirm 2: Training aktiv -->
  <main id="screen-active" class="screen hidden">
    <div class="dots" id="round-dots"></div>
    <div class="active-body">
      <div class="pulse-pane" id="pulse-pane">
        <div class="heart">♥</div>
        <div class="pulse-value" id="pulse-value">--</div>
        <div class="pulse-unit">bpm</div>
        <!-- Etappe 1: Test-Wert manuell setzen -->
        <input type="number" id="pulse-test" class="pulse-test" placeholder="Test-Puls" />
      </div>
      <div class="timer-pane" id="timer-pane">
        <div class="phase-pill" id="phase-pill">TRAINING · 1/10</div>
        <div class="countdown" id="countdown">00:40</div>
      </div>
    </div>
    <div class="active-controls">
      <button id="pause-btn" class="secondary-btn">Pause</button>
      <button id="stop-btn" class="secondary-btn">Beenden</button>
    </div>
  </main>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `css/style.css` schreiben**

Create `css/style.css`:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: -apple-system, system-ui, sans-serif;
  background: #0f1115;
  color: #e8eaed;
  -webkit-user-select: none;
  user-select: none;
}
.screen { min-height: 100%; padding: 20px; max-width: 760px; margin: 0 auto; }
.hidden { display: none !important; }
h1 { font-size: 26px; margin-bottom: 14px; }
.group { margin-bottom: 18px; }
.group h2 {
  font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
  color: #7681f0; margin: 14px 4px 6px;
}
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 4px; border-bottom: 1px solid #20242d;
}
.row-label { font-size: 16px; }
.stepper { display: flex; align-items: center; gap: 14px; }
.step {
  width: 44px; height: 44px; border-radius: 10px;
  background: #1b2029; border: 1px solid #2f3744; color: #cfd3da; font-size: 22px;
}
.val { font-size: 24px; font-weight: 800; min-width: 92px; text-align: center; }
.zone-low { color: #f5d020; }
.zone-high { color: #ff4d5e; }

.sound-row { padding: 12px 4px; border-bottom: 1px solid #20242d; }
.sound-top { display: flex; align-items: center; justify-content: space-between; }
.toggle {
  width: 52px; height: 30px; border-radius: 999px; background: #2e7d46;
  border: none; position: relative;
}
.toggle::after {
  content: ""; position: absolute; top: 3px; right: 3px;
  width: 24px; height: 24px; border-radius: 50%; background: #fff;
}
.toggle[aria-pressed="false"] { background: #3a3f4a; }
.toggle[aria-pressed="false"]::after { right: auto; left: 3px; }
.sound-ctl { display: flex; gap: 10px; margin-top: 10px; }
.sound-select {
  flex: 1; background: #1b2029; border: 1px solid #2f3744; border-radius: 10px;
  padding: 10px 12px; color: #e8eaed; font-size: 15px;
}
.preview {
  width: 44px; height: 44px; border-radius: 10px;
  background: #1f3a8a; border: 1px solid #2f4db0; color: #dfe4ff; font-size: 16px;
}
#val-volume { width: 200px; }

.primary-btn {
  margin-top: 22px; width: 100%; padding: 18px; border: none; border-radius: 14px;
  background: #2e7d46; color: #fff; font-size: 22px; font-weight: 800;
}

/* --- Aktiver Bildschirm (Layout C) --- */
#screen-active { display: flex; flex-direction: column; max-width: none; padding: 16px; }
.dots {
  text-align: center; letter-spacing: 4px; color: #3a4150;
  font-size: 22px; margin-bottom: 10px; min-height: 26px;
}
.dots .done { color: #5fd07a; }
.dots .current { color: #ffffff; }
.active-body { flex: 1; display: flex; gap: 12px; }
.pulse-pane, .timer-pane {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; border-radius: 16px;
}
.pulse-pane { background: #15181f; }
.heart { color: #ff5a6e; font-size: 48px; }
.pulse-value { font-size: 120px; font-weight: 800; line-height: 1; }
.pulse-unit { font-size: 14px; color: #9aa0aa; text-transform: uppercase; letter-spacing: 1px; }
.pulse-test {
  margin-top: 16px; width: 140px; padding: 8px; text-align: center;
  background: #1b2029; border: 1px solid #2f3744; border-radius: 8px; color: #e8eaed; font-size: 16px;
}
.timer-pane { background: #13301c; transition: background 0.3s; }
.timer-pane.phase-pause { background: #3a2410; }
.phase-pill {
  padding: 6px 16px; border-radius: 999px; background: rgba(255,255,255,0.12);
  font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;
}
.countdown { font-size: 140px; font-weight: 800; line-height: 1; color: #7fe39a; }
.timer-pane.phase-pause .countdown { color: #ffb877; }
.active-controls { display: flex; gap: 12px; margin-top: 12px; }
.secondary-btn {
  flex: 1; padding: 16px; border-radius: 12px; border: 1px solid #2f3744;
  background: #1b2029; color: #e8eaed; font-size: 18px; font-weight: 700;
}

@media (orientation: landscape) {
  .pulse-value { font-size: 150px; }
  .countdown { font-size: 170px; }
}
```

- [ ] **Step 3: Manuelle Sichtprüfung**

Run (im Projektordner):
```bash
npx http-server -p 8080 .
```
(oder ein beliebiger statischer Server). Öffne `http://localhost:8080` im Browser.
Expected:
- Einstellungs-Bildschirm ist sichtbar mit Ablauf, Pulszonen, Signaltönen (drei Reihen mit Schalter, Dropdown – noch leer – und ▶), Lautstärke-Regler und grünem Start-Knopf.
- Der aktive Bildschirm ist nicht sichtbar (hat Klasse `hidden`).
- Keine Fehler in der Browser-Konsole (außer evtl. „app.js" noch leer).

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: HTML-Grundgerüst und Styling für beide Bildschirme"
```

---

## Task 6: Einstellungs-Bildschirm verdrahten (`ui.js` + `app.js`, Teil 1)

**Files:**
- Create: `js/ui.js`
- Create: `js/app.js`

Verantwortung: `ui.js` füllt die Klang-Dropdowns und stellt Funktionen bereit, um den Einstellungs-Bildschirm aus dem Settings-Objekt zu zeichnen. `app.js` lädt die Einstellungen, verbindet Stepper/Schalter/Dropdowns/Lautstärke/Vorhören und speichert bei jeder Änderung.

- [ ] **Step 1: `js/ui.js` (Einstellungs-Teil) schreiben**

Create `js/ui.js`:
```js
import { SOUND_LIBRARY } from './sound.js';

function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function populateSoundSelects() {
  document.querySelectorAll('.sound-select').forEach((sel) => {
    sel.innerHTML = '';
    for (const sound of SOUND_LIBRARY) {
      const opt = document.createElement('option');
      opt.value = sound.id;
      opt.textContent = sound.label;
      sel.appendChild(opt);
    }
  });
}

export function renderSettings(s) {
  document.getElementById('val-rounds').textContent = String(s.rounds);
  document.getElementById('val-trainingSec').textContent = formatTime(s.trainingSec);
  document.getElementById('val-pauseSec').textContent = formatTime(s.pauseSec);
  document.getElementById('val-pulseLower').textContent = String(s.pulseLower);
  document.getElementById('val-pulseUpper').textContent = String(s.pulseUpper);
  document.getElementById('val-volume').value = String(Math.round(s.volume * 100));

  for (const key of ['phaseChange', 'countdown', 'pulseAlarm']) {
    const toggle = document.querySelector(`[data-toggle="${key}"]`);
    toggle.setAttribute('aria-pressed', String(s.sounds[key].enabled));
    const select = document.querySelector(`[data-select="${key}"]`);
    select.value = s.sounds[key].soundId;
  }
}

export { formatTime };
```

- [ ] **Step 2: `js/app.js` (Einstellungs-Teil) schreiben**

Create `js/app.js`:
```js
import { loadSettings, saveSettings } from './settings.js';
import { createPlayer } from './sound.js';
import { populateSoundSelects, renderSettings } from './ui.js';

let settings = loadSettings(window.localStorage);
const player = createPlayer(() => settings.volume);

function persistAndRender() {
  settings = saveSettings(settings, window.localStorage);
  renderSettings(settings);
}

function initSettingsScreen() {
  populateSoundSelects();
  renderSettings(settings);

  // Stepper (Runden, Training, Pause, Pulsgrenzen)
  document.querySelectorAll('.step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.step;
      const delta = Number(btn.dataset.delta);
      settings[key] = settings[key] + delta;
      persistAndRender();
    });
  });

  // Schalter (Töne an/aus)
  document.querySelectorAll('.toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      settings.sounds[key].enabled = !settings.sounds[key].enabled;
      persistAndRender();
    });
  });

  // Klang-Auswahl
  document.querySelectorAll('.sound-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const key = sel.dataset.select;
      settings.sounds[key].soundId = sel.value;
      persistAndRender();
    });
  });

  // Vorhören
  document.querySelectorAll('.preview').forEach((btn) => {
    btn.addEventListener('click', () => {
      player.unlock();
      const key = btn.dataset.preview;
      player.play(settings.sounds[key].soundId);
    });
  });

  // Lautstärke
  const vol = document.getElementById('val-volume');
  vol.addEventListener('input', () => {
    settings.volume = Number(vol.value) / 100;
    settings = saveSettings(settings, window.localStorage);
  });
}

initSettingsScreen();
```

- [ ] **Step 3: Bestehende Tests laufen lassen (nichts kaputt gemacht)**

Run: `npm test`
Expected: PASS – alle bisherigen Tests weiterhin grün.

- [ ] **Step 4: Manuelle Prüfung des Einstellungs-Bildschirms**

Server starten (`npx http-server -p 8080 .`), Seite öffnen.
Expected:
- Dropdowns zeigen die 7 Klänge; Vorauswahl: Phasenwechsel = „Doppelpiep", Countdown = „Kurzer Piep", Puls-Alarm = „Alarm-Glocke".
- +/− ändert die Werte (Training/Pause als mm:ss); Runden nicht unter 1; Obergrenze bleibt über Untergrenze.
- Schalter wechseln optisch zwischen an/aus.
- ▶ spielt den jeweils gewählten Klang ab (Ton hörbar – ggf. nach erstem Klick wegen iOS-Audiofreigabe).
- Lautstärke-Regler verändert die Lautstärke beim nächsten Vorhören.
- Nach Seiten-Neuladen sind alle geänderten Werte erhalten (Persistenz).

- [ ] **Step 5: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: Einstellungs-Bildschirm verdrahtet inkl. Persistenz und Vorhören"
```

---

## Task 7: Aktiver Bildschirm & Ablaufschleife (`ui.js` + `app.js`, Teil 2)

**Files:**
- Modify: `js/ui.js`
- Modify: `js/app.js`

Verantwortung: Trainingsablauf starten, jede Sekunde `tick()` aufrufen, die Ereignisse in Töne und Anzeige übersetzen (Countdown, Phasenwechsel, Ende), Phasenfarbe und Runden-Punkte aktualisieren, Pause/Beenden, Abschluss. Manueller Puls-Test-Wert wird angezeigt.

- [ ] **Step 1: Anzeige-Funktionen in `ui.js` ergänzen**

Append to `js/ui.js`:
```js
export function showScreen(which) {
  document.getElementById('screen-settings').classList.toggle('hidden', which !== 'settings');
  document.getElementById('screen-active').classList.toggle('hidden', which !== 'active');
}

export function renderActive(state, totalRounds) {
  const pill = document.getElementById('phase-pill');
  const countdown = document.getElementById('countdown');
  const pane = document.getElementById('timer-pane');

  if (state.status === 'finished') {
    pill.textContent = 'FERTIG';
    countdown.textContent = '✓';
    pane.classList.remove('phase-pause');
  } else {
    const label = state.phase === 'training' ? 'TRAINING' : 'PAUSE';
    pill.textContent = `${label} · ${state.round}/${totalRounds}`;
    countdown.textContent = formatTime(Math.max(0, state.remaining));
    pane.classList.toggle('phase-pause', state.phase === 'pause');
  }

  renderDots(state, totalRounds);
}

function renderDots(state, totalRounds) {
  const dots = document.getElementById('round-dots');
  let html = '';
  for (let i = 1; i <= totalRounds; i++) {
    let cls = '';
    if (i < state.round || state.status === 'finished') cls = 'done';
    else if (i === state.round) cls = 'current';
    html += `<span class="${cls}">●</span> `;
  }
  dots.innerHTML = html;
}

export function setPulseDisplay(value) {
  document.getElementById('pulse-value').textContent =
    value == null ? '--' : String(value);
}
```

- [ ] **Step 2: Ablaufschleife in `app.js` ergänzen**

Add to the imports at the top of `js/app.js`:
```js
import { createTimer } from './timer.js';
import {
  populateSoundSelects, renderSettings,
  showScreen, renderActive, setPulseDisplay,
} from './ui.js';
```
(Ersetze die bestehende `ui.js`-Importzeile durch die obige erweiterte Variante.)

Append to the end of `js/app.js`:
```js
let timer = null;
let intervalId = null;
let testPulse = null;

function playEventSounds(events) {
  for (const ev of events) {
    if (ev.type === 'countdown' && settings.sounds.countdown.enabled) {
      player.play(settings.sounds.countdown.soundId);
    }
    if (ev.type === 'phaseChange' && settings.sounds.phaseChange.enabled) {
      player.play(settings.sounds.phaseChange.soundId);
    }
    if (ev.type === 'finished' && settings.sounds.phaseChange.enabled) {
      player.play(settings.sounds.phaseChange.soundId);
    }
  }
}

function onTick() {
  const events = timer.tick();
  playEventSounds(events);
  const state = timer.getState();
  renderActive(state, settings.rounds);
  if (state.status === 'finished') stopLoop();
}

function startLoop() {
  intervalId = window.setInterval(onTick, 1000);
}

function stopLoop() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

function startTraining() {
  player.unlock(); // iOS-Audiofreigabe per Start-Geste
  timer = createTimer({
    rounds: settings.rounds,
    trainingSec: settings.trainingSec,
    pauseSec: settings.pauseSec,
  });
  timer.start();
  testPulse = null;
  setPulseDisplay(null);
  renderActive(timer.getState(), settings.rounds);
  showScreen('active');
  startLoop();
}

function initActiveScreen() {
  document.getElementById('start-btn').addEventListener('click', startTraining);

  document.getElementById('pause-btn').addEventListener('click', () => {
    const btn = document.getElementById('pause-btn');
    const state = timer.getState();
    if (state.status === 'running') {
      timer.pause();
      stopLoop();
      btn.textContent = 'Weiter';
    } else if (state.status === 'paused') {
      timer.start();
      startLoop();
      btn.textContent = 'Pause';
    }
  });

  document.getElementById('stop-btn').addEventListener('click', () => {
    stopLoop();
    if (timer) timer.stop();
    document.getElementById('pause-btn').textContent = 'Pause';
    showScreen('settings');
  });

  // Etappe 1: manueller Test-Puls
  document.getElementById('pulse-test').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    testPulse = v === '' ? null : Number(v);
    setPulseDisplay(testPulse);
  });
}

initActiveScreen();
```

- [ ] **Step 3: Bestehende Tests laufen lassen**

Run: `npm test`
Expected: PASS – alle Logik-Tests weiterhin grün.

- [ ] **Step 4: Manueller Durchlauf eines kurzen Trainings**

Server starten, Seite öffnen. Stelle zum schnellen Testen ein: Runden 2, Training 5 Sek., Pause 3 Sek. Tippe „Training starten".
Expected:
- Wechsel auf den aktiven Bildschirm (Layout C): links Puls „--", rechts grüner Countdown „00:05", Pille „TRAINING · 1/2", oben 2 Punkte (erster weiß).
- Countdown zählt sekündlich herunter; in den letzten 3 Sek. ertönt der Countdown-Ton (sofern an).
- Bei 0 Wechsel zu „PAUSE · 1/2", Pane wird orange, Countdown orange „00:03", Phasenwechsel-Ton ertönt.
- Danach „TRAINING · 2/2", erster Punkt grün, zweiter weiß.
- Am Ende „FERTIG", „✓", Phasenwechsel-Ton; Schleife stoppt (kein weiteres Ticken).
- „Pause" hält an (Knopf zeigt „Weiter"), „Weiter" setzt fort.
- „Beenden" kehrt zu den Einstellungen zurück.
- Test-Puls-Feld: Eingabe einer Zahl zeigt diese groß als Pulswert an.

- [ ] **Step 5: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: aktiver Trainingsbildschirm mit Ablaufschleife, Tönen und Steuerung"
```

---

## Task 8: Abschluss-Prüfung & Aufräumen

**Files:** keine neuen; Gesamtprüfung.

- [ ] **Step 1: Voller Testlauf**

Run: `npm test`
Expected: Alle Test-Dateien (settings, timer, sound) grün, keine Warnungen über offene Handles.

- [ ] **Step 2: Konsolen-Check im Browser**

Seite laden, kompletten Ablauf einmal durchspielen, Browser-Konsole offen halten.
Expected: keine roten Fehlermeldungen.

- [ ] **Step 3: Persistenz-Check**

Einstellungen ändern (z. B. Runden 7, Phasenwechsel-Ton auf „Gong"), Seite neu laden.
Expected: Geänderte Werte sind erhalten.

- [ ] **Step 4: Kurzanleitung als README schreiben**

Create `README.md`:
```markdown
# Intervall-Timer (Etappe 1)

Web-App: Intervall-Trainings-Timer mit einstellbaren Runden/Zeiten und konfigurierbaren Signaltönen. Puls ist in dieser Etappe ein manueller Test-Wert (echter Bluetooth-Puls folgt in Etappe 2).

## Starten (zum Testen am PC)
1. `npm install`
2. Statischen Server starten, z. B. `npx http-server -p 8080 .`
3. Browser öffnen: `http://localhost:8080`

## Auf dem iPad (Etappe 1)
Funktioniert im normalen Safari (kein Bluetooth nötig). Dateien auf das iPad bringen
und über einen lokalen/gehosteten Server öffnen, dann „Zum Home-Bildschirm" hinzufügen.

## Tests
`npm test`
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: Kurzanleitung für Etappe 1"
```

---

## Self-Review-Ergebnis (vom Plan-Autor geprüft)

- **Spec-Abdeckung:** Timer-Logik (Task 3), Einstellungen + Speichern (Task 2, 6), beide Bildschirme (Task 5–7), Signaltöne mit Klangwahl + Vorhören + Lautstärke (Task 4, 6), Puls als manueller Test-Wert (Task 7). Pulszonen-Farben/-Alarm und Bluetooth sind laut Spec bewusst Etappe 2 und hier ausgelassen. Pulsgrenzen sind bereits einstellbar/gespeichert (Task 2, 5, 6).
- **Platzhalter:** keine offenen TODOs; jeder Code-Schritt enthält vollständigen Code.
- **Typ-/Namens-Konsistenz:** `createTimer`, `tick()`/`getState()`/`start()`/`pause()`/`stop()`, Event-Typen `countdown`/`phaseChange`/`finished`, Settings-Felder (`rounds`, `trainingSec`, `pauseSec`, `pulseLower`, `pulseUpper`, `volume`, `sounds.{phaseChange,countdown,pulseAlarm}.{enabled,soundId}`), `SOUND_LIBRARY`/`getToneSpec`/`createPlayer`, UI-Funktionen (`populateSoundSelects`, `renderSettings`, `showScreen`, `renderActive`, `setPulseDisplay`) sind über alle Tasks hinweg einheitlich verwendet.
```
