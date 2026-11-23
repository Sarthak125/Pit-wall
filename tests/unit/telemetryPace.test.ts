import { describe, expect, it } from 'vitest';
import type { CarData, Lap, Stint } from '../../src/api/openf1';
import { commonsPage, wikiTitle } from '../../src/api/wikipedia';
import { racePace } from '../../src/lib/racePace';
import { gapAlong, lapTrace, scaleTo, segmentWinners } from '../../src/lib/telemetry';

const T0 = Date.parse('2026-01-01T12:00:00Z');
/** Readings every 0.25 s at a speed given by `v(t)`, starting `offset` seconds after the line. */
function readings(seconds: number, v: (t: number) => number, offset = 0.1): CarData[] {
  const out: CarData[] = [];
  for (let t = offset; t < seconds; t += 0.25) out.push({ date: new Date(T0 + t * 1000).toISOString(), driver_number: 1, speed: v(t), n_gear: 7, rpm: 10000, throttle: 100, brake: 0 });
  return out;
}

describe('lap telemetry', () => {
  it('works out distance from speed and carries the lap to the line', () => {
    const { points, length } = lapTrace(readings(60, () => 180), T0, 60);
    expect(points[0]).toMatchObject({ d: 0, t: 0 });
    expect(points[points.length - 1].t).toBe(60);
    expect(length).toBeCloseTo(3000, 0); // 180 km/h for a minute
  });

  it('gives a gap of zero at the start and the lap time difference at the line', () => {
    const a = lapTrace(readings(60, () => 180), T0, 60);
    const b = lapTrace(readings(61, (t) => (t < 30 ? 180 : 170)), T0, 61);
    const length = (a.length + b.length) / 2;
    const gap = gapAlong(scaleTo(a.points, a.length, length), scaleTo(b.points, b.length, length), length);
    expect(gap[0].gap).toBeCloseTo(0, 5);
    expect(gap[gap.length - 1].gap).toBeCloseTo(1, 5);
    const parts = segmentWinners(scaleTo(a.points, a.length, length), scaleTo(b.points, b.length, length), length, 10);
    // B is slower in the second half of the lap, so A is quicker through the last parts.
    expect(parts.slice(-3).every((p) => p.faster === 'a')).toBe(true);
  });
});

describe('race pace', () => {
  const lap = (n: number, t: number, out = false) => ({ driver_number: 4, lap_number: n, lap_duration: t, is_pit_out_lap: out, date_start: null }) as unknown as Lap;
  // Stint 1 laps 1-10 getting 0.1 s slower a lap, a safety car lap 6, pit in lap 10; stint 2 laps 11-20 flat.
  const laps = [
    ...Array.from({ length: 10 }, (_, i) => lap(i + 1, i === 5 ? 130 : i === 9 ? 115 : 90 + i * 0.1)),
    lap(11, 110, true),
    ...Array.from({ length: 9 }, (_, i) => lap(i + 12, 89)),
  ];
  const stints: Stint[] = [
    { driver_number: 4, stint_number: 1, compound: 'SOFT', lap_start: 1, lap_end: 10, tyre_age_at_start: 0 },
    { driver_number: 4, stint_number: 2, compound: 'HARD', lap_start: 11, lap_end: 20, tyre_age_at_start: 0 },
  ];

  it('leaves out the start, pit laps and safety car laps, and fits time lost per lap for each stint', () => {
    const [p] = racePace(laps, stints);
    expect(p.stints[0]).toMatchObject({ compound: 'SOFT', laps: 7 });
    expect(p.stints[0].deg).toBeCloseTo(0.1, 5);
    expect(p.stints[1]).toMatchObject({ compound: 'HARD', laps: 8 });
    expect(p.stints[1].deg).toBeCloseTo(0, 5);
    expect(p.laps).toBe(15);
    expect(p.typical).toBe(89);
  });
});

describe('Wikipedia links', () => {
  it('reads the article title and the photo page', () => {
    expect(wikiTitle('http://en.wikipedia.org/wiki/Max_Verstappen')).toBe('Max_Verstappen');
    expect(wikiTitle('https://example.com/x')).toBeNull();
    expect(commonsPage('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Some_photo.jpg/330px-Some_photo.jpg')).toBe('https://commons.wikimedia.org/wiki/File:Some_photo.jpg');
  });
});
