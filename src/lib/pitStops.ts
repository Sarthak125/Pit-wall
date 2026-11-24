/**
 * Pit stop analysis from OpenF1 pit data: a race's stops ranked, and a season's stops summed up per team.
 *
 * OpenF1 gives two times for a stop: how long the car stood still (stop_duration) and how long it took from pit lane
 * entry to exit (lane_duration, called pit_duration in older data). Stationary time is the one that compares crews and
 * races. Pit lane time depends on the circuit's pit lane, so it is only used to rank stops within one race, and only
 * when the stationary time is missing.
 */
import type { PitDetail, Stint } from '../api/openf1';

export interface Stop {
  driver: number;
  lap: number;
  /** Seconds standing still, if recorded. */
  stop: number | null;
  /** Seconds in the pit lane, if recorded. */
  lane: number | null;
  from: string | null;
  to: string | null;
}

/** A stop slower than this (a repair, a penalty served, a problem) is shown but kept out of crew comparisons. */
export const SLOW_STOP = 6;

/** A race's stops with the tyres taken off and fitted, in the order they happened. */
export function raceStops(pits: PitDetail[], stints: Stint[]): Stop[] {
  const stintsOf = (n: number) => stints.filter((s) => s.driver_number === n).sort((a, b) => a.stint_number - b.stint_number);
  return [...pits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => {
      const mine = stintsOf(p.driver_number);
      const next = mine.find((s) => s.lap_start != null && s.lap_start > p.lap_number && s.lap_start <= p.lap_number + 2);
      const prev = next ? mine.filter((s) => s.stint_number < next.stint_number).pop() : undefined;
      return {
        driver: p.driver_number,
        lap: p.lap_number,
        stop: p.stop_duration ?? null,
        lane: p.lane_duration ?? p.pit_duration ?? null,
        from: prev?.compound ?? null,
        to: next?.compound ?? null,
      };
    });
}

/** Whether most of the stops have a stationary time (older or partial data may only have the pit lane time). */
export function hasStopTimes(stops: Stop[]): boolean {
  const timed = stops.filter((s) => s.stop != null).length;
  return timed > 0 && timed >= stops.length / 2;
}

/** Stops with a time, fastest first, by stationary time (or pit lane time when the stationary time is not recorded). */
export function rankStops(stops: Stop[]): { stop: Stop; time: number; kind: 'stop' | 'lane' }[] {
  const kind = hasStopTimes(stops) ? 'stop' : 'lane';
  return stops
    .map((s) => ({ stop: s, time: kind === 'stop' ? s.stop : s.lane, kind }) as { stop: Stop; time: number | null; kind: 'stop' | 'lane' })
    .filter((x): x is { stop: Stop; time: number; kind: 'stop' | 'lane' } => x.time != null && x.time > 0)
    .sort((a, b) => a.time - b.time);
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export interface TeamPits {
  team: string;
  /** Stops with a stationary time, including slow ones. */
  stops: number;
  fastest: number;
  /** Middle time of the stops under SLOW_STOP seconds. */
  typical: number | null;
  /** Stops of SLOW_STOP seconds or more. */
  slow: number;
}

/** A season's stops per team, from stops tagged with their team. Fastest typical stop first. */
export function teamPitSummary(stops: { team: string; stop: number | null }[]): TeamPits[] {
  const byTeam = new Map<string, number[]>();
  for (const s of stops) {
    if (s.stop == null || s.stop <= 0) continue;
    byTeam.set(s.team, [...(byTeam.get(s.team) ?? []), s.stop]);
  }
  return [...byTeam.entries()]
    .map(([team, times]) => {
      const ok = times.filter((t) => t < SLOW_STOP);
      return { team, stops: times.length, fastest: Math.min(...times), typical: median(ok), slow: times.length - ok.length };
    })
    .sort((a, b) => (a.typical ?? 99) - (b.typical ?? 99));
}
