/**
 * Race pace from OpenF1 laps and tyre stints: each driver's typical lap at race pace and, for every stint, the tyre,
 * the laps that count and how much time they lost per lap.
 *
 * Laps that count are the ones longRuns uses: timed, not the first lap of a stint (the out-lap, or the standing
 * start) or its in-lap, and within 107% of the stint's best, which leaves out safety car, virtual safety car and red
 * flag laps as well as laps in heavy traffic.
 */
import type { Lap, Stint } from '../api/openf1';
import { representative, slope } from './longRuns';

export interface StintPace {
  stint: number;
  compound: string | null;
  firstLap: number;
  lastLap: number;
  /** Laps used. */
  laps: number;
  avg: number | null;
  /** Seconds per lap, only for stints with 5 or more laps that count. */
  deg: number | null;
}

export interface DriverPace {
  driver: number;
  /** Median lap of all the laps that count: the typical race-pace lap. */
  typical: number | null;
  laps: number;
  stints: StintPace[];
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function racePace(laps: Lap[], stints: Stint[]): DriverPace[] {
  const drivers = [...new Set(stints.map((s) => s.driver_number))];
  return drivers.map((driver) => {
    const mine = laps.filter((l) => l.driver_number === driver);
    const all: number[] = [];
    const list = stints
      .filter((s) => s.driver_number === driver)
      .sort((a, b) => a.stint_number - b.stint_number)
      .map((s) => {
        const rep = representative(mine, s);
        all.push(...rep.map((l) => l.lap_duration!));
        return {
          stint: s.stint_number,
          compound: s.compound,
          firstLap: s.lap_start ?? 1,
          lastLap: s.lap_end ?? s.lap_start ?? 1,
          laps: rep.length,
          avg: rep.length ? rep.reduce((a, l) => a + l.lap_duration!, 0) / rep.length : null,
          deg: rep.length >= 5 ? slope(rep) : null,
        };
      });
    return { driver, typical: median(all), laps: all.length, stints: list };
  });
}
