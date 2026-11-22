/**
 * Long-run pace in practice: each driver's longest stint of representative laps, the usual guide to race pace on
 * Fridays (the fastest single lap is usually set on low fuel and fresh soft tyres).
 */
import type { Lap, Stint } from '../api/openf1';

export interface LongRun {
  driver: number;
  compound: string | null;
  stint: number;
  /** Laps used for the average. */
  laps: number;
  avg: number;
  best: number;
  /** Seconds lost (or gained, if negative) per lap over the run, from a straight-line fit. */
  deg: number;
  firstLap: number;
  lastLap: number;
  tyreAgeAtStart: number;
}

/** Laps that count: not the out-lap or in-lap, timed, and within 107% of the stint's best (traffic and cool-down laps out). */
function representative(laps: Lap[], stint: Stint): Lap[] {
  const start = stint.lap_start ?? 1;
  const end = stint.lap_end ?? Math.max(start, ...laps.map((l) => l.lap_number));
  const inStint = laps
    .filter((l) => l.lap_number >= start && l.lap_number <= end && l.lap_duration != null && l.lap_duration > 0 && !l.is_pit_out_lap)
    // The first lap of a stint is the out-lap and, if the stint has ended, the last one is the in-lap.
    .filter((l) => l.lap_number !== start && !(stint.lap_end != null && l.lap_number === end));
  if (!inStint.length) return [];
  const best = Math.min(...inStint.map((l) => l.lap_duration!));
  return inStint.filter((l) => l.lap_duration! <= best * 1.07).sort((a, b) => a.lap_number - b.lap_number);
}

export function longRuns(laps: Lap[], stints: Stint[], minLaps = 5): LongRun[] {
  const out: LongRun[] = [];
  const byDriver = new Map<number, Stint[]>();
  for (const s of stints) byDriver.set(s.driver_number, [...(byDriver.get(s.driver_number) ?? []), s]);
  for (const [driver, list] of byDriver) {
    const mine = laps.filter((l) => l.driver_number === driver);
    let pick: { s: Stint; laps: Lap[] } | null = null;
    for (const s of list) {
      const rep = representative(mine, s);
      if (rep.length >= minLaps && (!pick || rep.length > pick.laps.length)) pick = { s, laps: rep };
    }
    if (!pick) continue;
    const times = pick.laps.map((l) => l.lap_duration!);
    const n = times.length;
    const avg = times.reduce((a, b) => a + b, 0) / n;
    // Least-squares slope of lap time against lap number: tyre wear (offset by fuel burning off).
    const xs = pick.laps.map((l) => l.lap_number);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((a, x, i) => a + (x - mx) * (times[i] - avg), 0);
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1;
    out.push({
      driver,
      compound: pick.s.compound,
      stint: pick.s.stint_number,
      laps: n,
      avg,
      best: Math.min(...times),
      deg: num / den,
      firstLap: xs[0],
      lastLap: xs[n - 1],
      tyreAgeAtStart: pick.s.tyre_age_at_start ?? 0,
    });
  }
  return out.sort((a, b) => a.avg - b.avg);
}
