/**
 * OpenF1 client: sessions, live timing, race control, weather, car data.
 * Docs: https://openf1.org
 *
 * Note: OpenF1's terms decide what is available without an account.
 * Historical data is free; real-time data during a session may need an
 * OpenF1 account. If a token is set in Settings it is sent as a Bearer header.
 */
import { fetchJson, RateLimiter } from './http';
import { getSettings } from '../lib/settings';

const BASE = (import.meta.env.VITE_OPENF1_BASE as string | undefined) ?? 'https://api.openf1.org/v1';

export const openf1Limiter = new RateLimiter(3, getSettings().openf1PerMinute);

export type Params = Record<string, string | number | undefined>;

/** Builds a query string. Keys may carry comparison operators, e.g. "date>". */
function query(params: Params): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => {
      const m = /^(.*?)(>=|<=|>|<)$/.exec(k);
      const name = m ? m[1] : k;
      const op = m ? m[2] : '=';
      return `${encodeURIComponent(name)}${op}${encodeURIComponent(String(v))}`;
    })
    .join('&');
}

export async function openf1<T>(endpoint: string, params: Params, signal?: AbortSignal): Promise<T[]> {
  const { openf1Token, openf1PerMinute } = getSettings();
  openf1Limiter.setLimits(3, openf1PerMinute);
  const headers: Record<string, string> = {};
  if (openf1Token.trim()) headers.Authorization = `Bearer ${openf1Token.trim()}`;
  return fetchJson<T[]>(`${BASE}/${endpoint}?${query(params)}`, { limiter: openf1Limiter, headers, signal });
}

export interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  location: string;
  country_name: string;
  circuit_short_name: string;
  year: number;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name?: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

export interface OF1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string | null;
  team_colour: string | null;
  first_name: string | null;
  last_name: string | null;
  headshot_url: string | null;
  country_code: string | null;
}

export interface Position {
  date: string;
  driver_number: number;
  position: number;
}

export interface Interval {
  date: string;
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
}

export interface Lap {
  date_start: string | null;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean | null;
}

export interface Stint {
  driver_number: number;
  stint_number: number;
  compound: string | null;
  lap_start: number | null;
  lap_end: number | null;
  tyre_age_at_start: number | null;
}

export interface Pit {
  date: string;
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
}

export interface RaceControlMsg {
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  lap_number: number | null;
  message: string;
}

export interface Weather {
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_direction: number;
  wind_speed: number;
}

export interface CarData {
  date: string;
  driver_number: number;
  speed: number;
  n_gear: number;
  rpm: number;
  throttle: number;
  brake: number;
}

/** A session counts as live from its start until 15 minutes after its scheduled end. */
export function isSessionLive(s: Pick<Session, 'date_start' | 'date_end'>, now = Date.now()): boolean {
  const start = Date.parse(s.date_start);
  const end = Date.parse(s.date_end) + 15 * 60_000;
  return now >= start && now <= end;
}
