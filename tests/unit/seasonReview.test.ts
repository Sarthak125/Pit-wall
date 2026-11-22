import { describe, expect, it } from 'vitest';
import { seasonReview } from '../../src/lib/seasonReview';
import type { ConstructorStanding, DriverStanding, RaceWithQualifying, RaceWithResults, Result } from '../../src/api/jolpica';

const D = (code: string) => ({ driverId: code.toLowerCase(), code, givenName: code, familyName: code + 'son' });
const T = (id: string) => ({ constructorId: id, name: id.toUpperCase() });
const res = (code: string, team: string, pos: number | 'R', grid: number, points: number, time?: string, fl = false): Result => ({
  number: '1', position: String(pos === 'R' ? 20 : pos), positionText: String(pos), points: String(points), grid: String(grid), status: pos === 'R' ? 'Retired' : 'Finished',
  Driver: D(code), Constructor: T(team), Time: time ? { time } : undefined, FastestLap: fl ? { rank: '1' } : undefined,
});
const race = (round: number, results: Result[]): RaceWithResults => ({
  season: '2026', round: String(round), raceName: `GP ${round}`, date: '2026-03-01', Circuit: { circuitId: 'c', circuitName: 'C', Location: { locality: 'L', country: 'X' } }, Results: results,
});
const st = (code: string, team: string, pts: number, wins: number, pos: number): DriverStanding => ({ position: String(pos), positionText: String(pos), points: String(pts), wins: String(wins), Driver: D(code), Constructors: [T(team)] });
const ts = (id: string, pts: number, wins: number, pos: number): ConstructorStanding => ({ position: String(pos), positionText: String(pos), points: String(pts), wins: String(wins), Constructor: T(id) });

describe('season review', () => {
  const races = [
    race(1, [res('AAA', 'red', 1, 1, 25, '1:30:00.000', true), res('BBB', 'red', 2, 2, 18, '+0.412'), res('CCC', 'blue', 3, 9, 15, '+5.000'), res('DDD', 'blue', 'R', 3, 0)]),
    race(2, [res('CCC', 'blue', 1, 4, 25, '1:31:00.000'), res('AAA', 'red', 2, 1, 18, '+2.500', true), res('DDD', 'blue', 3, 2, 15, '+3.000'), res('BBB', 'red', 4, 3, 12, '+9.000')]),
  ];
  const quali: RaceWithQualifying[] = [
    { ...race(1, []), QualifyingResults: [{ number: '1', position: '1', Driver: D('AAA'), Constructor: T('red') }, { number: '2', position: '2', Driver: D('BBB'), Constructor: T('red') }] },
    { ...race(2, []), QualifyingResults: [{ number: '1', position: '1', Driver: D('AAA'), Constructor: T('red') }, { number: '2', position: '2', Driver: D('DDD'), Constructor: T('blue') }, { number: '3', position: '3', Driver: D('BBB'), Constructor: T('red') }, { number: '4', position: '4', Driver: D('CCC'), Constructor: T('blue') }] },
  ];
  const r = seasonReview(races, [], quali, [st('AAA', 'red', 43, 1, 1), st('CCC', 'blue', 40, 1, 2), st('BBB', 'red', 30, 0, 3), st('DDD', 'blue', 15, 0, 4)], [ts('red', 73, 1, 1), ts('blue', 55, 1, 2)]);

  it('works out each driver\'s season', () => {
    const a = r.drivers.find((d) => d.code === 'AAA')!;
    expect([a.wins, a.podiums, a.poles, a.fastestLaps, a.bestFinish, a.avgFinish, a.dnfs, a.gained]).toEqual([1, 2, 2, 2, 1, 1.5, 0, -1]);
    const d = r.drivers.find((x) => x.code === 'DDD')!;
    expect([d.starts, d.dnfs, d.bestFinish]).toEqual([2, 1, 3]);
    const c = r.drivers.find((x) => x.code === 'CCC')!;
    expect(c.gained).toBe(9);
  });

  it('counts team podiums and one-twos', () => {
    expect(r.teams.map((t) => [t.teamId, t.podiums, t.oneTwos, t.bestFinish])).toEqual([['red', 3, 1, 1], ['blue', 3, 0, 1]]);
  });

  it('settles team-mate battles in races both finished or started, and in qualifying', () => {
    const red = r.battles.find((b) => b.teamId === 'red')!;
    expect([red.a.code, red.b.code, red.races, red.quali]).toEqual(['AAA', 'BBB', [2, 0], [2, 0]]);
    const blue = r.battles.find((b) => b.teamId === 'blue')!;
    // R1: CCC classified, DDD retired -> CCC. R2: CCC P1, DDD P3 -> CCC. Quali R2: DDD P2 ahead of CCC P4.
    expect([blue.a.code, blue.races, blue.quali]).toEqual(['CCC', [2, 0], [0, 1]]);
  });

  it('picks the highlights', () => {
    const h = Object.fromEntries(r.highlights.map((x) => [x.key, x]));
    expect(h.winners.value).toBe('2');
    expect(h.climb.value).toBe('+6');
    expect(h.climb.detail).toContain('P9 to P3 at the GP 1');
    expect(h.closest.value).toBe('0.412 s');
    expect(h.onetwos.detail).toBe('RED');
    expect(h.dnfs.driverCode).toBe('DDD');
  });
});
