# Etappe 2 – Bluetooth-Puls & Pulszonen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Echten Herzfrequenz-Wert von einem Bluetooth-Brustgurt anzeigen, die Puls-Anzeige nach Zone einfärben (gelb unter / weiß im / rot über dem Zielbereich) und beim Überschreiten der Obergrenze ein einmaliges Signal geben.

**Architecture:** Aufbauend auf Etappe 1. Zwei neue, DOM-freie Logik-Module mit Vitest-Tests: `pulseZones.js` (Zonen-Entscheidung + kantengetriggerte Alarm-Erkennung) und die reine Parse-Funktion in `heartRate.js`. Der eigentliche Web-Bluetooth-Zugriff (`createHeartRateSensor`) ist eine dünne, browser-only Schicht (manuell getestet). `app.js` verbindet Sensor → Puls-Auswertung → Anzeige/Ton.

**Tech Stack:** Web Bluetooth API (GATT „Heart Rate" Service `heart_rate`, Characteristic `heart_rate_measurement`), bestehender Stack (ES-Module, Web Audio, Vitest).

**Verhaltens-Entscheidungen (vom Nutzer bestätigt):**
- Puls-Alarm ist **kantengetriggert**: feuert genau einmal beim Überschreiten der Obergrenze; erst nachdem der Puls wieder ≤ Obergrenze war, kann er erneut feuern.
- Alarm nur, wenn ein Training **läuft** (status === 'running') und der Puls-Alarm-Ton aktiviert ist.
- Das **manuelle Test-Puls-Eingabefeld bleibt** (Testen ohne Gurt); ein echter Gurt-Wert ruft denselben Verarbeitungspfad auf und überschreibt die Anzeige.
- Bluetooth-Verbindung: **Verbinden-Knopf** auf dem Einstellungs-Bildschirm; bei Verbindungsverlust automatischer Wiederverbindungsversuch; Puls zeigt dann „--".

**Abgrenzung:** Bildschirm-Wachhalter (Wake Lock), Startbildschirm-Icon/PWA und Politur bleiben Etappe 3.

---

## Datei-Struktur (Änderungen in Etappe 2)

```
js/
├── pulseZones.js   (NEU)  zoneFor() + createAlarmArmer()  — reine Logik, getestet
├── heartRate.js    (NEU)  parseHeartRate() [getestet] + createHeartRateSensor() [browser-only]
├── ui.js           (ÄND.) renderPulse() + setBluetoothStatus() ergänzen, setPulseDisplay ersetzen
└── app.js          (ÄND.) Sensor + Pulszonen + Alarm einbinden, Test-Puls umverdrahten
index.html          (ÄND.) Abschnitt „Pulsgurt" + Status; (Test-Puls-Feld bleibt)
css/style.css       (ÄND.) Zonen-Farben für die Puls-Anzeige + Connect-Knopf-Style
tests/
├── pulseZones.test.js  (NEU)
└── heartRate.test.js   (NEU)
```

---

## Task 1: Pulszonen-Logik (`pulseZones.js`)

**Files:**
- Create: `js/pulseZones.js`
- Test: `tests/pulseZones.test.js`

Verantwortung: Reine Logik. `zoneFor(pulse, lower, upper)` liefert `'none' | 'low' | 'in' | 'high'`. `createAlarmArmer()` erkennt das *Überschreiten* der Obergrenze als Flanke (einmaliges Auslösen, Wieder-Scharfschalten bei Rückkehr ≤ Obergrenze).

- [ ] **Step 1: Failing tests schreiben** — Create `tests/pulseZones.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { zoneFor, createAlarmArmer } from '../js/pulseZones.js';

describe('zoneFor', () => {
  it('liefert none für fehlenden Wert', () => {
    expect(zoneFor(null, 110, 150)).toBe('none');
    expect(zoneFor(NaN, 110, 150)).toBe('none');
  });
  it('liefert low unterhalb der Untergrenze', () => {
    expect(zoneFor(100, 110, 150)).toBe('low');
  });
  it('liefert in innerhalb (Grenzen eingeschlossen)', () => {
    expect(zoneFor(110, 110, 150)).toBe('in');
    expect(zoneFor(130, 110, 150)).toBe('in');
    expect(zoneFor(150, 110, 150)).toBe('in');
  });
  it('liefert high oberhalb der Obergrenze', () => {
    expect(zoneFor(151, 110, 150)).toBe('high');
  });
});

describe('createAlarmArmer', () => {
  it('feuert einmalig beim Überschreiten und erst nach Rückkehr erneut', () => {
    const a = createAlarmArmer();
    expect(a.check(140, 150)).toBe(false); // im Bereich
    expect(a.check(151, 150)).toBe(true);  // Flanke nach oben
    expect(a.check(160, 150)).toBe(false); // bleibt oben -> kein erneutes Feuern
    expect(a.check(150, 150)).toBe(false); // zurück im Bereich -> schärft wieder
    expect(a.check(155, 150)).toBe(true);  // erneute Flanke
  });
  it('ignoriert fehlende Werte ohne den Zustand zu ändern', () => {
    const a = createAlarmArmer();
    expect(a.check(null, 150)).toBe(false);
    expect(a.check(151, 150)).toBe(true);
  });
  it('reset() schärft den Alarm wieder', () => {
    const a = createAlarmArmer();
    expect(a.check(151, 150)).toBe(true);
    a.reset();
    expect(a.check(151, 150)).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen (FAIL)** — Run: `npx vitest run tests/pulseZones.test.js` → Import schlägt fehl.

- [ ] **Step 3: `js/pulseZones.js` implementieren**

```js
export function zoneFor(pulse, lower, upper) {
  if (pulse == null || !Number.isFinite(pulse)) return 'none';
  if (pulse < lower) return 'low';
  if (pulse > upper) return 'high';
  return 'in';
}

// Kantengetriggerter Alarm: check() liefert true genau im Moment des Überschreitens
// der Obergrenze und erst wieder, nachdem der Puls zwischendurch <= Obergrenze war.
export function createAlarmArmer() {
  let armed = true;
  return {
    check(pulse, upper) {
      if (pulse == null || !Number.isFinite(pulse)) return false;
      if (pulse > upper) {
        if (armed) {
          armed = false;
          return true;
        }
        return false;
      }
      armed = true;
      return false;
    },
    reset() {
      armed = true;
    },
  };
}
```

- [ ] **Step 4: Test laufen lassen (PASS)** — Run: `npx vitest run tests/pulseZones.test.js` → alle grün.

- [ ] **Step 5: Commit**

```bash
git add js/pulseZones.js tests/pulseZones.test.js
git commit -m "feat: Pulszonen-Logik mit kantengetriggertem Alarm"
```

---

## Task 2: Herzfrequenz-Modul (`heartRate.js`)

**Files:**
- Create: `js/heartRate.js`
- Test: `tests/heartRate.test.js`

Verantwortung: `parseHeartRate(dataview)` wertet das standardisierte Heart-Rate-Measurement aus (Flags-Byte Bit 0: 0 = uint8, 1 = uint16 little-endian) — reine, testbare Funktion. `isSupported()` prüft Web-Bluetooth-Verfügbarkeit. `createHeartRateSensor({onPulse,onStatus})` ist die browser-only Verbindungsschicht (NICHT unit-getestet).

- [ ] **Step 1: Failing tests schreiben** — Create `tests/heartRate.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseHeartRate, isSupported } from '../js/heartRate.js';

