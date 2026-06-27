const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const REVERSE_GEO_API = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

let currentUnit = 'celsius';
let selectedCity = null;
let searchTimeout = null;
let weatherMap = null;
let currentWeatherData = null;
let currentTileLayer = null;
let lastFetchLat = null;
let lastFetchLon = null;
let lastFetchName = null;
const favoriteKey = 'wetterApp_favorites';
const themeKey = 'wetterApp_theme';

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const suggestions = document.getElementById('suggestions');
const errorDisplay = document.getElementById('errorDisplay');
const mainContent = document.getElementById('mainContent');
const loading = document.getElementById('loading');
const unitC = document.getElementById('unitC');
const unitF = document.getElementById('unitF');
const geoBtn = document.getElementById('geoBtn');
const themeBtn = document.getElementById('themeBtn');
const favBtn = document.getElementById('favBtn');
const favoritesContainer = document.getElementById('favoritesContainer');
const favoritesList = document.getElementById('favoritesList');

// ===== Theme =====
function initTheme() {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'dark') {
        document.body.classList.add('dark');
        themeBtn.textContent = '☀️';
    }
}

themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem(themeKey, isDark ? 'dark' : 'light');
    if (weatherMap) {
        if (currentTileLayer) weatherMap.removeLayer(currentTileLayer);
        currentTileLayer = createTileLayer(isDark).addTo(weatherMap);
        setTimeout(() => weatherMap.invalidateSize(), 200);
    }
});

// ===== Geolocation =====
geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showError('Geolocation wird von diesem Browser nicht unterstützt.');
        return;
    }
    geoBtn.textContent = '⏳';
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            geoBtn.textContent = '📍';
            reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
            geoBtn.textContent = '📍';
            showError('Standort konnte nicht ermittelt werden. Bitte Berechtigung prüfen.');
        },
        { timeout: 10000 }
    );
});

async function reverseGeocode(lat, lon) {
    hideError();
    let cityName = 'Mein Standort';
    try {
        const res = await fetch(`${REVERSE_GEO_API}?latitude=${lat}&longitude=${lon}&localityLanguage=de`);
        const data = await res.json();
        if (data.city) cityName = data.city;
        else if (data.locality) cityName = data.locality;
        else if (data.principalSubdivision) cityName = data.principalSubdivision;
    } catch {}
    selectedCity = { lat, lon, name: cityName };
    cityInput.value = cityName;
    fetchWeather(lat, lon, cityName);
}

// ===== Search =====
cityInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = cityInput.value.trim();
    if (query.length < 2) {
        suggestions.classList.add('hidden');
        return;
    }
    searchTimeout = setTimeout(() => fetchSuggestions(query), 300);
});

cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const query = cityInput.value.trim();
        if (query) searchCity(query);
    }
    if (e.key === 'Escape') {
        suggestions.classList.add('hidden');
        cityInput.blur();
    }
});

searchBtn.addEventListener('click', () => {
    const query = cityInput.value.trim();
    if (query) searchCity(query);
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        suggestions.classList.add('hidden');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        suggestions.classList.add('hidden');
    }
});

async function fetchSuggestions(query) {
    try {
        const res = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=5&language=de&format=json`);
        const data = await res.json();
        renderSuggestions(data.results || []);
    } catch {
        suggestions.classList.add('hidden');
    }
}

function renderSuggestions(results) {
    suggestions.innerHTML = '';
    if (results.length === 0) {
        suggestions.classList.add('hidden');
        return;
    }
    results.forEach(r => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`;
        div.addEventListener('click', () => {
            suggestions.classList.add('hidden');
            cityInput.value = r.name;
            selectedCity = { lat: r.latitude, lon: r.longitude, name: r.name };
            fetchWeather(r.latitude, r.longitude, r.name);
        });
        suggestions.appendChild(div);
    });
    suggestions.classList.remove('hidden');
}

