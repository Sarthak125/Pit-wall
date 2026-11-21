/**
 * Weather for a race weekend from Open-Meteo (free, no key, non-commercial use).
 * Forecasts reach about 16 days ahead; older dates come from its historical archive.
 * Docs: https://open-meteo.com/en/docs
 */
import { fetchJson, RateLimiter } from './http';

const limiter = new RateLimiter(2, 20);

export interface WeatherDays {
  utcOffsetSeconds: number;
  /** Local date (YYYY-MM-DD) to that day's weather. */
  days: Map<string, DayWeather>;
  kind: 'forecast' | 'archive';
}

export interface DayWeather {
  code: number | null;
  tMax: number | null;
  tMin: number | null;
  /** Chance of rain in %, forecasts only. */
  rainChance: number | null;
  /** Rain in mm. */
  rain: number | null;
  windMax: number | null;
}

interface Resp {
  utc_offset_seconds: number;
  daily: Record<string, (number | null)[]> & { time: string[] };
}

/** Daily weather between two dates (YYYY-MM-DD, local to the circuit). */
export async function getWeekendWeather(lat: string, long: string, start: string, end: string): Promise<WeatherDays> {
  // The forecast API also covers the last ~3 months; anything older needs the archive.
  const old = Date.parse(end) < Date.now() - 80 * 86_400_000;
  const base = old ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  const fields = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max', ...(old ? [] : ['precipitation_probability_max'])];
  const url = `${base}?latitude=${lat}&longitude=${long}&daily=${fields.join(',')}&timezone=auto&start_date=${start}&end_date=${end}`;
  const data = await fetchJson<Resp>(url, { limiter, retries: 0, cacheTtlMs: old ? 7 * 86_400_000 : 60 * 60_000 });
  const d = data.daily;
  const days = new Map<string, DayWeather>();
  d.time.forEach((t, i) => {
    days.set(t, {
      code: d.weather_code?.[i] ?? null,
      tMax: d.temperature_2m_max?.[i] ?? null,
      tMin: d.temperature_2m_min?.[i] ?? null,
      rainChance: d.precipitation_probability_max?.[i] ?? null,
      rain: d.precipitation_sum?.[i] ?? null,
      windMax: d.wind_speed_10m_max?.[i] ?? null,
    });
  });
  return { utcOffsetSeconds: data.utc_offset_seconds, days, kind: old ? 'archive' : 'forecast' };
}

/** WMO weather codes, as Open-Meteo reports them. */
export function describeWeather(code: number | null): { text: string; icon: string } {
  if (code == null) return { text: 'Unknown', icon: '·' };
  if (code === 0) return { text: 'Clear', icon: '☀' };
  if (code <= 2) return { text: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { text: 'Overcast', icon: '☁' };
  if (code <= 48) return { text: 'Fog', icon: '🌫' };
  if (code <= 57) return { text: 'Drizzle', icon: '🌦' };
  if (code <= 67) return { text: 'Rain', icon: '🌧' };
  if (code <= 77) return { text: 'Snow', icon: '❄' };
  if (code <= 82) return { text: 'Rain showers', icon: '🌦' };
  if (code <= 86) return { text: 'Snow showers', icon: '🌨' };
  return { text: 'Thunderstorm', icon: '⛈' };
}
