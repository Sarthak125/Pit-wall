/** Helpers for the Calendar page: which weekend is next, the countdown to it, and a weekend's sessions in order. */
import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { toDate, raceStart } from './format';

/** A race weekend counts as "next" until its race has been over for roughly this long. */
export const RACE_WINDOW_MS = 3 * 3_600_000;

/** Index of the weekend that is next or under way (its race started less than 3 hours ago); -1 when the season is over. */
export function nextRaceIndex(races: Race[], now: number): number {
  return races.findIndex((r) => (raceStart(r)?.getTime() ?? 0) + RACE_WINDOW_MS > now);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
}

/** A time left in whole days, hours and minutes (never negative). */
export function countdown(ms: number): Countdown {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return { days: Math.floor(m / 1440), hours: Math.floor((m % 1440) / 60), minutes: m % 60 };
}

export interface WeekendSession {
  label: string;
  at: Date;
}


/** All of a weekend's sessions that have a time, in the order they happen, ending with the race. */
export function weekendSessions(r: Race): WeekendSession[] {
  const list: WeekendSession[] = [];
  for (const s of SESSION_FIELDS) {
    const at = toDate(r[s.key] as Race['FirstPractice']);
    if (at) list.push({ label: s.label, at });
  }
  const race = raceStart(r);
  if (race) list.push({ label: 'Race', at: race });
  return list.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Whether the weekend has a sprint. */
export const hasSprint = (r: Race): boolean => !!(r.Sprint || r.SprintQualifying || r.SprintShootout);

export type SessionKind = 'practice' | 'quali' | 'sprint' | 'race';

/** The kind of a session by its label: Sprint Qualifying and Sprint Shootout count as qualifying. */
export function sessionKind(label: string): SessionKind {
  if (label === 'Race') return 'race';
  if (/Qualifying|Shootout/.test(label)) return 'quali';
  if (label === 'Sprint') return 'sprint';
  return 'practice';
}

/** A calendar day in the device's time zone, as "2026-11-29". */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DaySession extends WeekendSession {
  kind: SessionKind;
  race: Race;
}

/** Every session of the season grouped by the local day it falls on, each day in time order. */
export function sessionsByDay(races: Race[]): Map<string, DaySession[]> {
  const out = new Map<string, DaySession[]>();
  for (const race of races) {
    for (const s of weekendSessions(race)) {
      const k = dayKey(s.at);
      const list = out.get(k) ?? [];
      list.push({ ...s, kind: sessionKind(s.label), race });
      out.set(k, list);
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out;
}

/** The days of a month laid out Monday first: leading nulls, then 1..n as local dates. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
}

/** Whether a session starts between midnight and 6 am in the device's time zone (a late night or early morning to watch live). */
export const isOvernight = (d: Date): boolean => d.getHours() < 6;

/** The Monday that starts the week holding this local day ("2026-11-27" gives "2026-11-23"). */
export function weekStart(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  const at = new Date(y, m - 1, d);
  return new Date(y, m - 1, d - ((at.getDay() + 6) % 7));
}

/** A driver's finish in one race as a short label: "P5", "DNF", "DSQ" or "DNS". */
export function finishLabel(r: { positionText: string; position?: string }): string {
  if (/^\d+$/.test(r.positionText)) return `P${r.positionText}`;
  if (r.positionText === 'D') return 'DSQ';
  if (r.positionText === 'W' || r.positionText === 'F') return 'DNS';
  return 'DNF';
}

export interface SeasonWrap {
  races: number;
  winners: { name: string; code?: string; teamId: string; wins: number }[];
  teams: { id: string; name: string; wins: number }[];
}

/** Who won how many of the season's races, by driver and by team, most wins first (ties by who reached that total first). */
export function seasonWrap(races: Race[], results: Map<string, { Driver: { code?: string; givenName: string; familyName: string; driverId: string }; Constructor: { constructorId: string; name: string } }[]>): SeasonWrap {
  const drivers = new Map<string, SeasonWrap['winners'][number] & { first: number }>();
  const teams = new Map<string, SeasonWrap['teams'][number] & { first: number }>();
  races.forEach((r, i) => {
    const w = results.get(r.round)?.[0];
    if (!w) return;
    const d = drivers.get(w.Driver.driverId) ?? { name: `${w.Driver.givenName} ${w.Driver.familyName}`, code: w.Driver.code, teamId: w.Constructor.constructorId, wins: 0, first: i };
    d.wins++;
    d.teamId = w.Constructor.constructorId;
    drivers.set(w.Driver.driverId, d);
    const t = teams.get(w.Constructor.constructorId) ?? { id: w.Constructor.constructorId, name: w.Constructor.name, wins: 0, first: i };
    t.wins++;
    teams.set(w.Constructor.constructorId, t);
  });
  const order = <T extends { wins: number; first: number }>(a: T, b: T) => b.wins - a.wins || a.first - b.first;
  const strip = <T extends { first: number }>({ first: _f, ...rest }: T) => rest;
  return {
    races: races.filter((r) => results.get(r.round)?.length).length,
    winners: [...drivers.values()].sort(order).map(strip),
    teams: [...teams.values()].sort(order).map(strip),
  };
}
