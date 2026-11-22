/**
 * OpenF1 client: sessions, live timing, race control, weather, car data.
 * Docs: https://openf1.org
 *
 * Note: OpenF1's terms decide what is available without an account.
 * Historical data is free; real-time data during a session may need an
 * OpenF1 account. If a token is set in Settings it is sent as a Bearer header.
 */
import { fetchJson, HttpError, RateLimiter } from './http';
import { getSettings } from '../lib/settings';
import { activeWindow, getBlocked, OpenF1BlockedError, setBlocked } from '../lib/openf1Window';

const BASE = (import.meta.env.VITE_OPENF1_BASE as string | undefined) ?? 'https://api.openf1.org/v1';

/**
 * Requests allowed per second for a per-minute budget. OpenF1 gives 3 a second with 30 a minute (free) and 6 a
 * second with 60 a minute (signed in), so the per-second cap follows the per-minute setting, between 3 and 6.
 */
export function perSecondFor(perMinute: number): number {
  return Math.max(3, Math.min(6, Math.floor(perMinute / 10)));
}

export const openf1Limiter = new RateLimiter(perSecondFor(getSettings().openf1PerMinute), getSettings().openf1PerMinute);

/**
 * Live poll interval for a base value tuned to the default budget of 30 requests a minute. A bigger budget
 * (Settings) polls faster, down to half the interval at 60 or more a minute.
 */
export function liveEvery(baseMs: number): number {
  const perMinute = getSettings().openf1PerMinute || 30;
  return Math.round(baseMs * Math.min(1, Math.max(0.5, 30 / perMinute)));
}

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

/** While OpenF1 is refusing free requests, the next time we try one anyway to see if access is back. */
let nextProbe = 0;
const PROBE_MS = 2 * 60_000;

export async function openf1<T>(endpoint: string, params: Params, signal?: AbortSignal): Promise<T[]> {
  const { openf1Token, openf1PerMinute } = getSettings();
  openf1Limiter.setLimits(perSecondFor(openf1PerMinute), openf1PerMinute);
  const headers: Record<string, string> = {};
  const token = openf1Token.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  // Without a token, OpenF1 refuses everything during a live session's window (see lib/openf1Window). Inside a
  // window, fail fast instead of retrying, and only ask again every couple of minutes until access returns.
  const win = token ? null : activeWindow(Date.now(), 60 * 60_000);
  if (win && getBlocked() && Date.now() < nextProbe) throw new OpenF1BlockedError(win);
  try {
    const data = await fetchJson<T[] | { detail?: string }>(`${BASE}/${endpoint}?${query(params)}`, { limiter: openf1Limiter, headers, signal, retries: win ? 0 : undefined });
    if (getBlocked()) setBlocked(null);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // OpenF1 answers 404 {"detail":"No results found."} when a filter matches nothing,
    // for example when no new messages arrived since the last poll.
    if (err instanceof HttpError && err.status === 404) {
      if (getBlocked()) setBlocked(null);
      return [];
    }
    const refused = err instanceof HttpError ? err.status === 401 || err.status === 403 : !signal?.aborted && !(err instanceof DOMException && err.name === 'AbortError');
    if (win && refused) {
      nextProbe = Date.now() + PROBE_MS;
      setBlocked(win);
      throw new OpenF1BlockedError(win);
    }
    throw err;
  }
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
  circuit_key: number;
  year: number;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name?: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  circuit_key: number;
  /** Permanent, Temporary - Street or Temporary - Road. */
  circuit_type?: string;
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
  /** Mini-sector status codes: 2048 slower, 2049 personal best, 2051 overall best, 2064 pit lane. */
  segments_sector_1?: (number | null)[] | null;
  segments_sector_2?: (number | null)[] | null;
  segments_sector_3?: (number | null)[] | null;
  st_speed?: number | null;
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
  /** DRS status up to 2025 (see overtakeAid); the field keeps this name in 2026, when DRS was replaced by overtake mode. */
  drs?: number | null;
}

/**
 * The overtaking aid shown next to a car's speed, from OpenF1's `drs` car data field (FastF1's mapping: 10, 12 or 14
 * open; 8 eligible in an activation zone). Up to 2025 that is DRS. From 2026 DRS no longer exists and the aid is
 * overtake mode; until it is confirmed that the field reports overtake mode in 2026 data, nothing is shown for 2026
 * onward rather than a label that might be wrong.
 */
export const OVERTAKE_MODE_CONFIRMED = false;

