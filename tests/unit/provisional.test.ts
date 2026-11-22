import { describe, expect, it } from 'vitest';
import { addDrivers, addTeams, toResults } from '../../src/api/provisional';
import type { DriverStanding, ConstructorStanding } from '../../src/api/jolpica';
import type { OF1Driver, SessionResult } from '../../src/api/openf1';

const team = (id: string) => ({ constructorId: id, name: id });
const standing = (code: string, pts: number, wins: number, t: string, pos: number): DriverStanding => ({
  position: String(pos), positionText: String(pos), points: String(pts), wins: String(wins),
  Driver: { driverId: code.toLowerCase(), code, givenName: code, familyName: code }, Constructors: [team(t)],
});
const base = [standing('ANT', 390, 9, 'mercedes', 1), standing('VER', 279, 3, 'red_bull', 2), standing('RUS', 262, 3, 'mercedes', 3)];
const drv = (n: number, code: string) => ({ driver_number: n, name_acronym: code }) as OF1Driver;
const res = (n: number, pos: number | null, points: number, extra: Partial<SessionResult> = {}): SessionResult =>
  ({ driver_number: n, position: pos, points, number_of_laps: 50, duration: 5259.624, gap_to_leader: pos === 1 ? 0 : 1.5, dnf: false, dns: false, dsq: false, ...extra });

describe('provisional results', () => {
  const results = toResults(
    [res(3, 1, 25), res(12, 2, 18), res(63, null, 0, { dnf: true, number_of_laps: 17, gap_to_leader: null, duration: null })],
    [drv(3, 'VER'), drv(12, 'ANT'), drv(63, 'RUS')],
    base,
  );

  it('maps the classification onto Jolpica drivers, teams and statuses', () => {
    expect(results.map((r) => [r.position, r.Driver.code, r.Constructor.constructorId, r.points, r.status])).toEqual([
      ['1', 'VER', 'red_bull', '25', 'Finished'],
      ['2', 'ANT', 'mercedes', '18', 'Finished'],
      ['3', 'RUS', 'mercedes', '0', 'Retired'],
    ]);
    expect(results[0].Time?.time).toBe('1:27:39.624');
    expect(results[1].Time?.time).toBe('+1.500');
    expect(results[2].positionText).toBe('R');
  });

  it('adds the points and the win to the previous round and re-ranks', () => {
    const table = addDrivers(base, results, 'ver');
    expect(table.map((s) => [s.position, s.Driver.code, s.points, s.wins])).toEqual([
      ['1', 'ANT', '408', '9'],
      ['2', 'VER', '304', '4'],
      ['3', 'RUS', '262', '3'],
    ]);
  });

  it('adds team points and the team win', () => {
    const teams: ConstructorStanding[] = [
      { position: '1', positionText: '1', points: '652', wins: '12', Constructor: team('mercedes') },
      { position: '2', positionText: '2', points: '415', wins: '3', Constructor: team('red_bull') },
    ];
    expect(addTeams(teams, results, results).map((t) => [t.Constructor.constructorId, t.points, t.wins])).toEqual([
      ['mercedes', '670', '12'],
      ['red_bull', '440', '4'],
    ]);
  });
});
