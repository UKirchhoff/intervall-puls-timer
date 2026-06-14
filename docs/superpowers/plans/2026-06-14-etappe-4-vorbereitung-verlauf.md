# Etappe 4 – Vorbereitungs-Countdown & Trainings-Verlauf

**Datum:** 2026-06-14 · **Status:** umgesetzt, getestet, live

Zwei Erweiterungen auf Basis von Etappe 1–3.

## Entscheidungen (mit Nutzer abgestimmt)
- **Vorbereitung:** einstellbar, Standard 10 s, 0 = aus.
- **Verlauf-Inhalt:** Datum & Uhrzeit, Runden, Dauer, Ø-Puls, Max-Puls.
- **Aufzeichnung:** nur vollständig abgeschlossene Trainings.

## A) Vorbereitungs-Countdown
- `settings.js`: neues Feld `prepareSec` (Default 10, clamp 0..3599).
- `timer.js`: neue Anfangsphase `prepare` (nur wenn `prepareSec>0`); Übergang prepare→training behält Runde 1, setzt `remaining=trainingSec`, sendet `phaseChange to:'training'`. 3-2-1-Piepser laufen phasenunabhängig. `prepareSec=0` = altes Verhalten.
- `ui.js`/`index.html`/`css`: Stepper „Vorbereitung", Label „BEREIT MACHEN", blaue Phasenfarbe (`.timer-pane.phase-prepare`).

## B) Trainings-Verlauf
- `history.js` (neu, getestet): `pulseStats(samples)` (Ø gerundet + Max, null ohne Werte), `loadHistory`/`addEntry` (unshift, Cap 50)/`clearHistory` über injizierbaren Storage (Key `intervallPulsTimer.history`).
- `app.js`: sammelt Pulswerte während laufendem Training (`pulseSamples`), Reset bei Start; `recordTraining()` nur im `finished`-Zweig; Eintrag `{dateISO, rounds, durationSec, avgPulse, maxPulse}`; `durationSec = prepareSec + rounds*trainingSec + rounds*pauseSec`.
- 3. Bildschirm `#screen-history` (Liste, „Zurück", „Alle löschen" mit Rückfrage); `showScreen` auf drei Bildschirme verallgemeinert; `renderHistory` mit eigener Datums­formatierung.

## Tests
43 Vitest-Tests grün (settings 9, timer 13, history 7, sound 3, pulseZones 7, heartRate 4). UI/Navigation manuell + live geprüft. Abschluss-Review ohne kritische/wichtige Funde.

## Bewusst ausgelassen
App-Icon/PWA (auf iPad nicht zusammen mit Bluetooth nutzbar — siehe Etappe-3-Entscheidung).
