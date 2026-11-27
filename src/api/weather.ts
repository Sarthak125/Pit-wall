/**
 * Weather for a race weekend from Open-Meteo (free, no key, non-commercial use).
 * Forecasts reach about 16 days ahead; older dates come from its historical archive.
 * Docs: https://open-meteo.com/en/docs
 */
import { fetchJson, RateLimiter } from './http';
import { FORECAST_FIELDS, forecastUrl, weatherFile } from '../lib/weatherKey';

const limiter = new RateLimiter(2, 20);

export interface WeatherDays {
  utcOffsetSeconds: number;
  /** Local date (YYYY-MM-DD) to that day's weather. */
  days: Map<string, DayWeather>;
  kind: 'forecast' | 'archive';
  /** Set when Open-Meteo did not answer and Pit Wall's saved copy was used: when that copy was made. */
  copiedAt?: string;
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

const COPY = `${import.meta.env.BASE_URL}data/weather`;
const copyLimiter = new RateLimiter(10, 300);

interface Copy {
  url: string;
  fetchedAt: string;
  data: Resp;
}

/**
 * Daily weather between two dates (YYYY-MM-DD, local to the circuit). Forecasts come from Open-Meteo; when it does not
 * answer (it caps requests per network address per day, which a shared mobile or office connection can reach), the
 * forecast Pit Wall saved with the site is used instead (scripts/mirror-weather.mjs), if it has one for this weekend.
 */
export async function getWeekendWeather(lat: string, long: string, start: string, end: string, weekend?: { season: string; round: string }): Promise<WeatherDays> {
  // The forecast API also covers the last ~3 months; anything older needs the archive.
  const old = Date.parse(end) < Date.now() - 80 * 86_400_000;
  const url = old
    ? `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${long}&daily=${FORECAST_FIELDS.filter((f) => f !== 'precipitation_probability_max').join(',')}&timezone=auto&start_date=${start}&end_date=${end}`
    : forecastUrl(lat, long, start, end);
  let data: Resp;
  let copiedAt: string | undefined;
  try {
    data = await fetchJson<Resp>(url, { limiter, retries: 1, cacheTtlMs: old ? 7 * 86_400_000 : 60 * 60_000 });
  } catch (err) {
    if (old || !weekend) throw err;
    const copy = await fetchJson<Copy>(`${COPY}/${weatherFile(weekend.season, weekend.round)}`, { limiter: copyLimiter, retries: 0 }).catch(() => null);
    // Only a copy of this exact request will do (the weekend's dates can move).
    if (!copy || copy.url !== url || !copy.data?.daily) throw err;
    data = copy.data;
    copiedAt = copy.fetchedAt;
  }
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
  return { utcOffsetSeconds: data.utc_offset_seconds, days, kind: old ? 'archive' : 'forecast', copiedAt };
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

export interface RainWatch {
  /** Rain (mm) in each 15 minutes of the next 2 hours, from now. */
  quarters: { t: number; mm: number }[];
  /** Chance of rain (%) and rain (mm) for each of the next 3 hours. */
  hours: { t: number; chance: number | null; mm: number }[];
}

interface RainResp {
  minutely_15?: { time: string[]; precipitation: (number | null)[] };
  hourly?: { time: string[]; precipitation_probability: (number | null)[]; precipitation: (number | null)[] };
}

/** Short-term rain at the circuit: the next 2 hours in 15-minute steps, and the next 3 hours' rain chance (UTC). */
export async function getRainWatch(lat: string, long: string, signal?: AbortSignal): Promise<RainWatch> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&minutely_15=precipitation&forecast_minutely_15=8&hourly=precipitation_probability,precipitation&forecast_hours=3&timezone=UTC`;
  const d = await fetchJson<RainResp>(url, { limiter, retries: 0, signal });
  const ms = (t: string) => Date.parse(`${t}Z`);
  return {
    quarters: (d.minutely_15?.time ?? []).map((t, i) => ({ t: ms(t), mm: d.minutely_15?.precipitation[i] ?? 0 })),
    hours: (d.hourly?.time ?? []).map((t, i) => ({ t: ms(t), chance: d.hourly?.precipitation_probability[i] ?? null, mm: d.hourly?.precipitation[i] ?? 0 })),
  };
}
