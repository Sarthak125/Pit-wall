import { describe, expect, it } from 'vitest';
import type { PitDetail, Stint } from '../../src/api/openf1';
import { hasStopTimes, median, rankStops, raceStops, teamPitSummary } from '../../src/lib/pitStops';

const pit = (driver_number: number, lap_number: number, stop_duration: number | null, lane_duration: number | null = 22, date = `2026-11-22T04:${String(lap_number).padStart(2, '0')}:00Z`): PitDetail =>
  ({ date, driver_number, lap_number, stop_duration, lane_duration, pit_duration: lane_duration });
const stint = (driver_number: number, stint_number: number, compound: string, lap_start: number, lap_end: number): Stint =>
  ({ driver_number, stint_number, compound, lap_start, lap_end, tyre_age_at_start: 0 });

describe('race pit stops', () => {
  const stints = [stint(1, 1, 'SOFT', 1, 18), stint(1, 2, 'MEDIUM', 19, 40), stint(4, 1, 'MEDIUM', 1, 20), stint(4, 2, 'HARD', 21, 50)];
  it('names the tyres taken off and fitted', () => {
    const [a, b] = raceStops([pit(1, 18, 2.4), pit(4, 20, 3.1)], stints);
    expect([a.driver, a.lap, a.from, a.to]).toEqual([1, 18, 'SOFT', 'MEDIUM']);
    expect([b.from, b.to]).toEqual(['MEDIUM', 'HARD']);
  });
  it('ranks by stationary time, fastest first, and leaves out stops with no time', () => {
    const stops = raceStops([pit(1, 18, 2.4), pit(4, 20, 2.2), pit(5, 22, null), pit(6, 30, 19.8)], stints);
    expect(hasStopTimes(stops)).toBe(true);
    expect(rankStops(stops).map((x) => [x.stop.driver, x.time, x.kind])).toEqual([[4, 2.2, 'stop'], [1, 2.4, 'stop'], [6, 19.8, 'stop']]);
  });
  it('falls back to pit lane time when stationary times are missing', () => {
    const stops = raceStops([pit(1, 18, null, 23.1), pit(4, 20, null, 21.9)], stints);
    expect(hasStopTimes(stops)).toBe(false);
    expect(rankStops(stops).map((x) => [x.stop.driver, x.kind])).toEqual([[4, 'lane'], [1, 'lane']]);
  });
});

describe('season pit stops per team', () => {
  it('finds the middle time of a team, leaving out stops of 6 seconds or more', () => {
    const rows = teamPitSummary([
      { team: 'A', stop: 2.2 }, { team: 'A', stop: 2.4 }, { team: 'A', stop: 2.6 }, { team: 'A', stop: 19.8 }, { team: 'A', stop: null },
      { team: 'B', stop: 2.1 }, { team: 'B', stop: 3.5 },
    ]);
    const a = rows.find((r) => r.team === 'A')!;
    expect([a.stops, a.fastest, a.typical]).toEqual([4, 2.2, 2.4]);
    // B: middle of 2.1 and 3.5 is 2.8, so A (2.4) is ahead.
    expect(rows.map((r) => r.team)).toEqual(['A', 'B']);
    expect(rows[1].typical).toBeCloseTo(2.8);
  });
  it('median of nothing is nothing', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
  });
});
