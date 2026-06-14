// Trainings-Verlauf: reine Logik (Ø/Max-Puls) + Persistenz über injizierbaren Storage.
const STORAGE_KEY = 'intervallPulsTimer.history';
const MAX_ENTRIES = 50;

// Mittelwert (gerundet) und Maximum aus gesammelten Pulswerten.
// Ohne gültige Werte: { avg: null, max: null }.
export function pulseStats(samples) {
  const valid = (samples || []).filter((n) => Number.isFinite(n));
  if (valid.length === 0) return { avg: null, max: null };
  const sum = valid.reduce((a, b) => a + b, 0);
  return { avg: Math.round(sum / valid.length), max: Math.max(...valid) };
}

export function loadHistory(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Neuen Eintrag vorne anfügen (neueste zuerst), auf MAX_ENTRIES begrenzen.
export function addEntry(storage, entry) {
  const list = loadHistory(storage);
  list.unshift(entry);
  const trimmed = list.slice(0, MAX_ENTRIES);
  storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearHistory(storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
}
