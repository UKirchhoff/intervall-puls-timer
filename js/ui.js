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
  document.getElementById('val-prepareSec').textContent = formatTime(s.prepareSec);
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
  for (const name of ['settings', 'active', 'history']) {
    document.getElementById('screen-' + name).classList.toggle('hidden', name !== which);
  }
}

export function renderActive(state, totalRounds) {
  const pill = document.getElementById('phase-pill');
  const countdown = document.getElementById('countdown');
  const pane = document.getElementById('timer-pane');

  pane.classList.remove('phase-pause', 'phase-prepare');
  if (state.status === 'finished') {
    pill.textContent = 'FERTIG';
    countdown.textContent = '✓';
  } else {
    const labels = { prepare: 'BEREIT MACHEN', training: 'TRAINING', pause: 'PAUSE' };
    pill.textContent = `${labels[state.phase]} · ${state.round}/${totalRounds}`;
    countdown.textContent = formatTime(Math.max(0, state.remaining));
    if (state.phase === 'pause') pane.classList.add('phase-pause');
    else if (state.phase === 'prepare') pane.classList.add('phase-prepare');
  }

  const figTrain = document.getElementById('fig-train');
  const figRest = document.getElementById('fig-rest');
  const showTrain = state.status !== 'finished' && state.phase === 'training';
  const showRest =
    state.status !== 'finished' && (state.phase === 'pause' || state.phase === 'prepare');
  figTrain.classList.toggle('hidden', !showTrain);
  figRest.classList.toggle('hidden', !showRest);

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

function formatDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function renderHistory(entries) {
  const el = document.getElementById('history-list');
  if (!entries || entries.length === 0) {
    el.innerHTML = '<div class="history-empty">Noch keine Trainings aufgezeichnet.</div>';
    return;
  }
  el.innerHTML = entries
    .map((e) => {
      const when = formatDateTime(e.dateISO);
      const dur = formatTime(e.durationSec);
      const puls = e.avgPulse == null ? 'Puls —' : `ø ${e.avgPulse} · max ${e.maxPulse}`;
      return `<div class="history-item">
      <div class="history-when">${when}</div>
      <div class="history-meta">${e.rounds} Runden · ${dur} · ${puls}</div>
    </div>`;
    })
    .join('');
}
