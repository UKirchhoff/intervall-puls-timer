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