async function searchCity(query) {
    try {
        suggestions.classList.add('hidden');
        const res = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=5&language=de&format=json`);
        const data = await res.json();
        const results = data.results || [];
        if (results.length === 0) {
            showError('Stadt nicht gefunden. Bitte versuche es mit einer anderen Eingabe.');
            return;
        }
        const city = results[0];
        selectedCity = { lat: city.latitude, lon: city.longitude, name: city.name };
        fetchWeather(city.latitude, city.longitude, city.name);
    } catch {
        showError('Fehler bei der Suche. Bitte versuche es später erneut.');
    }
}

// ===== Loading =====
function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// ===== Weather Fetch =====
async function fetchWeather(lat, lon, name, isRetry) {
    hideError();
    if (!isRetry) {
        showLoading();
        lastFetchLat = lat;
        lastFetchLon = lon;
        lastFetchName = name;
    }
    const tempUnit = currentUnit === 'celsius' ? 'celsius' : 'fahrenheit';
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,is_day` +
        `&hourly=weather_code,temperature_2m,precipitation_probability` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
        `&timezone=auto&forecast_days=7` +
        `&temperature_unit=${tempUnit}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API-Fehler');
        const data = await res.json();
        currentWeatherData = data;
        renderWeather(data, name, lat, lon);
        updateFavButton();
        hideLoading();
    } catch {
        hideLoading();
        showError('Fehler beim Abrufen der Wetterdaten. Bitte versuche es später erneut.', true);
    }
}

// ===== Weather Code Mappings =====
function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌦️';
    if (code <= 57) return '🌧️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '❄️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}

function getWeatherAnim(code) {
    if (code === 0) return 'sunny';
    if (code === 1) return 'sunny';
    if (code === 2) return 'cloudy';
    if (code === 3) return 'cloudy';
    if (code <= 48) return 'cloudy';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'snowy';
    if (code <= 82) return 'rainy';
    if (code <= 86) return 'snowy';
    if (code >= 95) return 'stormy';
    return 'cloudy';
}

function getWeatherDesc(code) {
    if (code === 0) return 'Klarer Himmel';
    if (code === 1) return 'Überwiegend sonnig';
    if (code === 2) return 'Teilweise bewölkt';
    if (code === 3) return 'Bewölkt';
    if (code <= 48) return 'Nebel';
    if (code <= 55) return 'Nieselregen';
    if (code <= 57) return 'Gefrierender Nieselregen';
    if (code <= 65) return 'Regen';
    if (code <= 67) return 'Gefrierender Regen';
    if (code <= 77) return 'Schnee';
    if (code <= 82) return 'Regenschauer';
    if (code <= 86) return 'Schneeschauer';
    if (code >= 95) return 'Gewitter';
    return 'Unbekannt';
}

function buildAnimIcon(code) {
    const type = getWeatherAnim(code);
    let inner = '';
    if (type === 'sunny') {
        inner = '<div class="anim-icon sunny"><div class="sun"></div></div>';
    } else if (type === 'cloudy') {
        inner = '<div class="anim-icon cloudy"><div class="cloud"></div><div class="cloud"></div></div>';
    } else if (type === 'rainy') {
        inner = '<div class="anim-icon rainy"><div class="cloud"></div><div class="raindrop"></div><div class="raindrop"></div><div class="raindrop"></div><div class="raindrop"></div><div class="raindrop"></div><div class="raindrop"></div></div>';
    } else if (type === 'snowy') {
        inner = '<div class="anim-icon snowy"><div class="cloud"></div><div class="snowflake">❄</div><div class="snowflake">❄</div><div class="snowflake">❄</div><div class="snowflake">❄</div></div>';
    } else if (type === 'stormy') {
        inner = '<div class="anim-icon stormy"><div class="cloud"></div><div class="bolt">⚡</div></div>';
    }
    return `<div class="anim-icon-large">${inner}</div>`;
}

// ===== Render Weather =====
function windDirToCompass(deg) {
    const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function formatTime(isoStr) {
    return new Date(isoStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function uvIndexLabel(uv) {
    if (uv == null) return '--';
    if (uv < 3) return `${uv} (Niedrig)`;
    if (uv < 6) return `${uv} (Mäßig)`;
    if (uv < 8) return `${uv} (Hoch)`;
    if (uv < 11) return `${uv} (Sehr hoch)`;
    return `${uv} (Extrem)`;
}

function renderWeather(data, name, lat, lon) {
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    const unitSymbol = currentUnit === 'celsius' ? '°C' : '°F';
    const today = new Date();
    const desc = getWeatherDesc(current.weather_code);
    const animIcon = buildAnimIcon(current.weather_code);
    const isDay = current.is_day === 1;
    const sunriseStr = daily.sunrise ? formatTime(daily.sunrise[0]) : '--';
    const sunsetStr = daily.sunset ? formatTime(daily.sunset[0]) : '--';
    const uvMax = daily.uv_index_max ? daily.uv_index_max[0].toFixed(1) : null;

    mainContent.innerHTML = `
        <div class="weather-display">
            <div class="current-weather${isDay ? '' : ' night'}">
                <div class="current-header">
                    <div>
                        <h2>${name}</h2>
                        <p class="weather-desc">${today.toLocaleDateString('de-DE', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}</p>
                        <p class="weather-desc-main">${desc}</p>
                    </div>
                    <div class="temp-large">${animIcon} ${Math.round(current.temperature_2m)}${unitSymbol}</div>
                </div>
                <div class="current-details">
                    <div class="detail-item">
                        <span class="detail-label">Gefühlt</span>
                        <span class="detail-value">${Math.round(current.apparent_temperature)}${unitSymbol}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Luftfeuchte</span>
                        <span class="detail-value">${current.relative_humidity_2m}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Wind</span>
                        <span class="detail-value">${Math.round(current.wind_speed_10m)} km/h ${windDirToCompass(current.wind_direction_10m)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Luftdruck</span>
                        <span class="detail-value">${Math.round(current.pressure_msl)} hPa</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">UV-Index</span>
                        <span class="detail-value">${uvIndexLabel(uvMax)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Sonnenauf/-untergang</span>
                        <span class="detail-value">🌅 ${sunriseStr} · 🌇 ${sunsetStr}</span>
                    </div>
                </div>
            </div>

            <div class="hourly-section">
                <h3>Stündliche Vorhersage (24h)</h3>
                <div class="hourly-container" id="hourlyContainer">
                    ${renderHourly(hourly, unitSymbol)}
                </div>
            </div>

            <div class="forecast">
                <h3>7-Tage Vorhersage</h3>
                <div class="forecast-container" id="forecastContainer">
                    ${renderForecast(daily, unitSymbol)}
                </div>
            </div>

            <div class="map-section">
                <h3>Wetter-Karte</h3>
                <div id="weatherMap"></div>
            </div>

            <div class="last-update">Zuletzt aktualisiert: ${today.toLocaleTimeString('de-DE')}</div>
        </div>
    `;

    initMap(lat, lon, name);
}

function renderHourly(hourly, unitSymbol) {
    const now = new Date();
    let startIndex = 0;
    for (let i = 0; i < hourly.time.length; i++) {
        const hourDate = new Date(hourly.time[i]);
        if (hourDate.getTime() >= now.getTime() - 3600000) {
            startIndex = i;
            break;
        }
    }

    let html = '';
    const count = Math.min(24, hourly.time.length - startIndex);

    for (let j = 0; j < count; j++) {
        const i = startIndex + j;
        const hourDate = new Date(hourly.time[i]);
        const timeStr = j === 0 ? 'Jetzt' : hourDate.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const icon = getWeatherIcon(hourly.weather_code[i]);
        const temp = Math.round(hourly.temperature_2m[i]);
        const rainProb = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
        const rainText = rainProb > 0 ? `<div class="hourly-rain">💧${rainProb}%</div>` : '';

        html += `
            <div class="hourly-item ${j === 0 ? 'now' : ''}">
                <div class="hourly-time">${timeStr}</div>
                <div class="hourly-icon">${icon}</div>
                <div class="hourly-temp">${temp}${unitSymbol}</div>
                ${rainText}
            </div>
        `;
    }
    return html;
}

function renderForecast(daily, unitSymbol) {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    let html = '';
    const today = new Date().getDay();

    for (let i = 0; i < daily.time.length; i++) {
        const dayName = i === 0 ? 'Heute' : days[(today + i) % 7];
        const icon = getWeatherIcon(daily.weather_code[i]);
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);

        html += `
            <div class="forecast-day">
                <div class="day-name">${dayName}</div>
                <div class="day-icon">${icon}</div>
                <div class="day-temp">${maxTemp}${unitSymbol} <span>${minTemp}${unitSymbol}</span></div>
            </div>
        `;
    }
    return html;
}

// ===== Leaflet Map =====
function createTileLayer(isDark) {
    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    return L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    });
}

function initMap(lat, lon, name) {
    if (weatherMap) {
        weatherMap.remove();
        weatherMap = null;
        currentTileLayer = null;
    }

    weatherMap = L.map('weatherMap', {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true
    }).setView([lat, lon], 10);

    weatherMap.on('focus', () => weatherMap.scrollWheelZoom.enable());
    weatherMap.on('blur', () => weatherMap.scrollWheelZoom.disable());

    currentTileLayer = createTileLayer(document.body.classList.contains('dark')).addTo(weatherMap);

    const emoji = getWeatherIcon(currentWeatherData.current.weather_code);
    L.marker([lat, lon]).addTo(weatherMap)
        .bindPopup(`<b>${name}</b><br>${emoji} ${getWeatherDesc(currentWeatherData.current.weather_code)}`)
        .openPopup();

    L.circle([lat, lon], {
        color: '#667eea',
        fillColor: '#667eea',
        fillOpacity: 0.1,
        radius: 50000
    }).addTo(weatherMap);

    setTimeout(() => weatherMap.invalidateSize(), 200);
}

// ===== Units =====
unitC.addEventListener('click', () => {
    if (currentUnit === 'celsius') return;
    currentUnit = 'celsius';
    unitC.classList.add('active');
    unitF.classList.remove('active');
    if (selectedCity) fetchWeather(selectedCity.lat, selectedCity.lon, selectedCity.name);
});

unitF.addEventListener('click', () => {
    if (currentUnit === 'fahrenheit') return;
    currentUnit = 'fahrenheit';
    unitF.classList.add('active');
    unitC.classList.remove('active');
    if (selectedCity) fetchWeather(selectedCity.lat, selectedCity.lon, selectedCity.name);
});

// ===== Favorites =====
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(favoriteKey)) || [];
    } catch {
        return [];
    }
}

function isFavorite(name) {
    return getFavorites().some(f => f.name === name);
}

function updateFavButton() {
    if (selectedCity && isFavorite(selectedCity.name)) {
        favBtn.textContent = '★';
        favBtn.classList.add('active');
    } else {
        favBtn.textContent = '☆';
        favBtn.classList.remove('active');
    }
}

favBtn.addEventListener('click', () => {
    if (!selectedCity) {
        showError('Bitte zuerst eine Stadt suchen.');
        return;
    }
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.name === selectedCity.name);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push({ name: selectedCity.name, lat: selectedCity.lat, lon: selectedCity.lon });
    }
    localStorage.setItem(favoriteKey, JSON.stringify(favs));
    renderFavorites();
    updateFavButton();
});

function renderFavorites() {
    const favs = getFavorites();
    if (favs.length === 0) {
        favoritesContainer.classList.add('hidden');
        return;
    }
    favoritesContainer.classList.remove('hidden');
    favoritesList.innerHTML = '';
    favs.forEach(f => {
        const chip = document.createElement('div');
        chip.className = 'fav-chip';
        chip.innerHTML = `<span>${f.name}</span><span class="remove-fav" data-name="${f.name}">×</span>`;
        chip.querySelector('span').addEventListener('click', () => {
            selectedCity = { lat: f.lat, lon: f.lon, name: f.name };
            cityInput.value = f.name;
            fetchWeather(f.lat, f.lon, f.name);
        });
        chip.querySelector('.remove-fav').addEventListener('click', (e) => {
            e.stopPropagation();
            const name = e.target.dataset.name;
            const all = getFavorites().filter(x => x.name !== name);
            localStorage.setItem(favoriteKey, JSON.stringify(all));
            renderFavorites();
            updateFavButton();
        });
        favoritesList.appendChild(chip);
    });
}

// ===== Errors =====
function showError(msg, showRetry) {
    errorDisplay.innerHTML = msg;
    if (showRetry && lastFetchLat != null) {
        errorDisplay.innerHTML += `
            <br><button class="retry-btn" onclick="retryLastFetch()">Erneut versuchen</button>
        `;
    }
    errorDisplay.classList.remove('hidden');
}

function hideError() {
    errorDisplay.classList.add('hidden');
    errorDisplay.innerHTML = '';
}

function retryLastFetch() {
    if (lastFetchLat != null) {
        fetchWeather(lastFetchLat, lastFetchLon, lastFetchName, true);
    }
}

// ===== Init =====
initTheme();
renderFavorites();