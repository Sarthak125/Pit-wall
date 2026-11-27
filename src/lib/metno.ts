/**
 * MET Norway's Locationforecast turned into the same daily shape as Open-Meteo's forecast, for Pit Wall's saved copy
 * of the weekend forecast (scripts/mirror-weather.mjs). Used only when Open-Meteo refuses. MET Norway asks that
 * browsers do not call it directly, so only the scheduled job does, identifying itself. Data under CC BY 4.0.
 * Plain TypeScript with no imports, so Node can run it directly.
 */

/** Circuit time zones (Jolpica circuit ids), to group MET Norway's UTC times into the circuit's local days. */
export const CIRCUIT_TZ: Record<string, string> = {
  albert_park: 'Australia/Melbourne', shanghai: 'Asia/Shanghai', suzuka: 'Asia/Tokyo', bahrain: 'Asia/Bahrain',
  jeddah: 'Asia/Riyadh', miami: 'America/New_York', imola: 'Europe/Rome', villeneuve: 'America/Toronto',
  monaco: 'Europe/Monaco', catalunya: 'Europe/Madrid', madring: 'Europe/Madrid', red_bull_ring: 'Europe/Vienna',
  silverstone: 'Europe/London', spa: 'Europe/Brussels', hungaroring: 'Europe/Budapest', zandvoort: 'Europe/Amsterdam',
  monza: 'Europe/Rome', baku: 'Asia/Baku', sepang: 'Asia/Kuala_Lumpur', marina_bay: 'Asia/Singapore',
  americas: 'America/Chicago', rodriguez: 'America/Mexico_City', interlagos: 'America/Sao_Paulo',
  vegas: 'America/Los_Angeles', losail: 'Asia/Qatar', yas_marina: 'Asia/Dubai',
};

/** Offset from UTC in seconds of an IANA time zone at a moment. */
export function tzOffsetSeconds(tz: string, at: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(at)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - Math.floor(at / 1000) * 1000) / 1000);
}

/** MET Norway weather symbols to the WMO codes Open-Meteo uses (the app describes those). */
export function symbolToWmo(symbol: string | undefined): number | null {
  if (!symbol) return null;
  const s = symbol.replace(/_(day|night|polartwilight)$/, '');
  if (/thunder/.test(s)) return 95;
  const table: Record<string, number> = {
    clearsky: 0, fair: 1, partlycloudy: 2, cloudy: 3, fog: 45,
    lightrain: 61, rain: 63, heavyrain: 65, lightrainshowers: 80, rainshowers: 81, heavyrainshowers: 82,
    lightsleet: 66, sleet: 67, heavysleet: 67, lightsleetshowers: 80, sleetshowers: 81, heavysleetshowers: 82,
    lightsnow: 71, snow: 73, heavysnow: 75, lightsnowshowers: 85, snowshowers: 85, heavysnowshowers: 86,
  };
  return table[s] ?? null;
}

interface Step {
  time: string;
  data: {
    instant?: { details?: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number; air_temperature_max?: number; air_temperature_min?: number } };
  };
}

export interface DailyShape {
  utc_offset_seconds: number;
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    precipitation_probability_max: (number | null)[];
  };
}

/**
 * Daily values for the local dates start..end (YYYY-MM-DD): highest and lowest temperature, rain summed over the day,
 * strongest wind (km/h), and the weather around midday. MET Norway has no chance of rain outside the Nordic area, so
 * that stays empty. Days the forecast does not reach, or has fewer than 3 forecast points for, are left out.
 */
export function metnoToDaily(timeseries: Step[], tz: string, start: string, end: string): DailyShape {
  const steps = timeseries.map((s) => ({ ...s, t: Date.parse(s.time) })).sort((a, b) => a.t - b.t);
  const offset = tzOffsetSeconds(tz, steps[Math.floor(steps.length / 2)]?.t ?? Date.now());
  const local = (t: number) => new Date(t + tzOffsetSeconds(tz, t) * 1000).toISOString().slice(0, 10);
  type Day = { max: number | null; min: number | null; rain: number; wind: number | null; symbol?: string; noonGap: number; steps: number };
  const days = new Map<string, Day>();
  const day = (d: string) => days.get(d) ?? days.set(d, { max: null, min: null, rain: 0, wind: null, noonGap: Infinity, steps: 0 }).get(d)!;
  steps.forEach((s, i) => {
    const d = local(s.t);
    if (d < start || d > end) return;
    const x = day(d);
    const temp = s.data.instant?.details?.air_temperature;
    const hi = s.data.next_6_hours?.details?.air_temperature_max ?? temp;
    const lo = s.data.next_6_hours?.details?.air_temperature_min ?? temp;
    if (hi != null) x.max = x.max == null ? hi : Math.max(x.max, hi);
    if (lo != null) x.min = x.min == null ? lo : Math.min(x.min, lo);
    const wind = s.data.instant?.details?.wind_speed;
    if (wind != null) x.wind = Math.max(x.wind ?? 0, wind * 3.6);
    // Rain: the hourly amount while the forecast is hourly, then the 6-hour amount at each 6-hour step.
    const gapH = i + 1 < steps.length ? (steps[i + 1].t - s.t) / 3_600_000 : 6;
    const rain = gapH <= 1 ? s.data.next_1_hours?.details?.precipitation_amount : s.data.next_6_hours?.details?.precipitation_amount;
    if (rain != null) x.rain += rain;
    x.steps++;
    // The weather nearest local midday stands for the day.
    const hour = new Date(s.t + tzOffsetSeconds(tz, s.t) * 1000).getUTCHours();
    const symbol = s.data.next_6_hours?.summary?.symbol_code ?? s.data.next_1_hours?.summary?.symbol_code;
    const gap = Math.abs(hour + 3 - 12);
    if (symbol && gap < x.noonGap) { x.noonGap = gap; x.symbol = symbol; }
  });
  // A day the forecast only touches (its last 6-hour step, say) would give a misleading high and low: keep days with
  // at least 3 forecast points (today's remaining hours, or a whole day at 6-hour steps, qualify).
  const dates = [...days.keys()].filter((d) => days.get(d)!.steps >= 3).sort();
  const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
  return {
    utc_offset_seconds: offset,
    daily: {
      time: dates,
      weather_code: dates.map((d) => symbolToWmo(days.get(d)!.symbol)),
      temperature_2m_max: dates.map((d) => r1(days.get(d)!.max)),
      temperature_2m_min: dates.map((d) => r1(days.get(d)!.min)),
      precipitation_sum: dates.map((d) => r1(days.get(d)!.rain)),
      wind_speed_10m_max: dates.map((d) => r1(days.get(d)!.wind)),
      precipitation_probability_max: dates.map(() => null),
    },
  };
}

export const metnoUrl = (lat: string, long: string) =>
  `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${Number(lat).toFixed(4)}&lon=${Number(long).toFixed(4)}`;
