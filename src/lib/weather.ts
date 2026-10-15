import type { Lang } from "@/features/i18n/config";

/**
 * Weather via Open-Meteo - FREE, no API key, CORS-enabled so the browser can
 * call it directly. Current conditions + a short daily forecast. Callers cache
 * the result (localStorage) so the widget still shows the last reading offline.
 */

export interface WeatherNow {
  tempC: number;
  humidity: number;
  precipMm: number;
  windKph: number;
  code: number;
  isDay: boolean;
}

export interface WeatherDay {
  date: string;
  code: number;
  maxC: number;
  minC: number;
  rainProb: number;
}

export interface WeatherResult {
  latitude: number;
  longitude: number;
  now: WeatherNow;
  daily: WeatherDay[];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherResult> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  const j = await res.json();
  const c = j.current ?? {};
  return {
    latitude: j.latitude,
    longitude: j.longitude,
    now: {
      tempC: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      precipMm: c.precipitation,
      windKph: c.wind_speed_10m,
      code: c.weather_code,
      isDay: c.is_day === 1,
    },
    daily: (j.daily?.time ?? []).map((d: string, i: number) => ({
      date: d,
      code: j.daily.weather_code[i],
      maxC: j.daily.temperature_2m_max[i],
      minC: j.daily.temperature_2m_min[i],
      rainProb: j.daily.precipitation_probability_max?.[i] ?? 0,
    })),
  };
}

/** Resolve a place name (shop city / district) to coordinates. Free, keyless. */
export async function geocodePlace(
  name: string,
): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name,
  )}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const r = j.results?.[0];
  if (!r) return null;
  return { lat: r.latitude, lon: r.longitude, label: [r.name, r.admin1].filter(Boolean).join(", ") };
}

/** Browser geolocation, resolving to null on denial / timeout rather than throwing. */
export function getPositionOrNull(timeoutMs = 6000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 10 * 60_000, enableHighAccuracy: false },
    );
  });
}

/** WMO weather code → an emoji + a short localized label. */
export function weatherLabel(code: number, lang: Lang): { emoji: string; text: string } {
  const pick = (en: string, hi: string, hg: string) =>
    lang === "hi" ? hi : lang === "hg" ? hg : en;

  if (code === 0) return { emoji: "☀️", text: pick("Clear", "साफ़", "Saaf") };
  if (code === 1 || code === 2) return { emoji: "⛅", text: pick("Partly cloudy", "आंशिक बादल", "Halke baadal") };
  if (code === 3) return { emoji: "☁️", text: pick("Cloudy", "बादल", "Baadal") };
  if (code === 45 || code === 48) return { emoji: "🌫️", text: pick("Fog", "कोहरा", "Kohra") };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", text: pick("Drizzle", "बूंदाबांदी", "Boondabaandi") };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { emoji: "🌧️", text: pick("Rain", "बारिश", "Baarish") };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { emoji: "🌨️", text: pick("Snow", "बर्फ़", "Barf") };
  if (code >= 95) return { emoji: "⛈️", text: pick("Thunderstorm", "आंधी-तूफ़ान", "Aandhi-toofan") };
  return { emoji: "🌡️", text: pick("—", "—", "—") };
}
