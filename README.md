# Intervall-Timer (Etappe 2)

Web-App: Intervall-Trainings-Timer mit einstellbaren Runden/Zeiten, konfigurierbaren Signaltönen und Puls vom Bluetooth-Brustgurt mit Pulszonen-Anzeige.

## Starten (zum Testen am PC)
1. `npm install`
2. Statischen Server starten, z. B. `npx http-server -p 8080 .`
3. Browser öffnen: `http://localhost:8080`

## Auf dem iPad (mit Puls, ab Etappe 2)
Für den Bluetooth-Pulsgurt wird der kostenlose Browser **Bluefy** benötigt (Safari kann
kein Web-Bluetooth). Dateien per lokalem/gehostetem Server öffnen, in Bluefy laden,
„Verbinden" tippen und den Gurt koppeln. Ohne Gurt funktioniert weiterhin das
manuelle Test-Puls-Feld.

## Am PC testen (mit Puls)
Web-Bluetooth funktioniert in Chrome/Edge am PC: Server starten, Seite öffnen,
„Verbinden" – ein vorhandener Gurt lässt sich direkt koppeln. Ohne Gurt das
Test-Puls-Feld nutzen.

## Pulszonen
Untergrenze/Obergrenze in den Einstellungen festlegen. Anzeige: unter der Untergrenze
gelb, im Zielbereich weiß, über der Obergrenze rot. Beim Überschreiten der Obergrenze
ertönt einmalig der Puls-Alarm (während eines laufenden Trainings, falls aktiviert).

## Bildschirm wach halten
Während eines laufenden Trainings (inkl. Pause) bleibt der Bildschirm an
(Screen Wake Lock). Beim Beenden oder am Trainingsende wird er wieder freigegeben.
Funktioniert in Browsern mit Wake-Lock-Unterstützung (u. a. Bluefy auf iPadOS 16.4+).

## Tests
`npm test`
