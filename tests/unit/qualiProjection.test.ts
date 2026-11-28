import { describe, expect, it } from 'vitest';
import { cutRatios, knockoutTimes, parseLap } from '../../src/lib/qualiProjection';

// A made-up 20-car qualifying: 15 into Q2, 10 into Q3, every part about 0.5 s quicker than the one before.
const history = Array.from({ length: 20 }, (_, i) => [80 + i * 0.1, i < 15 ? 79.5 + i * 0.1 : null, i < 10 ? 79 + i * 0.1 : null]);

describe('qualifying knockout times', () => {
  it('reads lap times', () => {
    expect(parseLap('1:23.456')).toBeCloseTo(83.456);
    expect(parseLap('83.5')).toBe(83.5);
    expect(parseLap('')).toBeNull();
    expect(parseLap('DNF')).toBeNull();
  });

  it('works out how much the cut-offs fell between parts', () => {
    const r = cutRatios(history, '2025')!;
    // P10: 80.9 in Q1, 80.4 in Q2. Fastest: 80.0 in Q1, 79.5 in Q2, pole 79.0.
    expect(r.q2CutOverQ1).toBeCloseTo(80.4 / 80.9);
    expect(r.poleOverQ1Best).toBeCloseTo(79 / 80);
    expect(r.poleOverQ2Best).toBeCloseTo(79 / 79.5);
    expect(r.season).toBe('2025');
  });

  it('refuses ratios that do not look like a normal session', () => {
    const wetQ1 = history.map((t) => [t[0]! + 10, t[1], t[2]]);
    expect(cutRatios(wetQ1, '2025')).toBeNull();
    expect(cutRatios(history.map((t) => [t[0], null, null]), '2025')).toBeNull();
  });

  it('during Q1 shows the cut-off now and projects Q2 and pole', () => {
    const r = cutRatios(history, '2025')!;
    // 22 cars, 16 through: P16 now is 84.5.
    const now = Array.from({ length: 22 }, (_, i) => [83 + i * 0.1, null, null]);
    const [q1, q2, q3] = knockoutTimes(now, 1, [22, 16, 10], r);
    expect(q1).toMatchObject({ kind: 'now' });
    expect(q1.time).toBeCloseTo(84.5);
    // Q2 cut from today's P10 in Q1 (83.9); pole from today's fastest (83.0).
    expect(q2.kind).toBe('projected');
    expect(q2.time).toBeCloseTo(83.9 * r.q2CutOverQ1);
    expect(q3.kind).toBe('projected');
    expect(q3.time).toBeCloseTo(83 * r.poleOverQ1Best);
    expect(q3.time!).toBeLessThan(83);
  });

  it('without an earlier qualifying here, projects nothing', () => {
    const now = Array.from({ length: 22 }, (_, i) => [83 + i * 0.1, null, null]);
    const [, q2, q3] = knockoutTimes(now, 1, [22, 16, 10], null);
    expect(q2.time).toBeNull();
    expect(q3.time).toBeNull();
  });

  it('before enough cars have set a time, there is no cut-off yet, but pole is still projected from the fastest', () => {
    const now = Array.from({ length: 22 }, (_, i) => [i < 9 ? 83 + i : null, null, null]);
    const [q1, q2, q3] = knockoutTimes(now, 1, [22, 16, 10], cutRatios(history, '2025'));
    expect(q1.time).toBeNull();
    expect(q2.time).toBeNull();
    expect(q3.time).not.toBeNull();
  });

  it('matches the real Lusail 2025 numbers', () => {
    // 2025: Q1 P10 and Q2 P10, fastest in Q1 and Q2, pole (from Jolpica), only the places the ratios use.
    const r = cutRatios([[80.0, 79.6, 79.387], ...Array.from({ length: 8 }, (_, i) => [80.1 + i * 0.05, 79.7 + i * 0.05, 79.5 + i * 0.05]), [80.5, 80.35, 79.9]], '2025')!;
    expect(r.q2CutOverQ1).toBeCloseTo(80.35 / 80.5);
    expect(r.poleOverQ1Best).toBeCloseTo(79.387 / 80);
  });

  it('in Q2 the Q1 cut-off is final and the Q2 one is live once ten cars have a time', () => {
    const r = cutRatios(history, '2025')!;
    const rows = Array.from({ length: 22 }, (_, i) => [83 + i * 0.1, i < 16 && i < 12 ? 82.5 + i * 0.1 : null, null]);
    const [q1, q2, q3] = knockoutTimes(rows, 2, [22, 16, 10], r);
    expect(q1).toMatchObject({ kind: 'final' });
    expect(q1.time).toBeCloseTo(84.5);
    expect(q2.kind).toBe('now');
    expect(q2.time).toBeCloseTo(83.4);
    expect(q3.time).toBeCloseTo(82.5 * r.poleOverQ2Best);
  });

  it('once finished, every value is the real one', () => {
    const rows = Array.from({ length: 22 }, (_, i) => [83 + i * 0.1, i < 16 ? 82.5 + i * 0.1 : null, i < 10 ? 82 + i * 0.1 : null]);
    const out = knockoutTimes(rows, null, [22, 16, 10], null);
    expect(out.map((k) => k.kind)).toEqual(['final', 'final', 'final']);
    expect(out[2].time).toBeCloseTo(82);
  });
});
