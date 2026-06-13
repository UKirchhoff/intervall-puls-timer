# Design: iPad Intervall-Timer mit Pulsanzeige

**Datum:** 2026-06-13
**Status:** Abgestimmt (bereit für Umsetzungsplan)

## 1. Ziel & Kontext

Eine App für das iPad, die einen **Intervall-Trainings-Timer** mit gleichzeitiger
**Puls-Anzeige** (von einem Bluetooth-Brustgurt) darstellt. Der Nutzer hat keine
Programmiererfahrung; den Code schreibt der Assistent. Es ist kein Mac vorhanden,
nur iPad + Windows-PC.

### Gewählter technischer Weg
**Web-App** (HTML/CSS/JavaScript), die auf dem iPad im Browser **Bluefy** (von PNN Soft,
kostenlos) läuft. Grund: Apples Safari unterstützt kein Web-Bluetooth; Bluefy ist der
einzige praktikable Weg, einen Bluetooth-Pulsgurt ohne native App (und damit ohne Mac)
auszulesen. Die App kann als Icon auf den iPad-Startbildschirm gelegt werden.

**Bewusst verworfen:** Native App via Swift Playgrounds (Weg B) — sauberer beim Bluetooth,
aber nicht testbar durch den Assistenten und komplexerer Code. Bei Bedarf später möglich.

## 2. Funktionsumfang

### Timer-Logik (klassisches Intervalltraining)
- Einstellbar: **Anzahl Runden** (z. B. 10), **Training-Sekunden**, **Pause-Sekunden**.
- Ablauf: Runde 1: Training (Countdown) → Pause (Countdown) → Runde 2 … bis alle
  Runden durch sind → Abschluss-Bildschirm.

### Pulszonen
- Einstellbare **Untergrenze** und **Obergrenze** (in bpm).
- Farbliche Anzeige des Pulswerts:
  - **unterhalb** Untergrenze → **gelb**
  - **innerhalb** des Bereichs → **weiß**
  - **oberhalb** Obergrenze → **rot**
- **Kurzes Akustik-Signal**, wenn die Obergrenze überschritten wird (Puls-Alarm).

### Signaltöne (alle konfigurierbar)
Drei Ereignisse, jeweils **an/aus** + **Klangauswahl** (aus fester, mitgelieferter Liste)
+ **Vorhör-Knopf**; eine **gemeinsame Lautstärke**:
1. **Phasenwechsel-Ton** — bei Wechsel Training ⇄ Pause und am Ende.
2. **Countdown-Piepser (3-2-1)** — in den letzten 3 Sekunden jeder Phase.
3. **Puls-Alarm** — bei Überschreiten der Obergrenze.

Mitgelieferte Klänge (Vorschlag): Kurzer Piep · Doppelpiep · Hoher Piep · Glocke ·
Gong · Klick · Alarm-Glocke. **Keine** eigenen Sounddateien (bewusst ausgeschlossen, YAGNI).

## 3. Bildschirme

### A) Einstellungen / Startseite
- Bereich **Ablauf:** Runden, Training (mm:ss), Pause (mm:ss) — per +/− änderbar.
- Bereich **Pulszonen:** Untergrenze (gelb), Obergrenze (rot).
- Bereich **Signaltöne:** je Ereignis an/aus + Klang-Dropdown + Vorhören; Lautstärke-Regler.
- Bereich **Pulsgurt:** Knopf „Verbinden" (Status: verbunden / nicht verbunden).
- Großer **„Training starten"**-Knopf.

### B) Training aktiv (Layout „C")
- **Linke Hälfte:** großer Puls (Herz-Symbol + bpm), Farbe nach Pulszone (gelb/weiß/rot).
- **Rechte Hälfte:** großer Countdown; Hintergrund **grün = Training**, **orange = Pause**;
  Phasen-Name + „Runde X/N".
- **Oben:** Punkte-Reihe als Runden-Fortschritt.
- **Bedienung:** Pause-/Stopp-Knopf, um das Training anzuhalten/zu beenden.

## 4. Architektur

Reines HTML/CSS/JavaScript, **kein Framework** (einfach, lernbar, wartbar). Aufgeteilt in
klar abgegrenzte Bausteine mit je einer Aufgabe:

| Baustein | Aufgabe | Abhängigkeiten |
|---|---|---|
| **Einstellungs-Speicher** | Werte halten + im iPad persistieren (localStorage) | — |
| **Timer-Maschine** | Phasen-Ablauf (Training→Pause→nächste Runde), Countdown, Ende-Erkennung | Einstellungen |
| **Puls-Modul** | Bluetooth-Gurt verbinden, Herzfrequenz lesen (BLE Heart Rate Service, GATT 0x180D) | Web Bluetooth (Bluefy) |
| **Pulszonen-Logik** | Farbe bestimmen (gelb/weiß/rot) + Alarm-Auslösung | Einstellungen, Puls-Modul |
| **Ton-Modul** | Mitgelieferte Klänge abspielen je nach Konfiguration | Einstellungen |
| **Anzeige (UI)** | Beide Bildschirme zeichnen und aktualisieren | alle obigen |
| **Bildschirm-Wachhalter** | Screen Wake Lock während des Trainings | — |

### Datenfluss
- Gurt → Puls-Modul liefert ~1×/Sek. einen bpm-Wert → Pulszonen-Logik färbt Anzeige
  und löst ggf. Alarm aus.
- Timer-Maschine tickt jede Sekunde, schaltet Phasen, stößt Phasenwechsel-/Countdown-Töne an.
- Anzeige liest Timer- und Pulszustand und stellt beides dar.

## 5. Fehlerbehandlung
- **Kein Web-Bluetooth (z. B. Safari statt Bluefy):** klare Hinweismeldung
  („Bitte Bluefy-Browser verwenden"); Timer funktioniert vollständig auch ohne Puls.
- **Verbindungsabbruch des Gurts:** Puls zeigt „—", Timer läuft weiter, automatischer
  Wiederverbindungsversuch.
- **Eingabe-Grenzen:** min. 1 Runde; Training ≥ 1 Sek.; Pause ≥ 0 Sek.; Untergrenze < Obergrenze.

## 6. Testen
- **Automatisiert testbar:** Timer-Maschine (Phasenübergänge, Countdown, Rundenzählung)
  und Pulszonen-Logik (Farb-/Alarm-Schwellen) — reine Logik.
- **Manuell auf dem iPad:** Bluetooth-Verbindung, Tonausgabe, Wake Lock, Darstellung.

## 7. Umsetzung in Etappen (Aufwand & Zeitplan)

| Etappe | Inhalt | Assistent-Bauzeit | Nutzer-Mitarbeit |
|---|---|---|---|
| **1 – Timer-MVP** | Beide Bildschirme, Einstellungen + Speichern, kompletter Timer-Ablauf, Signaltöne mit Klangwahl. Puls als manueller Test-Wert. | ~1 Sitzung | App testen (~15 Min.) |
| **2 – Puls live** | Bluetooth-Gurt, echter Puls, Pulszonen-Farben + Puls-Alarm. | ~1 Sitzung | Bluefy installieren, Gurt koppeln, testen (~30 Min.) |
| **3 – Feinschliff** | Wake Lock, Startbildschirm-Icon (PWA), Design-Politur, Tests. | ~halbe Sitzung | Gegentesten (~15 Min.) |

- Bereits nach **Etappe 1** existiert ein voll nutzbarer Intervall-Timer mit Tönen.
- **Realistische Gesamtdauer:** 1–2 Tage im Wechsel (bauen → testen → nachbessern);
  reine Bauzeit wenige Stunden, Rest ist die Test-Schleife.
- **Größtes Risiko:** Etappe 2 (Bluetooth-Verhalten des konkreten Gurts mit Bluefy).
  Fällt diese aus, ist Etappe 1 dennoch ein fertiges, brauchbares Werkzeug.

### Voraussetzungen Nutzer-Seite
iPad (vorhanden), kostenlose **Bluefy**-App, **Bluetooth-Pulsgurt** (z. B. Polar H10) ab Etappe 2.

## 8. Bewusst ausgeschlossen (YAGNI)
- Eigene Sounddateien hochladen.
- Trainings-Verlauf/Historie, Statistiken, Export.
- Mehrere Trainings-Profile/Vorlagen.
- Cloud/Account/Sync.

(Können bei Bedarf in einer späteren Iteration ergänzt werden.)
