const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

let currentUnit = 'celsius';
let selectedCity = null;
let searchTimeout = null;

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const suggestions = document.getElementById('suggestions');
const weatherDisplay = document.getElementById('weatherDisplay');
const errorDisplay = document.getElementById('errorDisplay');
const mainContent = document.getElementById('mainContent');
const unitC = document.getElementById('unitC');
const unitF = document.getElementById('unitF');

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
});

searchBtn.addEventListener('click', () => {
    const query = cityInput.value.trim();
    if (query) searchCity(query);
});

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

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        suggestions.classList.add('hidden');
    }
});

async function fetchSuggestions(query) {
    try {
        const res = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=5&language=de&format=json`);
        const data = await res.json();
        const results = data.results || [];
        renderSuggestions(results);
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
        const country = r.country || '';
        div.textContent = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${country ? ', ' + country : ''}`;
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

async function fetchWeather(lat, lon, name) {
    hideError();
    const tempUnit = currentUnit === 'celsius' ? 'celsius' : 'fahrenheit';
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=7` +
        `&temperature_unit=${tempUnit}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API-Fehler');
        const data = await res.json();
        renderWeather(data, name);
    } catch {
        showError('Fehler beim Abrufen der Wetterdaten. Bitte versuche es später erneut.');
    }
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 55) return '🌦️';
    if (code >= 56 && code <= 57) return '🌧️';
    if (code >= 61 && code <= 65) return '🌧️';
    if (code >= 66 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 85 && code <= 86) return '❄️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}

function getWeatherDesc(code) {
    if (code === 0) return 'Klarer Himmel';
    if (code === 1) return 'Überwiegend sonnig';
    if (code === 2) return 'Teilweise bewölkt';
    if (code === 3) return 'Bewölkt';
    if (code >= 45 && code <= 48) return 'Nebel';
    if (code >= 51 && code <= 55) return 'Nieselregen';
    if (code >= 56 && code <= 57) return 'Gefrierender Nieselregen';
    if (code >= 61 && code <= 65) return 'Regen';
    if (code >= 66 && code <= 67) return 'Gefrierender Regen';
    if (code >= 71 && code <= 77) return 'Schnee';
    if (code >= 80 && code <= 82) return 'Regenschauer';
    if (code >= 85 && code <= 86) return 'Schneeschauer';
    if (code >= 95) return 'Gewitter';
    return 'Unbekannt';
}

function renderWeather(data, name) {
    const current = data.current;
    const daily = data.daily;
    const unitSymbol = currentUnit === 'celsius' ? '°C' : '°F';
    const windUnit = 'km/h';
    const today = new Date();
    const icon = getWeatherIcon(current.weather_code);
    const desc = getWeatherDesc(current.weather_code);

    mainContent.innerHTML = `
        <div class="weather-display">
            <div class="current-weather">
                <div class="current-header">
                    <div>
                        <h2>${name}</h2>
                        <p id="dateDisplay">${today.toLocaleDateString('de-DE', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}</p>
                        <p style="font-size:1.2rem;margin-top:8px;color:#667eea;font-weight:600">${icon} ${desc}</p>
                    </div>
                    <div class="temp-large">${Math.round(current.temperature_2m)}${unitSymbol}</div>
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
                        <span class="detail-value">${Math.round(current.wind_speed_10m)} ${windUnit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Luftdruck</span>
                        <span class="detail-value">${Math.round(current.pressure_msl)} hPa</span>
                    </div>
                </div>
            </div>
            <div class="forecast">
                <h3>7-Tage Vorhersage</h3>
                <div class="forecast-container" id="forecastContainer">
                    ${renderForecast(daily, unitSymbol)}
                </div>
            </div>
        </div>
    `;
}

function renderForecast(daily, unitSymbol) {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
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

function showError(msg) {
    errorDisplay.textContent = msg;
    errorDisplay.classList.remove('hidden');
}

function hideError() {
    errorDisplay.classList.add('hidden');
}
