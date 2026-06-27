# Wetter App

Eine moderne, responsive Wetter-Webapp mit Stadtsuche, aktuellem Wetter, stündlicher Vorhersage, 7-Tage-Vorhersage, interaktiver Karte, Favoriten, Dark Mode und animierten Wetter-Icons.

Verwendet die kostenlose [Open-Meteo API](https://open-meteo.com/) (kein API-Key erforderlich).

## Live

Die App ist über GitHub Pages erreichbar:
https://hendr15k.github.io/wetter-app/

## Funktionen

- **Stadtsuche mit Autovervollständigung** – Vorschläge während der Eingabe
- **Geolocation** – Wetter für den aktuellen Standort per GPS
- **Aktuelles Wetter** – Temperatur, Gefühlte Temperatur, Luftfeuchte, Windgeschwindigkeit, Luftdruck
- **Stündliche Vorhersage (24h)** – Temperaturen, Wetter-Icons und Niederschlagswahrscheinlichkeit
- **7-Tage Vorhersage** – Tageshöchst- und -niedrigstwerte mit Wetter-Icons
- **Temperatur-Umschaltung** – Zwischen Celsius und Fahrenheit wechseln
- **Favoriten** – Städte speichern und schnell aufrufen (via localStorage)
- **Dark Mode** – Umschaltbares dunkles Design (Einstellung wird gespeichert)
- **Animierte Wetter-Icons** – Sonne, Wolken, Regen, Schnee, Gewitter mit CSS-Animationen
- **Interaktive Wetter-Karte** – Leaflet-Karte mit Marker und Wetter-Popup
- **Responsive Design** – Optimiert für Desktop und Mobile

## Technologie

- HTML, CSS und Vanilla JavaScript (keine Abhängigkeiten, kein Build-Step)
- [Open-Meteo Geocoding API](https://geocoding-api.open-meteo.com/) für Stadtsuche
- [Open-Meteo Forecast API](https://api.open-meteo.com/) für Wetterdaten
- [Leaflet](https://leafletjs.com/) für die interaktive Karte
- [CARTO](https://carto.com/) für die Karten-Tiles (Light/Dark)
- CSS-Animationen für animierte Wetter-Icons

## Dateien

| Datei | Beschreibung |
|-------|-------------|
| `index.html` | HTML-Struktur der Seite |
| `styles.css` | Styling, Animationen, Dark Mode, Responsive Design |
| `app.js` | Anwendungslogik, API-Aufrufe, Karte, Favoriten |

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