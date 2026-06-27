# Wetter App

Eine einfache, responsive Wetter-Webapp mit Stadtsuche, aktuellem Wetter und 7-Tage-Vorhersage.

Verwendet die kostenlose [Open-Meteo API](https://open-meteo.com/) (kein API-Key erforderlich).

## Live

Die App ist über GitHub Pages erreichbar:
https://hendr15k.github.io/wetter-app/

## Funktionen

- **Stadtsuche mit Autovervollständigung** – Vorschläge während der Eingabe
- **Aktuelles Wetter** – Temperatur, Gefühlte Temperatur, Luftfeuchte, Windgeschwindigkeit, Luftdruck
- **7-Tage Vorhersage** – Tageshöchst- und -niedrigstwerte mit Wetter-Icons
- **Temperatur-Umschaltung** – Zwischen Celsius und Fahrenheit wechseln
- **Responsive Design** – Optimiert für Desktop und Mobile
- **Fehlerbehandlung** – Anzeige von Fehlermeldungen bei Problemen

## Technologie

- HTML, CSS und Vanilla JavaScript (keine Abhängigkeiten, kein Build-Step)
- [Open-Meteo Geocoding API](https://geocoding-api.open-meteo.com/) für Stadtsuche
- [Open-Meteo Forecast API](https://api.open-meteo.com/) für Wetterdaten

## Dateien

| Datei | Beschreibung |
|-------|-------------|
| `index.html` | HTML-Struktur der Seite |
| `styles.css` | Styling und responsive Design |
| `app.js` | Anwendungslogik und API-Aufrufe |

## Lokal ausführen

```bash
# Repository klonen
git clone https://github.com/hendr15k/wetter-app.git
cd wetter-app

# Lokalen Server starten
python3 -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

## Lizenz

MIT