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
