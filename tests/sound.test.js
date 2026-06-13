import { describe, it, expect } from 'vitest';
import { SOUND_LIBRARY, getToneSpec } from '../js/sound.js';

describe('SOUND_LIBRARY', () => {
  it('enthält die erwarteten Klänge mit id und label', () => {
    const ids = SOUND_LIBRARY.map((s) => s.id);
    expect(ids).toEqual([
      'kurzer-piep', 'doppelpiep', 'hoher-piep',
      'glocke', 'gong', 'klick', 'alarm-glocke',
    ]);
    for (const s of SOUND_LIBRARY) {
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
});

describe('getToneSpec', () => {
  it('liefert eine nicht-leere Tonfolge für jede id', () => {
    for (const s of SOUND_LIBRARY) {
      const spec = getToneSpec(s.id);
      expect(Array.isArray(spec)).toBe(true);
      expect(spec.length).toBeGreaterThan(0);
      for (const note of spec) {
        expect(typeof note.freq).toBe('number');
        expect(typeof note.dur).toBe('number');
        expect(note.dur).toBeGreaterThan(0);
      }
    }
  });

  it('fällt bei unbekannter id auf einen Standard-Piep zurück', () => {
    const spec = getToneSpec('gibtsnicht');
    expect(spec.length).toBeGreaterThan(0);
  });
});
