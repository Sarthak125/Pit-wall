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

describe("OpenF1's championship standings", () => {
  it('take over points and order, ties included, and keep wins', async () => {
    const { applyDriverChampionship, applyTeamChampionship } = await import('../../src/api/provisional');
    // Our sums put RUS ahead of NOR on a tie; OpenF1 says NOR.
    const ours = [standing('ANT', 402, 9, 'mercedes', 1), standing('RUS', 264, 3, 'mercedes', 2), standing('NOR', 264, 3, 'mclaren', 3)];
    const out = applyDriverChampionship(
      ours,
      [
        { driver_number: 12, position_current: 1, points_current: 402 },
        { driver_number: 1, position_current: 2, points_current: 264 },
        { driver_number: 63, position_current: 3, points_current: 264 },
      ],
      [drv(12, 'ANT'), drv(1, 'NOR'), drv(63, 'RUS')],
    );
    expect(out.map((s) => [s.position, s.Driver.code, s.points, s.wins])).toEqual([
      ['1', 'ANT', '402', '9'],
      ['2', 'NOR', '264', '3'],
      ['3', 'RUS', '264', '3'],
    ]);
    const teams = applyTeamChampionship(
      [
        { position: '1', positionText: '1', points: '660', wins: '12', Constructor: team('mercedes') },
        { position: '2', positionText: '2', points: '431', wins: '3', Constructor: team('mclaren') },
      ],
      [
        { team_name: 'Mercedes', position_current: 1, points_current: 666 },
        { team_name: 'McLaren', position_current: 2, points_current: 431 },
      ],
      [{ ...drv(12, 'ANT'), team_name: 'Mercedes' }, { ...drv(1, 'NOR'), team_name: 'McLaren' }],
      toResults([res(12, 1, 25), res(1, 2, 18)], [drv(12, 'ANT'), drv(1, 'NOR')], [standing('ANT', 0, 0, 'mercedes', 1), standing('NOR', 0, 0, 'mclaren', 2)]),
    );
    expect(teams.map((t) => [t.Constructor.constructorId, t.points])).toEqual([['mercedes', '666'], ['mclaren', '431']]);
  });

  it('are ignored when OpenF1 has none', async () => {
    const { applyDriverChampionship } = await import('../../src/api/provisional');
    expect(applyDriverChampionship(base, [], [])).toBe(base);
  });
});

describe('teams and grid in provisional results', () => {
  it("credit a driver who changed team to this session's team, and fill the grid", () => {
    const st = [
      { ...standing('LAW', 89, 0, 'rb', 1), Constructors: [team('rb'), team('red_bull')] },
      standing('LIN', 38, 0, 'rb', 2),
      standing('VER', 304, 4, 'red_bull', 3),
    ];
    const drivers = [
      { ...drv(30, 'LAW'), team_name: 'Racing Bulls' },
      { ...drv(41, 'LIN'), team_name: 'Racing Bulls' },
      { ...drv(3, 'VER'), team_name: 'Red Bull Racing' },
    ];
    const out = toResults([res(3, 1, 25), res(30, 2, 18), res(41, 3, 15)], drivers, st, new Map([[3, 1], [30, 5]]));
    expect(out.map((r) => [r.Driver.code, r.Constructor.constructorId, r.grid])).toEqual([
      ['VER', 'red_bull', '1'],
      ['LAW', 'rb', '5'],
      ['LIN', 'rb', undefined],
    ]);
  });
});
