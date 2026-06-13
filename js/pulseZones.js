export function zoneFor(pulse, lower, upper) {
  if (pulse == null || !Number.isFinite(pulse)) return 'none';
  if (pulse < lower) return 'low';
  if (pulse > upper) return 'high';
  return 'in';
}

// Kantengetriggerter Alarm: check() liefert true genau im Moment des Überschreitens
// der Obergrenze und erst wieder, nachdem der Puls zwischendurch <= Obergrenze war.
export function createAlarmArmer() {
  let armed = true;
  return {
    check(pulse, upper) {
      if (pulse == null || !Number.isFinite(pulse)) return false;
      if (pulse > upper) {
        if (armed) {
          armed = false;
          return true;
        }
        return false;
      }
      armed = true;
      return false;
    },
    reset() {
      armed = true;
    },
  };
}
