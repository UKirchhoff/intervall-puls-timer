import { describe, it, expect } from 'vitest';
import { createTimer } from '../js/timer.js';

const cfg = { rounds: 2, trainingSec: 3, pauseSec: 2 };

describe('createTimer', () => {
  it('startet im Leerlauf, Runde 1, Training, volle Trainingszeit', () => {
    const t = createTimer(cfg);
    expect(t.getState()).toEqual({
      status: 'idle', phase: 'training', round: 1, remaining: 3,
    });
  });

  it('tick ohne start tut nichts', () => {
    const t = createTimer(cfg);
    expect(t.tick()).toEqual([]);
    expect(t.getState().remaining).toBe(3);
  });

  it('start + tick zählt herunter', () => {
    const t = createTimer(cfg);
    t.start();
    t.tick();
    expect(t.getState().remaining).toBe(2);
  });
});

function tickN(t, n) {
  const all = [];
  for (let i = 0; i < n; i++) all.push(...t.tick());
  return all;
}

describe('Übergänge & Ereignisse', () => {
  it('emittiert countdown 3,2,1 in einer Trainingsphase', () => {
    const t = createTimer({ rounds: 1, trainingSec: 4, pauseSec: 0 });
    t.start();
    const ev = tickN(t, 3); // remaining 4->3->2->1
    const counts = ev.filter((e) => e.type === 'countdown').map((e) => e.value);
    expect(counts).toEqual([3, 2, 1]);
  });

  it('wechselt von Training zu Pause', () => {
    const t = createTimer(cfg); // training 3, pause 2
    t.start();
    const ev = tickN(t, 3); // 3->2->1->0 => phaseChange
    expect(ev).toContainEqual({ type: 'phaseChange', to: 'pause', round: 1 });
    expect(t.getState()).toMatchObject({ phase: 'pause', round: 1, remaining: 2 });
  });

  it('wechselt nach der Pause in die nächste Runde', () => {
    const t = createTimer(cfg);
    t.start();
    tickN(t, 3); // -> Pause Runde 1 (remaining 2)
    const ev = tickN(t, 2); // Pause 2->1->0 => nächste Runde
    expect(ev).toContainEqual({ type: 'phaseChange', to: 'training', round: 2 });
    expect(t.getState()).toMatchObject({ phase: 'training', round: 2, remaining: 3 });
  });

  it('endet nach der letzten Runde mit finished', () => {
    const t = createTimer(cfg); // 2 Runden
    t.start();
    tickN(t, 3); // Pause R1
    tickN(t, 2); // Training R2
    tickN(t, 3); // Pause R2
    const ev = tickN(t, 2); // Pause R2 zu Ende -> finished
    expect(ev).toContainEqual({ type: 'finished' });
    expect(t.getState().status).toBe('finished');
  });

  it('überspringt die Pause, wenn pauseSec 0 ist', () => {
    const t = createTimer({ rounds: 2, trainingSec: 2, pauseSec: 0 });
    t.start();
    const ev = tickN(t, 2); // Training R1 -> direkt nächste Runde Training
    expect(ev).toContainEqual({ type: 'phaseChange', to: 'training', round: 2 });
    expect(t.getState()).toMatchObject({ phase: 'training', round: 2 });
  });

  it('pause() hält an, danach läuft start() weiter', () => {
    const t = createTimer(cfg);
    t.start();
    t.tick(); // remaining 2
    t.pause();
    expect(t.tick()).toEqual([]); // pausiert: kein Fortschritt
    expect(t.getState().remaining).toBe(2);
    t.start();
    t.tick();
    expect(t.getState().remaining).toBe(1);
  });
});
