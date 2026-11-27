/**
 * The weekend forecast request, shared by the app (src/api/weather.ts) and the job that keeps Pit Wall's copy of it
 * (scripts/mirror-weather.mjs), so both ask Open-Meteo for exactly the same thing. Plain TypeScript with no imports,
 * so Node can run it directly.
 */
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The days to ask for: from the day before the first session to the day after the last (UTC dates). */
export function weekendDays(sessionTimes: number[]): { start: string; end: string } {
  return { start: iso(Math.min(...sessionTimes) - DAY), end: iso(Math.max(...sessionTimes) + DAY) };
}

export const FORECAST_FIELDS = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max', 'precipitation_probability_max'];

export function forecastUrl(lat: string, long: string, start: string, end: string): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=${FORECAST_FIELDS.join(',')}&timezone=auto&start_date=${start}&end_date=${end}`;
}

/** File name of a weekend's forecast in the copy: "2026-22.json". */
export const weatherFile = (season: string, round: string) => `${season}-${round}.json`;
