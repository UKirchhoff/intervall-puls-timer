# Intervall-Timer (Etappe 1)

Web-App: Intervall-Trainings-Timer mit einstellbaren Runden/Zeiten und konfigurierbaren Signaltönen. Puls ist in dieser Etappe ein manueller Test-Wert (echter Bluetooth-Puls folgt in Etappe 2).

## Starten (zum Testen am PC)
1. `npm install`
2. Statischen Server starten, z. B. `npx http-server -p 8080 .`
3. Browser öffnen: `http://localhost:8080`

## Auf dem iPad (Etappe 1)
Funktioniert im normalen Safari (kein Bluetooth nötig). Dateien auf das iPad bringen
und über einen lokalen/gehosteten Server öffnen, dann „Zum Home-Bildschirm" hinzufügen.

## Tests
`npm test`
