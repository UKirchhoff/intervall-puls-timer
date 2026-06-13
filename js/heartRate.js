// Reine Auswertung des Bluetooth Heart-Rate-Measurement (GATT 0x2A37).
// Flags-Byte Bit 0: 0 => Wert ist uint8 ab Offset 1, 1 => uint16 little-endian ab Offset 1.
export function parseHeartRate(dataview) {
  const flags = dataview.getUint8(0);
  const is16bit = (flags & 0x01) === 0x01;
  return is16bit ? dataview.getUint16(1, true) : dataview.getUint8(1);
}

export function isSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

// Browser-only Verbindungsschicht. onPulse(number|null), onStatus(string).
export function createHeartRateSensor({ onPulse, onStatus }) {
  let device = null;
  let characteristic = null;

  function handleValue(event) {
    onPulse(parseHeartRate(event.target.value));
  }

  async function openGatt() {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('heart_rate');
    characteristic = await service.getCharacteristic('heart_rate_measurement');
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', handleValue);
    onStatus('verbunden');
  }

  async function handleDisconnect() {
    onStatus('Verbindung verloren – versuche neu …');
    onPulse(null);
    try {
      await openGatt();
    } catch {
      onStatus('getrennt');
    }
  }

  async function connect() {
    if (!isSupported()) {
      onStatus('Bluetooth hier nicht verfügbar – bitte Bluefy-Browser verwenden');
      return;
    }
    try {
      onStatus('verbinde …');
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      device.addEventListener('gattserverdisconnected', handleDisconnect);
      await openGatt();
    } catch {
      onStatus('Verbindung abgebrochen');
    }
  }

  function disconnect() {
    if (device && device.gatt && device.gatt.connected) {
      device.gatt.disconnect();
    }
    onPulse(null);
    onStatus('getrennt');
  }

  return { connect, disconnect };
}
