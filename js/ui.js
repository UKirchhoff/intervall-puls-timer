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
