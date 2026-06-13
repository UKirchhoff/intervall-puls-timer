import { describe, it, expect } from 'vitest';
import { zoneFor, createAlarmArmer } from '../js/pulseZones.js';

describe('zoneFor', () => {
  it('liefert none für fehlenden Wert', () => {
    expect(zoneFor(null, 110, 150)).toBe('none');
    expect(zoneFor(NaN, 110, 150)).toBe('none');
  });
  it('liefert low unterhalb der Untergrenze', () => {
    expect(zoneFor(100, 110, 150)).toBe('low');
  });
  it('liefert in innerhalb (Grenzen eingeschlossen)', () => {
    expect(zoneFor(110, 110, 150)).toBe('in');
    expect(zoneFor(130, 110, 150)).toBe('in');
    expect(zoneFor(150, 110, 150)).toBe('in');
  });
  it('liefert high oberhalb der Obergrenze', () => {
    expect(zoneFor(151, 110, 150)).toBe('high');
  });
});

describe('createAlarmArmer', () => {
  it('feuert einmalig beim Überschreiten und erst nach Rückkehr erneut', () => {
    const a = createAlarmArmer();
    expect(a.check(140, 150)).toBe(false); // im Bereich
    expect(a.check(151, 150)).toBe(true);  // Flanke nach oben
    expect(a.check(160, 150)).toBe(false); // bleibt oben -> kein erneutes Feuern
    expect(a.check(150, 150)).toBe(false); // zurück im Bereich -> schärft wieder
    expect(a.check(155, 150)).toBe(true);  // erneute Flanke
  });
  it('ignoriert fehlende Werte ohne den Zustand zu ändern', () => {
    const a = createAlarmArmer();
    expect(a.check(null, 150)).toBe(false);
    expect(a.check(151, 150)).toBe(true);
  });
  it('reset() schärft den Alarm wieder', () => {
    const a = createAlarmArmer();
    expect(a.check(151, 150)).toBe(true);
    a.reset();
    expect(a.check(151, 150)).toBe(true);
  });
});
