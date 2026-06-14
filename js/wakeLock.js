// Hält den Bildschirm während des Trainings wach (Screen Wake Lock API).
// Browser-only; bei fehlender Unterstützung passiert nichts (graceful).
export function createWakeLock() {
  let sentinel = null;
  let active = false;

  async function request() {
    if (!('wakeLock' in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    } catch {
      sentinel = null;
    }
  }

  // iOS gibt den Wake Lock frei, wenn man die App kurz verlässt – beim
  // Zurückkehren neu anfordern, solange ein Training aktiv ist.
  function onVisibility() {
    if (active && document.visibilityState === 'visible' && !sentinel) {
      request();
    }
  }

  function enable() {
    if (active) return;
    active = true;
    document.addEventListener('visibilitychange', onVisibility);
    request();
  }

  async function disable() {
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        /* ignorieren */
      }
      sentinel = null;
    }
  }

  return { enable, disable };
}
