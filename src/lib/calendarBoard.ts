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