export function overtakeAid(c: Pick<CarData, 'drs'> | null | undefined, year: number): { state: 'open' | 'eligible'; label: string; title: string } | null {
  const v = c?.drs ?? null;
  if (v == null) return null;
  const state = v >= 10 ? 'open' : v === 8 ? 'eligible' : null;
  if (!state) return null;
  if (year >= 2026) {
    if (!OVERTAKE_MODE_CONFIRMED) return null;
    return { state, label: 'OVERTAKE', title: state === 'open' ? 'Overtake mode in use' : 'Overtake mode available' };
  }
  return { state, label: 'DRS', title: state === 'open' ? 'DRS open' : 'DRS available in this zone' };
}

/** A session counts as live from its start until 15 minutes after its scheduled end. */
export function isSessionLive(s: Pick<Session, 'date_start' | 'date_end'>, now = Date.now()): boolean {
  const start = Date.parse(s.date_start);
  const end = Date.parse(s.date_end) + 15 * 60_000;
  return now >= start && now <= end;
}

export interface PitDetail extends Pit {
  lane_duration?: number | null;
  stop_duration?: number | null;
}

export interface TeamRadio {
  date: string;
  driver_number: number;
  recording_url: string;
}

export interface CarLocation {
  date: string;
  driver_number: number;
  x: number;
  y: number;
  z: number;
}

export interface Overtake {
  date: string;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  position: number;
}

export interface GridSlot {
  driver_number: number;
  position: number;
  lap_duration: number | null;
}

export interface SessionResult {
  driver_number: number;
  position: number | null;
  number_of_laps: number | null;
  duration: number | number[] | null;
  gap_to_leader: number | string | (number | string | null)[] | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

const meetingSessionsMemo = new Map<number, { at: number; p: Promise<Session[]> }>();

/** A weekend's sessions, remembered for 10 minutes so switching sessions does not ask OpenF1 again. */
export function meetingSessions(meetingKey: number, _signal?: AbortSignal): Promise<Session[]> {
  const hit = meetingSessionsMemo.get(meetingKey);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.p;
  // Shared between callers, so one caller cancelling must not cancel it for the others.
  const p = openf1<Session>('sessions', { meeting_key: meetingKey });
  meetingSessionsMemo.set(meetingKey, { at: Date.now(), p });
  // A failed or cancelled lookup is forgotten so the next call tries again.
  p.catch(() => meetingSessionsMemo.delete(meetingKey));
  return p;
}

/**
 * Starting grid for a race or sprint. OpenF1 files the grid under the qualifying session it came from
 * (penalties included), so this finds the matching qualifying session of the same meeting. If the grid
 * is not published yet, it falls back to that session's qualifying classification.
 */
export async function getStartingGrid(race: Pick<Session, 'meeting_key' | 'session_name'>, signal?: AbortSignal): Promise<GridSlot[]> {
  const sprint = /sprint/i.test(race.session_name);
  const sessions = await meetingSessions(race.meeting_key, signal);
  const quali = sessions
    .filter((x) => /qualifying|shootout/i.test(x.session_name) && (sprint ? /sprint/i.test(x.session_name) : !/sprint/i.test(x.session_name)))
    .pop();
  if (!quali) return [];
  const grid = await openf1<GridSlot>('starting_grid', { session_key: quali.session_key }, signal);
  if (grid.length) return grid.sort((a, b) => a.position - b.position);
  const res = await openf1<SessionResult>('session_result', { session_key: quali.session_key }, signal);
  return res
    .filter((r) => r.position != null)
    .map((r) => ({ position: r.position!, driver_number: r.driver_number, lap_duration: null }))
    .sort((a, b) => a.position - b.position);
}


/**
 * The OpenF1 meeting for a race weekend, matched by date. OpenF1 starts in 2023, so for older seasons this
 * uses the same circuit's meeting in a later year (found through `laterDate`), which gives the same circuit key.
 */
export async function findMeeting(dates: string[], signal?: AbortSignal): Promise<Meeting | null> {
  // Remembered on the device: a weekend's meeting never changes, and this keeps circuit maps working while OpenF1
  // is paused for free users during a live session.
  const key = 'pitwall:meeting:' + dates.join(',');
  try {
    const hit = localStorage.getItem(key);
    if (hit) return JSON.parse(hit) as Meeting;
  } catch {
    // storage unavailable: look it up
  }
  const found = await lookUpMeeting(dates, signal);
  if (found) {
    try {
      localStorage.setItem(key, JSON.stringify(found));
    } catch {
      // best effort
    }
  }
  return found;
}

async function lookUpMeeting(dates: string[], signal?: AbortSignal): Promise<Meeting | null> {
  for (const date of dates) {
    const year = Number(date.slice(0, 4));
    if (year < 2023) continue;
    const meetings = await openf1<Meeting>('meetings', { year }, signal);
    const t = Date.parse(date);
    const m = meetings.find((x) => !/testing/i.test(x.meeting_name) && Math.abs(Date.parse(x.date_start) - t) < 5 * 86_400_000);
    if (m) return m;
  }
  return null;
}
