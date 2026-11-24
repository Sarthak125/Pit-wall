import { describe, expect, it } from 'vitest';
import type { RaceWithQualifying } from '../../src/api/jolpica';
import { lapSeconds, qualiGap } from '../../src/lib/qualiGap';

type Times = { Q1?: string; Q2?: string; Q3?: string };
const race = (round: string, a: Times, b: Times): RaceWithQualifying => ({
  round,
  QualifyingResults: [
    { number: '1', position: '1', Driver: { code: 'AAA' }, Constructor: {}, ...a },
    { number: '2', position: '2', Driver: { code: 'BBB' }, Constructor: {}, ...b },
  ],
} as unknown as RaceWithQualifying);

describe('lap times', () => {
  it('reads minutes and seconds', () => {
    expect(lapSeconds('1:23.456')).toBeCloseTo(83.456);
    expect(lapSeconds('59.9')).toBeCloseTo(59.9);
    expect(lapSeconds('')).toBeNull();
    expect(lapSeconds(undefined)).toBeNull();
  });
});

describe('qualifying gap between team-mates', () => {
  it('compares in the last session both reached', () => {
    const g = qualiGap([
      race('1', { Q1: '1:30.000', Q2: '1:29.000', Q3: '1:28.000' }, { Q1: '1:30.500', Q2: '1:29.500', Q3: '1:28.400' }), // Q3: A 0.4 s quicker
      race('2', { Q1: '1:30.000', Q2: '1:29.000' }, { Q1: '1:30.300', Q2: '1:29.100' }), // B out in Q2: A 0.1 s quicker
      race('3', { Q1: '1:30.600' }, { Q1: '1:30.000' }), // both out in Q1: B 0.6 s quicker
    ], 'AAA', 'BBB')!;
    expect(g.rounds).toBe(3);
    expect(g.aQuicker).toBe(2);
    expect(g.seconds).toBeCloseTo(0.1); // the middle of 0.4, 0.1 and -0.6
    expect(g.pct).toBeGreaterThan(0);
  });
  it('is null without a common session time', () => {
    expect(qualiGap([race('1', { Q1: '1:30.0' }, {})], 'AAA', 'BBB')).toBeNull();
    expect(qualiGap([], 'AAA', 'BBB')).toBeNull();
  });
});
