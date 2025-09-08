import React, { useState } from "react";

/* Simple mapping for weather codes */
const WEATHER_CODE_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: "Clear sky", icon: "☀️" },
  1: { text: "Mainly clear", icon: "🌤️" },
  2: { text: "Partly cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog", icon: "🌫️" },
  48: { text: "Fog (rime)", icon: "🌫️" },
  51: { text: "Light drizzle", icon: "🌦️" },
  61: { text: "Slight rain", icon: "🌧️" },
  63: { text: "Moderate rain", icon: "🌧️" },
  65: { text: "Heavy rain", icon: "⛈️" },
  71: { text: "Light snow", icon: "❄️" },
  80: { text: "Showers", icon: "🌧️" },
  95: { text: "Thunderstorm", icon: "⛈️" },
};

function mapWeather(code?: number) {
  if (code == null) return { text: "Unknown", icon: "❓" };
  return WEATHER_CODE_MAP[code] ?? { text: "Unknown", icon: "❓" };
}

export default function App() {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weather, setWeather] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function searchCity(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setLocations([]);
    setWeather(null);
    setLoadingGeo(true);

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=5&language=en&format=json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Geocoding failed");

      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        setError("No matching locations found.");
      } else {
        setLocations(data.results);
      }
    } catch (err: any) {
      setError(err.message || "Failed to search location.");
    } finally {
      setLoadingGeo(false);
    }
  }

  // ✅ Fixed fetchWeatherByCoords
  async function fetchWeatherByCoords(
    lat: number,
    lon: number,
    placeName?: string
  ) {
    setError(null);
    setLoadingWeather(true);
    setWeather(null);
    setLocations([]);
    setQuery(placeName ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`);

    try {
      const dailyParams = "temperature_2m_max,temperature_2m_min,weathercode";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=${dailyParams}&timezone=auto`;

      console.log("Fetching weather:", url);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Weather request failed with status ${res.status}`);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("Failed to parse weather JSON. Raw response:", text);
        throw new Error("Unexpected response format from API");
      }

      if (!data.current_weather) {
        throw new Error("Weather data not found in API response");
      }

      setWeather({ ...data, placeName: placeName ?? data.timezone });
    } catch (err: any) {
      console.error("Weather fetch error:", err);
      setError(err.message || "Failed to fetch weather.");
    } finally {
      setLoadingWeather(false);
    }
  }

  function onSelectLocation(loc: any) {
    fetchWeatherByCoords(
      loc.latitude,
      loc.longitude,
      `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}`
    );
  }

  function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not available in your browser.");
      return;
    }
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          "Your location"
        );
      },
      (err) => {
        setLoadingWeather(false);
        setError("Could not get location: " + err.message);
      }
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-sky-50 to-indigo-50 flex items-start justify-center">
      <div className="w-full max-w-3xl bg-white/90 rounded-2xl p-6 shadow">
        <header className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🌤️</div>
          <h1 className="text-2xl font-bold text-sky-800">Weather Now</h1>
          <div className="ml-auto text-sm text-sky-500">
            Data: Open-Meteo (no API key)
          </div>
        </header>

        <form onSubmit={searchCity} className="flex gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city (e.g., Warangal, London)"
            className="flex-1 border rounded px-4 py-2 focus:ring-2 focus:ring-sky-200"
          />
          <button className="px-4 py-2 bg-sky-600 text-white rounded">
            Search
          </button>
          <button
            type="button"
            onClick={useMyLocation}
            className="px-3 py-2 border rounded bg-sky-50"
          >
            Use my location
          </button>
        </form>

        {loadingGeo && (
          <div className="text-sm text-sky-500 mb-2">
            Looking up locations...
          </div>
        )}

        {locations.length > 0 && (
          <ul className="mb-4">
            {locations.map((loc) => (
              <li key={`${loc.latitude}-${loc.longitude}`} className="mb-2">
                <button
                  onClick={() => onSelectLocation(loc)}
                  className="w-full text-left px-3 py-2 border rounded hover:bg-sky-50"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">
                        {loc.name}
                        {loc.admin1 ? `, ${loc.admin1}` : ""}
                      </div>
                      <div className="text-xs text-sky-500">
                        {loc.country} — {loc.latitude.toFixed(2)},{" "}
                        {loc.longitude.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-sky-400">
                      Pop: {loc.population ?? "—"}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {loadingWeather && (
          <div className="py-6 text-center text-sky-600">Loading weather…</div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        )}

        {weather && !loadingWeather && (
          <div>
            <div className="flex items-center gap-4 p-4 bg-sky-50 rounded-lg border">
              <div className="text-6xl">
                {mapWeather(weather.current_weather?.weathercode).icon}
              </div>
              <div>
                <div className="font-semibold text-lg">
                  {weather.placeName ?? "Location"}
                </div>
                <div className="text-xs text-sky-500">
                  As of: {weather.current_weather?.time}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-4xl font-bold">
                  {Math.round(weather.current_weather?.temperature ?? 0)}°C
                </div>
                <div className="text-sm text-sky-600">
                  Wind {weather.current_weather?.windspeed} km/h
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 p-4 border rounded bg-white">
                <h3 className="font-medium mb-2">Current Details</h3>
                <div className="text-sm text-sky-600">
                  Temperature:{" "}
                  <strong>{weather.current_weather?.temperature}°C</strong>
                </div>
                <div className="text-sm text-sky-600">
                  Wind Speed:{" "}
                  <strong>{weather.current_weather?.windspeed} km/h</strong>
                </div>
                <div className="text-sm text-sky-600">
                  Wind Direction:{" "}
                  <strong>{weather.current_weather?.winddirection}°</strong>
                </div>
                <div className="text-sm text-sky-600">
                  Condition:{" "}
                  <strong>
                    {mapWeather(weather.current_weather?.weathercode).text}
                  </strong>
                </div>
              </div>

              <div className="p-4 border rounded bg-white">
                <h3 className="font-medium mb-2">3-day Forecast</h3>
                <div className="space-y-3">
                  {weather.daily?.time
                    ?.slice(0, 3) // ✅ show only first 3 days
                    .map((day: string, idx: number) => (
                      <div
                        key={day}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <div className="text-sm font-medium">{day}</div>
                          <div className="text-xs text-sky-500">
                            {mapWeather(weather.daily.weathercode[idx]).text}
                          </div>
                        </div>
                        <div className="text-sm">
                          {Math.round(weather.daily.temperature_2m_max[idx])}° /{" "}
                          {Math.round(weather.daily.temperature_2m_min[idx])}°
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-6 text-xs text-sky-400">
          Open-Meteo — no API key required.
        </footer>
      </div>
    </div>
  );
}