function dv(bytes) {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseHeartRate', () => {
  it('liest 8-Bit-Wert (Flags Bit0 = 0)', () => {
    expect(parseHeartRate(dv([0x00, 72]))).toBe(72);
  });
  it('liest 16-Bit-Wert little-endian (Flags Bit0 = 1)', () => {
    // 0x012C = 300
    expect(parseHeartRate(dv([0x01, 0x2c, 0x01]))).toBe(300);
  });
  it('ignoriert höhere Flag-Bits und liest trotzdem 8-Bit', () => {
    expect(parseHeartRate(dv([0x10, 88]))).toBe(88);
  });
});

describe('isSupported', () => {
  it('ist in Node (kein navigator.bluetooth) false', () => {
    expect(isSupported()).toBe(false);
  });
});
```

- [ ] **Step 2: Test laufen lassen (FAIL)** — Run: `npx vitest run tests/heartRate.test.js` → Import schlägt fehl.

- [ ] **Step 3: `js/heartRate.js` implementieren**

```js
// Reine Auswertung des Bluetooth Heart-Rate-Measurement (GATT 0x2A37).
// Flags-Byte Bit 0: 0 => Wert ist uint8 ab Offset 1, 1 => uint16 little-endian ab Offset 1.
export function parseHeartRate(dataview) {
  const flags = dataview.getUint8(0);
  const is16bit = (flags & 0x01) === 0x01;
  return is16bit ? dataview.getUint16(1, true) : dataview.getUint8(1);
}

