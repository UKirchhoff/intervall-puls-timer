export function createTimer(config) {
  const rounds = config.rounds;
  const trainingSec = config.trainingSec;
  const pauseSec = config.pauseSec;

  let state = {
    status: 'idle', // 'idle' | 'running' | 'paused' | 'finished'
    phase: 'training', // 'training' | 'pause'
    round: 1,
    remaining: trainingSec,
  };

  function getState() {
    return { ...state };
  }

  function start() {
    if (state.status === 'idle' || state.status === 'paused') {
      state.status = 'running';
    }
  }

  function pause() {
    if (state.status === 'running') state.status = 'paused';
  }

  function stop() {
    state = { status: 'finished', phase: state.phase, round: state.round, remaining: 0 };
  }

  function advancePhase(events) {
    if (state.phase === 'training' && pauseSec > 0) {
      state.phase = 'pause';
      state.remaining = pauseSec;
      events.push({ type: 'phaseChange', to: 'pause', round: state.round });
      return;
    }
    // Pause beendet (oder übersprungen) -> nächste Runde
    if (state.round >= rounds) {
      state.status = 'finished';
      state.remaining = 0;
      events.push({ type: 'finished' });
      return;
    }
    state.round += 1;
    state.phase = 'training';
    state.remaining = trainingSec;
    events.push({ type: 'phaseChange', to: 'training', round: state.round });
  }

  function tick() {
    const events = [];
    if (state.status !== 'running') return events;
    state.remaining -= 1;
    if (state.remaining > 0 && state.remaining <= 3) {
      events.push({ type: 'countdown', value: state.remaining });
    }
    if (state.remaining <= 0) {
      advancePhase(events);
    }
    return events;
  }

  return { getState, start, pause, stop, tick };
}
