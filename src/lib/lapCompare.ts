/** Lap-by-lap times of one driver in a session, with the tyre on each lap and the laps into and out of the pits. */
import type { Lap, Pit, Stint } from '../api/openf1';

export interface LapPoint {
  lap: number;
  time: number | null;
  compound: string | null;
  tyreAge: number | null;
  pitIn: boolean;
  pitOut: boolean;
  /** First lap on a new set of tyres (not the first lap of the session). */
  newTyres: boolean;
}

export function driverLaps(laps: Lap[], stints: Stint[], pits: Pit[], driver: number): LapPoint[] {
  const mine = stints.filter((s) => s.driver_number === driver).sort((a, b) => a.stint_number - b.stint_number);
  const pitLaps = new Set(pits.filter((p) => p.driver_number === driver).map((p) => p.lap_number));
  return laps
    .filter((l) => l.driver_number === driver)
    .sort((a, b) => a.lap_number - b.lap_number)
    .map((l) => {
      const st = mine.find((s) => s.lap_start != null && s.lap_start <= l.lap_number && (s.lap_end == null || l.lap_number <= s.lap_end));
      return {
        lap: l.lap_number,
        time: l.lap_duration ?? null,
        compound: st?.compound ?? null,
        tyreAge: st ? (st.tyre_age_at_start ?? 0) + (l.lap_number - (st.lap_start ?? l.lap_number)) : null,
        pitIn: pitLaps.has(l.lap_number),
        pitOut: !!l.is_pit_out_lap,
        newTyres: !!st && st.stint_number > 1 && st.lap_start === l.lap_number,
      };
    });
}

/** A lap that shows race pace: timed, not into or out of the pits. */
export const representative = (p: LapPoint) => p.time != null && !p.pitIn && !p.pitOut;

/**
 * The lap time range to draw: from the fastest representative lap to a little above typical pace, so a few very slow
 * laps (safety car, cool-down laps in practice) do not squash everything else. Slower laps sit at the top edge.
 */
export function timeRange(series: LapPoint[][], race = true): [number, number] | null {
  const times = series.flat().filter(representative).map((p) => p.time!).sort((a, b) => a - b);
  if (!times.length) return null;
  const fastest = times[0];
  const median = times[Math.floor(times.length / 2)];
  // Practice has many slow laps (cool-down, out of sequence), so its scale stops closer to the fastest lap.
  const top = Math.min(times[times.length - 1], Math.max(fastest * 1.04, median * 1.03), fastest * (race ? 1.1 : 1.07));
  const pad = Math.max(0.2, (top - fastest) * 0.06);
  return [fastest - pad, top + pad];
}

/** Average gap over the laps both drivers did at representative pace (positive: B is slower). */
export function paceGap(a: LapPoint[], b: LapPoint[], limit: number): { laps: number; avgA: number; avgB: number; gap: number } | null {
  const bByLap = new Map(b.map((p) => [p.lap, p]));
  const both = a.filter((p) => representative(p) && p.time! <= limit).map((p) => [p, bByLap.get(p.lap)] as const).filter(([, q]) => q && representative(q) && q.time! <= limit);
  if (both.length < 3) return null;
  const avgA = both.reduce((s, [p]) => s + p.time!, 0) / both.length;
  const avgB = both.reduce((s, [, q]) => s + q!.time!, 0) / both.length;
  return { laps: both.length, avgA, avgB, gap: avgB - avgA };
}
