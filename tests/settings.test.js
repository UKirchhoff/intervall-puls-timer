import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, clampSettings, loadSettings, saveSettings } from '../js/settings.js';

describe('DEFAULT_SETTINGS', () => {
  it('hat sinnvolle Startwerte', () => {
    expect(DEFAULT_SETTINGS.rounds).toBe(10);
    expect(DEFAULT_SETTINGS.trainingSec).toBe(40);
    expect(DEFAULT_SETTINGS.pauseSec).toBe(20);
    expect(DEFAULT_SETTINGS.pulseLower).toBe(110);
    expect(DEFAULT_SETTINGS.pulseUpper).toBe(150);
    expect(DEFAULT_SETTINGS.volume).toBeCloseTo(0.7);
    expect(DEFAULT_SETTINGS.sounds.phaseChange.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.sounds.countdown.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.sounds.pulseAlarm.enabled).toBe(true);
  });
});

describe('clampSettings', () => {
  it('begrenzt Runden auf mindestens 1', () => {
    expect(clampSettings({ rounds: 0 }).rounds).toBe(1);
  });
  it('erlaubt Pause 0, aber Training mindestens 1', () => {
    expect(clampSettings({ pauseSec: 0 }).pauseSec).toBe(0);
    expect(clampSettings({ trainingSec: 0 }).trainingSec).toBe(1);
  });
  it('erzwingt Obergrenze über Untergrenze', () => {
    const s = clampSettings({ pulseLower: 150, pulseUpper: 150 });
    expect(s.pulseUpper).toBeGreaterThan(s.pulseLower);
  });
  it('begrenzt Lautstärke auf 0..1', () => {
    expect(clampSettings({ volume: 5 }).volume).toBe(1);
    expect(clampSettings({ volume: -2 }).volume).toBe(0);
  });
});

describe('load/save', () => {
  function fakeStorage() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, v),
    };
  }
  it('liefert Defaults ohne gespeicherte Daten', () => {
    const s = loadSettings(fakeStorage());
    expect(s.rounds).toBe(10);
  });
  it('speichert und lädt denselben Wert', () => {
    const storage = fakeStorage();
    saveSettings({ ...DEFAULT_SETTINGS, rounds: 5 }, storage);
    expect(loadSettings(storage).rounds).toBe(5);
  });
  it('repariert beschädigte Daten zu Defaults', () => {
    const storage = fakeStorage();
    storage.setItem('intervallPulsTimer.settings', '{kaputt');
    expect(loadSettings(storage).rounds).toBe(10);
  });
});
