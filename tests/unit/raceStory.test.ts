import { describe, expect, it } from 'vitest';
import type { Result } from '../../src/api/jolpica';
import type { Lap, PitDetail, RaceControlMsg, Stint } from '../../src/api/openf1';
import { raceStory } from '../../src/lib/raceStory';

const driver = (n: number, code: string, grid: number, pos: string, status = 'Finished', laps = 10): Result => ({
  number: String(n), position: pos, positionText: pos, points: '0', grid: String(grid), laps: String(laps), status,
  Driver: { driverId: code.toLowerCase(), code, givenName: code, familyName: code } as Result['Driver'],
  Constructor: { constructorId: 't' + n, name: 'T' + n } as Result['Constructor'],
});

/** Laps where `order(lap)` lists the cars in the order they cross the line, 90 s per lap. */
function laps(cars: number[], total: number, order: (lap: number) => number[]): Lap[] {
  const out: Lap[] = [];
  const t0 = Date.parse('2026-01-01T12:00:00Z');
  for (let lap = 1; lap <= total + 1; lap++) {
    const o = order(Math.min(lap - 1, total) || 1);
    for (const c of cars) out.push({ driver_number: c, lap_number: lap, date_start: new Date(t0 + (lap - 1) * 90_000 + o.indexOf(c) * 1000).toISOString(), lap_duration: 90 - (c === 3 && lap === 7 ? 1 : 0), is_pit_out_lap: false } as Lap);
  }
  return out;
}

const rc = (lap: number, category: string, message: string, flag: string | null = null): RaceControlMsg =>
  ({ date: `2026-01-01T12:${String(10 + lap).padStart(2, '0')}:00Z`, category, flag, scope: flag ? 'Track' : null, sector: null, driver_number: null, lap_number: lap, message });

describe('raceStory', () => {
  const results = [driver(1, 'AAA', 2, '1'), driver(2, 'BBB', 1, '2'), driver(3, 'CCC', 3, '3'), driver(4, 'DDD', 4, 'R', 'Engine', 5)];

  it('tells the start, lead changes, safety car, stops, penalties, retirements, fastest lap and finish in lap order', () => {
    // BBB leads from pole; AAA takes the lead on lap 4 when BBB pits.
    const lapRows = laps([1, 2, 3], 10, (lap) => (lap < 4 ? [2, 1, 3] : [1, 2, 3]));
    const pits: PitDetail[] = [{ date: '2026-01-01T12:05:00Z', driver_number: 2, lap_number: 4, pit_duration: 22, stop_duration: 2.4 }];
    const stints: Stint[] = [
      { driver_number: 2, stint_number: 1, compound: 'SOFT', lap_start: 1, lap_end: 4, tyre_age_at_start: 0 },
      { driver_number: 2, stint_number: 2, compound: 'HARD', lap_start: 5, lap_end: 10, tyre_age_at_start: 0 },
    ];
    const raceControl = [
      rc(6, 'SafetyCar', 'SAFETY CAR DEPLOYED'),
      rc(8, 'SafetyCar', 'SAFETY CAR IN THIS LAP'),
      rc(9, 'Other', 'FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 3 (CCC) - CAUSING A COLLISION (12:19:00)'),
    ];
    const story = raceStory({ results, traces: [], lapRows, raceControl, pits, stints });
    expect(story.map((e) => [e.lap, e.kind, e.title])).toEqual([
      [1, 'start', 'BBB BBB leads away from pole'],
      [4, 'lead', 'AAA AAA takes the lead'],
      [4, 'pit', 'BBB BBB pits'],
      [6, 'sc', 'Safety car'],
      [6, 'retire', 'DDD DDD retires'],
      [7, 'fastest', 'Fastest lap: CCC CCC'],
      [9, 'penalty', '+5s for CCC CCC'],
      [10, 'finish', 'AAA AAA wins'],
    ]);
    expect(story.find((e) => e.kind === 'lead')!.detail).toBe('From BBB BBB, who made a pit stop');
    expect(story.find((e) => e.kind === 'pit')!.detail).toBe('Soft to Hard · 2.4 s stop');
    expect(story.find((e) => e.kind === 'sc')!.detail).toBe('Laps 6 to 8');
    expect(story.find((e) => e.kind === 'penalty')!.detail).toBe('Causing a collision');
    expect(story.find((e) => e.kind === 'retire')!.detail).toBe('Engine');
  });

  it('groups back-and-forth lead swaps between two drivers into one battle', () => {
    const lapRows = laps([1, 2, 3], 10, (lap) => (lap >= 3 && lap <= 7 && lap % 2 === 1 ? [2, 1, 3] : [1, 2, 3]));
    const story = raceStory({ results, traces: [], lapRows, raceControl: [], pits: [], stints: [] });
    const lead = story.filter((e) => e.kind === 'lead');
    expect(lead).toHaveLength(1);
    expect(lead[0].title).toBe('Battle for the lead: BBB BBB and AAA AAA');
    expect(lead[0].detail).toBe('The lead changed hands 6 times from lap 3 to lap 8; AAA AAA came out ahead');
  });
});