export function isSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

// Browser-only Verbindungsschicht. onPulse(number|null), onStatus(string).
export function createHeartRateSensor({ onPulse, onStatus }) {
  let device = null;
  let characteristic = null;

  function handleValue(event) {
    onPulse(parseHeartRate(event.target.value));
  }

  async function openGatt() {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('heart_rate');
    characteristic = await service.getCharacteristic('heart_rate_measurement');
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', handleValue);
    onStatus('verbunden');
  }

  async function handleDisconnect() {
    onStatus('Verbindung verloren – versuche neu …');
    onPulse(null);
    try {
      await openGatt();
    } catch {
      onStatus('getrennt');
    }
  }

  async function connect() {
    if (!isSupported()) {
      onStatus('Bluetooth hier nicht verfügbar – bitte Bluefy-Browser verwenden');
      return;
    }
    try {
      onStatus('verbinde …');
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      device.addEventListener('gattserverdisconnected', handleDisconnect);
      await openGatt();
    } catch {
      onStatus('Verbindung abgebrochen');
    }
  }

  function disconnect() {
    if (device && device.gatt && device.gatt.connected) {
      device.gatt.disconnect();
    }
    onPulse(null);
    onStatus('getrennt');
  }

  return { connect, disconnect };
}
```

- [ ] **Step 4: Test laufen lassen (PASS)** — Run: `npx vitest run tests/heartRate.test.js` → alle grün.

- [ ] **Step 5: Commit**

```bash
git add js/heartRate.js tests/heartRate.test.js
git commit -m "feat: Herzfrequenz-Parser und Web-Bluetooth-Sensor"
```

---

## Task 3: HTML & CSS für Pulsgurt und Pulszonen-Farben

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

Verantwortung: Abschnitt „Pulsgurt" mit Verbinden-Knopf und Status in die Einstellungen einfügen; Zonen-Farben (gelb/weiß/rot inkl. dezentem Hintergrund) für die Puls-Anzeige im aktiven Bildschirm.

- [ ] **Step 1: „Pulsgurt"-Abschnitt in `index.html` einfügen**

In `index.html` direkt VOR der Zeile `<button id="start-btn" class="primary-btn">▶ Training starten</button>` diesen Abschnitt einfügen:

```html
    <section class="group">
      <h2>Pulsgurt</h2>
      <div class="row">
        <div>
          <div class="row-label">Bluetooth-Gurt</div>
          <div class="row-sub" id="bt-status">Nicht verbunden</div>
        </div>
        <button id="bt-connect" class="connect-btn">Verbinden</button>
      </div>
    </section>

