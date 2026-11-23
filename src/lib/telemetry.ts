/**
 * Comparing two laps from OpenF1 car data (about 3.7 readings a second): speed, throttle, brake and gear along the
 * lap, the time gap between the two cars at each point, and who was quicker in each part of the lap.
 *
 * OpenF1 gives no distance, so distance comes from integrating speed over time. Each lap is then scaled to the
 * same length, so the same point on track lines up for both cars (the integration is within about 1% of a lap).
 */
import type { CarData } from '../api/openf1';

export interface TracePoint {
  /** Metres from the start of the lap (after scaling to the common lap length). */
  d: number;
  /** Seconds from the start of the lap. */
  t: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
}

/**
 * A lap's readings with distance and time from the start of the lap. Readings start and stop a fraction of a second
 * away from the line, so the first and last are carried to the line (time 0 and the official lap time): the gap
 * between two laps then starts at zero and ends at the real difference in lap time.
 */
export function lapTrace(rows: CarData[], lapStart: number, lapSeconds: number): { points: TracePoint[]; length: number } {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date)).filter((r) => {
    const t = (Date.parse(r.date) - lapStart) / 1000;
    return t > 0 && t < lapSeconds;
  });
  if (!sorted.length) return { points: [], length: 0 };
  const reading = (r: CarData, t: number) => ({ t, speed: r.speed, throttle: r.throttle, brake: r.brake > 0 ? 100 : 0, gear: r.n_gear });
  const timed = [
    reading(sorted[0], 0),
    ...sorted.map((r) => reading(r, (Date.parse(r.date) - lapStart) / 1000)),
    reading(sorted[sorted.length - 1], lapSeconds),
  ];
  const points: TracePoint[] = [];
  let d = 0;
  timed.forEach((p, i) => {
    if (i) d += (((timed[i - 1].speed + p.speed) / 2) / 3.6) * (p.t - timed[i - 1].t);
    points.push({ d, ...p });
  });
  return { points, length: d };
}

/** Scales a trace so its lap is `length` metres long. */
export function scaleTo(points: TracePoint[], from: number, length: number): TracePoint[] {
  const k = from > 0 ? length / from : 1;
  return points.map((p) => ({ ...p, d: p.d * k }));
}

/** Linear interpolation of a trace field at distance d. */
export function at(points: TracePoint[], d: number, key: keyof TracePoint): number {
  if (!points.length) return NaN;
  if (d <= points[0].d) return points[0][key];
  for (let i = 1; i < points.length; i++) {
    if (points[i].d >= d) {
      const a = points[i - 1], b = points[i];
      const f = b.d === a.d ? 0 : (d - a.d) / (b.d - a.d);
      return a[key] + (b[key] - a[key]) * f;
    }
  }
  return points[points.length - 1][key];
}

/** Gap at `n` points along the lap: positive means car B is behind (took longer to get there). */
export function gapAlong(a: TracePoint[], b: TracePoint[], length: number, n = 200): { d: number; gap: number }[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const d = (length * i) / n;
    return { d, gap: at(b, d, 't') - at(a, d, 't') };
  });
}

/** The lap cut into `n` equal parts, each with which car was quicker through it and by how much. */
export function segmentWinners(a: TracePoint[], b: TracePoint[], length: number, n = 25): { from: number; to: number; faster: 'a' | 'b'; by: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const from = (length * i) / n, to = (length * (i + 1)) / n;
    const ta = at(a, to, 't') - at(a, from, 't');
    const tb = at(b, to, 't') - at(b, from, 't');
    return { from, to, faster: ta <= tb ? 'a' : 'b', by: Math.abs(ta - tb) };
  });
}
