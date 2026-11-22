import { describe, expect, it } from 'vitest';
import type { Lap, Pit, Stint } from '../../src/api/openf1';
import { driverLaps, paceGap, timeRange } from '../../src/lib/lapCompare';

const lap = (driver: number, n: number, t: number | null, out = false) => ({ driver_number: driver, lap_number: n, lap_duration: t, is_pit_out_lap: out, date_start: null }) as unknown as Lap;
const stint = (driver: number, k: number, compound: string, from: number, to: number, age = 0): Stint => ({ driver_number: driver, stint_number: k, compound, lap_start: from, lap_end: to, tyre_age_at_start: age });

describe('lap comparison', () => {
  const laps = [lap(1, 1, 95), lap(1, 2, 94), lap(1, 3, 115), lap(1, 4, 120, true), lap(1, 5, 93), lap(1, 6, 140)];
  const stints = [stint(1, 1, 'MEDIUM', 1, 3, 2), stint(1, 2, 'HARD', 4, 6)];
  const pits: Pit[] = [{ date: '', driver_number: 1, lap_number: 3, pit_duration: 22 }];

  it('marks each lap with its tyre, tyre age, pit in and out laps, and the first lap on new tyres', () => {
    const s = driverLaps(laps, stints, pits, 1);
    expect(s.map((p) => [p.lap, p.compound, p.tyreAge, p.pitIn, p.pitOut, p.newTyres])).toEqual([
      [1, 'MEDIUM', 2, false, false, false],
      [2, 'MEDIUM', 3, false, false, false],
      [3, 'MEDIUM', 4, true, false, false],
      [4, 'HARD', 0, false, true, true],
      [5, 'HARD', 1, false, false, false],
      [6, 'HARD', 2, false, false, false],
    ]);
  });

  it('keeps very slow laps off the scale and compares only laps both drivers did at pace', () => {
    const a = driverLaps(laps, stints, pits, 1);
    const [lo, hi] = timeRange([a])!;
    expect(lo).toBeLessThan(93);
    expect(hi).toBeLessThan(115);
    const b = driverLaps([lap(2, 1, 95.5), lap(2, 2, 94.5), lap(2, 5, 93.5), lap(2, 6, 94)], [], [], 2);
    const gap = paceGap(a, b, hi)!;
    expect(gap.laps).toBe(3);
    expect(gap.gap).toBeCloseTo(0.5);
  });
});