```

(Das vorhandene Test-Puls-Feld im aktiven Bildschirm bleibt unverändert.)

- [ ] **Step 2: CSS in `css/style.css` ergänzen** — am Dateiende anhängen:

```css
/* --- Pulsgurt (Einstellungen) --- */
.row-sub { font-size: 12px; color: #9aa0aa; margin-top: 2px; }
.connect-btn {
  padding: 0 18px; height: 44px; border-radius: 10px;
  background: #1f3a8a; border: 1px solid #2f4db0; color: #dfe4ff;
  font-size: 15px; font-weight: 700;
}

/* --- Pulszonen-Farben (aktiver Bildschirm) --- */
.pulse-pane.zone-low { background: #1c1a0a; }
.pulse-pane.zone-high { background: #2a0f12; }
.pulse-pane.zone-low .pulse-value { color: #f5d020; }
.pulse-pane.zone-in .pulse-value { color: #ffffff; }
.pulse-pane.zone-high .pulse-value { color: #ff4d5e; }
.pulse-pane.zone-low .pulse-unit { color: #f5d020; }
.pulse-pane.zone-high .pulse-unit { color: #ff4d5e; }
```

- [ ] **Step 3: Sichtprüfung** — Server starten (`npx http-server -p 8080 .`), Seite laden.
Expected: In den Einstellungen erscheint der Abschnitt „Pulsgurt" mit Status „Nicht verbunden" und blauem „Verbinden"-Knopf. Keine Konsolenfehler (der Knopf macht noch nichts — wird in Task 5 verdrahtet).

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: Pulsgurt-Abschnitt und Pulszonen-Farben (HTML/CSS)"
```

---

## Task 4: Anzeige-Funktionen (`ui.js`)

**Files:**
- Modify: `js/ui.js`

Verantwortung: `renderPulse(value, zone)` ersetzt das bisherige `setPulseDisplay` (zeigt Wert + setzt Zonen-Klasse am `pulse-pane`). `setBluetoothStatus(text)` aktualisiert die Statuszeile. Die alte Funktion `setPulseDisplay` wird entfernt (Task 5 stellt alle Aufrufer um).

- [ ] **Step 1: In `js/ui.js` die Funktion `setPulseDisplay` ersetzen.**

Suche diesen Block am Dateiende:
```js
export function setPulseDisplay(value) {
  document.getElementById('pulse-value').textContent =
    value == null ? '--' : String(value);
}
```
und ersetze ihn vollständig durch:
```js
export function renderPulse(value, zone) {
  document.getElementById('pulse-value').textContent =
    value == null ? '--' : String(value);
  const pane = document.getElementById('pulse-pane');
  pane.classList.remove('zone-low', 'zone-in', 'zone-high');
  if (zone && zone !== 'none') {
    pane.classList.add('zone-' + zone);
  }
}

export function setBluetoothStatus(text) {
  document.getElementById('bt-status').textContent = text;
}
```

- [ ] **Step 2: Tests laufen lassen** — Run: `npm test` → weiterhin 26 Tests grün (8 settings + 9 timer + 3 sound + 6 pulseZones + … ; konkret: keine Logik-Regression; ui.js ist nicht unit-getestet). Erwartung: alle bisherigen Tests bleiben grün.

- [ ] **Step 3: Syntax-Check** — Run: `node --check js/ui.js` → keine Ausgabe (= OK).

- [ ] **Step 4: Commit**

```bash
git add js/ui.js
git commit -m "feat: renderPulse mit Zonen-Farbe und Bluetooth-Status in der UI"
```

---

## Task 5: Verdrahtung in `app.js`

**Files:**
- Modify: `js/app.js`

Verantwortung: Sensor anlegen, Verbinden-Knopf verdrahten, einen zentralen `applyPulse()`-Pfad schaffen (Anzeige + Zone + Alarm), das manuelle Test-Puls-Feld auf diesen Pfad umstellen, beim Trainingsstart den Alarm neu schärfen. Etappe-1-Verhalten bleibt erhalten.

Ersetze den GESAMTEN Inhalt von `js/app.js` durch folgende vollständige Fassung (sie enthält die Etappe-1-Logik unverändert plus die Etappe-2-Ergänzungen):

```js
import { loadSettings, saveSettings } from './settings.js';
import { createPlayer } from './sound.js';
import { createTimer } from './timer.js';
import { zoneFor, createAlarmArmer } from './pulseZones.js';
import { createHeartRateSensor } from './heartRate.js';
import {
  populateSoundSelects, renderSettings,
  showScreen, renderActive, renderPulse, setBluetoothStatus,
} from './ui.js';

let settings = loadSettings(window.localStorage);
const player = createPlayer(() => settings.volume);

const alarmArmer = createAlarmArmer();
let latestPulse = null;

// Zentraler Verarbeitungspfad für jeden Pulswert (echt oder manuell).
function applyPulse(value) {
  latestPulse = value;
  const zone = zoneFor(value, settings.pulseLower, settings.pulseUpper);
  renderPulse(value, zone);
  const crossed = alarmArmer.check(value, settings.pulseUpper);
  const running = timer && timer.getState().status === 'running';
  if (crossed && running && settings.sounds.pulseAlarm.enabled) {
    player.play(settings.sounds.pulseAlarm.soundId);
  }
}

const sensor = createHeartRateSensor({
  onPulse: applyPulse,
  onStatus: setBluetoothStatus,
});

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

  // Pulsgurt verbinden
  document.getElementById('bt-connect').addEventListener('click', () => {
    player.unlock(); // Nutzer-Geste: zugleich Audio freischalten
    sensor.connect();
  });
}

initSettingsScreen();

let timer = null;
let intervalId = null;

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
  if (intervalId !== null) return;
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
  alarmArmer.reset();
  applyPulse(latestPulse); // aktuellen Puls (falls Gurt verbunden) sofort zeigen
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

  // Manueller Test-Puls (Etappe 1) – nutzt jetzt denselben Pfad wie der echte Gurt
  document.getElementById('pulse-test').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    const n = Number(v);
    applyPulse((v === '' || !Number.isFinite(n)) ? null : n);
  });
}

initActiveScreen();
```

- [ ] **Step 1: Datei ersetzen** wie oben.

- [ ] **Step 2: Syntax-Check** — Run: `node --check js/app.js` → keine Ausgabe (= OK).

- [ ] **Step 3: Tests laufen lassen** — Run: `npm test` → alle Logik-Tests grün, keine Regression.

- [ ] **Step 4: Lade-/Trace-Prüfung** — Server starten, Seite laden, Konsole prüfen.
Expected: keine Fehler beim Laden. Trace gegen den Code:
  - „Verbinden" ruft `sensor.connect()` (im PC-Chrome erscheint der Geräte-Dialog; in Safari ohne Web-Bluetooth erscheint die Status-Meldung „… bitte Bluefy-Browser verwenden").
  - Test-Puls eingeben → Wert erscheint, Farbe wechselt: unter Untergrenze gelb, im Bereich weiß, über Obergrenze rot.
  - Während eines laufenden Trainings einmal über die Obergrenze tippen → Puls-Alarm-Ton (falls aktiviert) genau einmal; erst nach Rückkehr in den Bereich und erneutem Überschreiten wieder.

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: Bluetooth-Puls, Pulszonen-Anzeige und Alarm verdrahtet"
```

---

## Task 6: Abschluss-Prüfung & README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Voller Testlauf** — Run: `npm test`
Expected: alle Test-Dateien grün (settings 8, timer 9, sound 3, pulseZones, heartRate).

- [ ] **Step 2: Syntax-Check aller JS-Dateien** — Run:
`node --check js/settings.js; node --check js/timer.js; node --check js/sound.js; node --check js/pulseZones.js; node --check js/heartRate.js; node --check js/ui.js; node --check js/app.js`
Expected: keine Ausgabe.

- [ ] **Step 3: README aktualisieren** — In `README.md` den Block ab „## Auf dem iPad" durch Folgendes ersetzen:

```markdown
## Auf dem iPad (mit Puls, ab Etappe 2)
Für den Bluetooth-Pulsgurt wird der kostenlose Browser **Bluefy** benötigt (Safari kann
kein Web-Bluetooth). Dateien per lokalem/gehostetem Server öffnen, in Bluefy laden,
„Verbinden" tippen und den Gurt koppeln. Ohne Gurt funktioniert weiterhin das
manuelle Test-Puls-Feld.

## Am PC testen (mit Puls)
Web-Bluetooth funktioniert in Chrome/Edge am PC: Server starten, Seite öffnen,
„Verbinden" – ein vorhandener Gurt lässt sich direkt koppeln. Ohne Gurt das
Test-Puls-Feld nutzen.

## Pulszonen
Untergrenze/Obergrenze in den Einstellungen festlegen. Anzeige: unter der Untergrenze
gelb, im Zielbereich weiß, über der Obergrenze rot. Beim Überschreiten der Obergrenze
ertönt einmalig der Puls-Alarm (während eines laufenden Trainings, falls aktiviert).
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README für Etappe 2 (Puls/Bluetooth) aktualisiert"
```

---

## Self-Review-Ergebnis (vom Plan-Autor geprüft)

- **Spec-Abdeckung:** Echter Puls vom Gurt (Task 2 `createHeartRateSensor` + Task 5 Verdrahtung), Pulszonen-Farben gelb/weiß/rot (Task 1 `zoneFor` + Task 3 CSS + Task 4 `renderPulse`), einmaliges Alarm-Signal beim Überschreiten (Task 1 `createAlarmArmer` + Task 5 `applyPulse`), Verbindungsabbruch → „--" + Wiederverbindung (Task 2 `handleDisconnect`), kein Web-Bluetooth → Hinweis (Task 2 `connect`-Zweig). Wake Lock/PWA bleiben bewusst Etappe 3.
- **Platzhalter:** keine; jeder Code-Schritt enthält vollständigen Code.
- **Typ-/Namens-Konsistenz:** `zoneFor`/`createAlarmArmer` (`check`/`reset`), `parseHeartRate`/`isSupported`/`createHeartRateSensor` (`connect`/`disconnect`, Callbacks `onPulse`/`onStatus`), `renderPulse(value, zone)`/`setBluetoothStatus(text)`, Zonen-Werte `'none'|'low'|'in'|'high'` ↔ CSS-Klassen `zone-low|zone-in|zone-high`, DOM-IDs `bt-connect`/`bt-status`/`pulse-pane`/`pulse-value` durchgängig konsistent. `setPulseDisplay` wird in Task 4 entfernt und in Task 5 nirgends mehr aufgerufen (durch `renderPulse`/`applyPulse` ersetzt).
