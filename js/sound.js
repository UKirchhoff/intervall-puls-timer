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
