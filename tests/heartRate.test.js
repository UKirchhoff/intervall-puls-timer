import { describe, it, expect } from 'vitest';
import { parseHeartRate, isSupported } from '../js/heartRate.js';

function dv(bytes) {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('parseHeartRate', () => {
  it('liest 8-Bit-Wert (Flags Bit0 = 0)', () => {
    expect(parseHeartRate(dv([0x00, 72]))).toBe(72);
  });
  it('liest 16-Bit-Wert little-endian (Flags Bit0 = 1)', () => {
    // 0x012C = 300
    expect(parseHeartRate(dv([0x01, 0x2c, 0x01]))).toBe(300);
  });
  it('ignoriert höhere Flag-Bits und liest trotzdem 8-Bit', () => {
    expect(parseHeartRate(dv([0x10, 88]))).toBe(88);
  });
});

describe('isSupported', () => {
  it('ist in Node (kein navigator.bluetooth) false', () => {
    expect(isSupported()).toBe(false);
  });
});
