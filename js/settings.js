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
