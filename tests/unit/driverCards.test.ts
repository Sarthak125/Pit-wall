import { describe, expect, it } from 'vitest';
import type { RaceWithQualifying, RaceWithResults } from '../../src/api/jolpica';
import { driverCardSnapshots, overallRating, rateFromPercent, ratingTier, WEIGHTS } from '../../src/lib/driverCards';

const driver = (id: string, code: string) => ({ driverId: id, code, givenName: id.toUpperCase(), familyName: id, permanentNumber: '7', nationality: 'Dutch' });
const team = (id: string) => ({ constructorId: id, name: id });
type Row = [string, string, string, string, string]; // driver id, code, team, positionText, points
const result = ([id, code, t, pos, pts]: Row) => ({ number: '7', position: pos, positionText: pos, points: pts, Driver: driver(id, code), Constructor: team(t), grid: '1', laps: '50', status: 'Finished' });
const race = (round: number, rows: Row[]): RaceWithResults => ({ season: '2026', round: String(round), raceName: `Test ${round} Grand Prix`, date: '2026-01-01', Results: rows.map(result) } as unknown as RaceWithResults);
const quali = (round: number, rows: [string, string, string][]): RaceWithQualifying => ({
  round: String(round),
  QualifyingResults: rows.map(([id, t, pos]) => ({ number: '7', position: pos, Driver: driver(id, id.slice(0, 3).toUpperCase()), Constructor: team(t) })),
} as unknown as RaceWithQualifying);

// Four drivers in two teams over four rounds. "ace" wins every race and starts from pole; "dee" retires in round 2.
const R = (n: number, dee: string): Row[] => [['ace', 'ACE', 'x', '1', '25'], ['bob', 'BOB', 'x', '2', '18'], ['cat', 'CAT', 'y', '3', '15'], ['dee', 'DEE', 'y', dee, dee === 'R' ? '0' : '12']];
const races = [race(1, R(1, '4')), race(2, R(2, 'R')), race(3, R(3, '4')), race(4, R(4, '4'))];
const qualis = [1, 2, 3, 4].map((n) => quali(n, [['ace', 'x', '1'], ['bob', 'x', '2'], ['cat', 'y', '3'], ['dee', 'y', '4']]));

describe('driver cards', () => {
  const snaps = driverCardSnapshots(races, [], qualis);

  it('makes one snapshot per round with results', () => {
    expect(snaps.map((s) => s.round)).toEqual([1, 2, 3, 4]);
    expect(snaps[3].race).toBe('Test 4 Grand Prix');
  });

  it('gives no ratings before three starts, then ratings between 1 and 99', () => {
    expect(snaps[1].cards.ace.ratings).toBeNull();
    expect(snaps[1].cards.ace.overall).toBeNull();
    const ace = snaps[2].cards.ace;
    expect(ace.ratings).toEqual([99, 99, 99, 99, 99, 99]);
    expect(ace.overall).toBe(99);
    for (const c of Object.values(snaps[3].cards)) for (const r of c.ratings!) expect(r).toBeGreaterThanOrEqual(1);
  });

  it('works out the real figures behind the ratings', () => {
    const dee = snaps[3].cards.dee;
    expect(dee.starts).toBe(4);
    expect(dee.dnfs).toBe(1);
    expect(dee.raw.finishRate).toBe(75);
    expect(dee.raw.finish).toBe(4);
    expect(dee.form).toEqual([4, null, 4, 4]);
    expect(snaps[3].cards.ace.raw.pointsPerRace).toBe(25);
    expect(snaps[3].cards.ace.wins).toBe(4);
    expect(snaps[3].cards.ace.poles).toBe(4);
  });

  it('ranks a driver below the others when the figure is worse, and ties share a rating', () => {
    const last = snaps[3].cards;
    expect(last.dee.ratings![4]).toBe(1); // lowest finish rate
    expect(last.ace.ratings![4]).toBe(last.bob.ratings![4]); // all three others finished every race
  });

  it('counts the team-mate duel in qualifying and races', () => {
    const ace = snaps[3].cards.ace;
    expect(ace.mate).toMatchObject({ code: 'BOB', races: [4, 0, 4], quali: [4, 4], points: [100, 72] });
    // dee finished behind cat in every round, including the one where dee retired.
    expect(snaps[3].cards.dee.mate!.races).toEqual([0, 4, 4]);
  });

  it('adds sprint points to the standing and orders by points', () => {
    const sprint: RaceWithResults = { season: '2026', round: '1', raceName: 'x', date: '2026-01-01', SprintResults: [result(['bob', 'BOB', 'x', '1', '8'])] } as unknown as RaceWithResults;
    const s = driverCardSnapshots(races, [sprint], qualis);
    expect(s[0].cards.bob.points).toBe(26);
    expect(s[0].cards.bob.pos).toBe(1);
  });

  it('uses the official standing in the latest snapshot only', () => {
    const official = new Map([['bob', { pos: 1, points: 999 }]]);
    const s = driverCardSnapshots(races, [], qualis, official);
    expect(s[3].cards.bob).toMatchObject({ pos: 1, points: 999 });
    expect(s[2].cards.bob.points).toBe(54);
  });

  it('mixes the stat ratings with fixed weights', () => {
    expect(WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(overallRating([99, 99, 99, 99, 99, 99])).toBe(99);
    expect(overallRating([100, 0, 0, 0, 0, 0].map((x) => x))).toBe(30);
    expect(overallRating([50, 50, 50, 50, 50, null])).toBeNull();
    expect(overallRating(null)).toBeNull();
  });

  it('turns a percentile into a rating from 1 to 99 and bands it by colour', () => {
    expect([0, 50, 100].map(rateFromPercent)).toEqual([1, 50, 99]);
    expect([99, 85, 84, 70, 69, 50, 49, 1, null].map(ratingTier)).toEqual(['gold', 'gold', 'green', 'green', 'amber', 'amber', 'grey', 'grey', 'grey']);
  });
});
