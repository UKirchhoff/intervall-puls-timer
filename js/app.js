import { loadSettings, saveSettings } from './settings.js';
import { createPlayer } from './sound.js';
import { createTimer } from './timer.js';
import {
  populateSoundSelects, renderSettings,
  showScreen, renderActive, setPulseDisplay,
} from './ui.js';

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
    const n = Number(v);
    testPulse = (v === '' || !Number.isFinite(n)) ? null : n;
    setPulseDisplay(testPulse);
  });
}

initActiveScreen();
