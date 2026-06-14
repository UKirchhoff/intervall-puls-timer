import { describe, it, expect } from 'vitest';
import { pulseStats, loadHistory, addEntry, clearHistory } from '../js/history.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

describe('pulseStats', () => {
  it('liefert null bei keinen Werten', () => {
    expect(pulseStats([])).toEqual({ avg: null, max: null });
    expect(pulseStats(null)).toEqual({ avg: null, max: null });
  });
  it('berechnet gerundeten Mittelwert und Maximum', () => {
    expect(pulseStats([100, 110, 121])).toEqual({ avg: 110, max: 121 });
  });
  it('ignoriert ungültige Werte', () => {
    expect(pulseStats([120, null, NaN, 140])).toEqual({ avg: 130, max: 140 });
  });
});

describe('Verlauf-Speicher', () => {
  it('liefert leere Liste ohne Daten und bei Schrott', () => {
    expect(loadHistory(fakeStorage())).toEqual([]);
    const s = fakeStorage();
    s.setItem('intervallPulsTimer.history', '{kaputt');
    expect(loadHistory(s)).toEqual([]);
  });

  it('fügt neueste Einträge vorne an', () => {
    const s = fakeStorage();
    addEntry(s, { rounds: 1 });
    addEntry(s, { rounds: 2 });
    const list = loadHistory(s);
    expect(list[0].rounds).toBe(2);
    expect(list[1].rounds).toBe(1);
  });

  it('begrenzt auf 50 Einträge', () => {
    const s = fakeStorage();
    for (let i = 0; i < 55; i++) addEntry(s, { rounds: i });
    const list = loadHistory(s);
    expect(list.length).toBe(50);
    expect(list[0].rounds).toBe(54); // neuester
    expect(list[49].rounds).toBe(5); // ältester noch vorhandener
  });

  it('clearHistory leert die Liste', () => {
    const s = fakeStorage();
    addEntry(s, { rounds: 1 });
    expect(clearHistory(s)).toEqual([]);
    expect(loadHistory(s)).toEqual([]);
  });
});
