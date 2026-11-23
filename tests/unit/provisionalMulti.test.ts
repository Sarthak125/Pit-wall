import { describe, expect, it, vi } from 'vitest';

/*
 * Jolpica has round 1 only; rounds 2 and 3 have been run. The OpenF1 backup should fill in both, in order, with the
 * standings after round 3 built from those after round 1.
 */
const day = 24 * 3_600_000;
const iso = (t: number) => new Date(t).toISOString();
const raceOf = (round: number, daysAgo: number) => {
  const t = Date.now() - daysAgo * day;
  return { season: '2026', round: String(round), raceName: `Race ${round}`, date: iso(t).slice(0, 10), time: iso(t).slice(11, 19) + 'Z', Circuit: { circuitId: 'c' + round, circuitName: 'C', Location: { locality: '', country: '' } } };
};
const driver = (code: string) => ({ driverId: code.toLowerCase(), code, givenName: code, familyName: code });
const team = { constructorId: 't', name: 'T' };
const standing = (code: string, points: number, wins: number, pos: number) => ({ position: String(pos), positionText: String(pos), points: String(points), wins: String(wins), Driver: driver(code), Constructors: [team] });

vi.mock('../../src/api/jolpica', () => ({
  getSchedule: async () => [raceOf(1, 20), raceOf(2, 13), raceOf(3, 6), raceOf(4, -1)],
  getRaceResults: async () => [{ ...raceOf(1, 20), Results: [{ position: '1', Driver: driver('AAA') }] }],
  getSprintResults: async () => [],
  getDriverStandingsAt: async (_s: string, round: number) => ({ round, standings: [standing('AAA', 25, 1, 1), standing('BBB', 18, 0, 2)] }),
  getConstructorStandingsAt: async (_s: string, round: number) => ({ round, standings: [{ position: '1', positionText: '1', points: '43', wins: '1', Constructor: team }] }),
}));
vi.mock('../../src/api/openf1', () => ({
  findMeeting: async ([date]: string[]) => ({ meeting_key: Number(date.replace(/-/g, '')) }),
  meetingSessions: async (key: number) => [{ session_name: 'Race', session_key: key }],
  openf1: async (endpoint: string, params: { session_key: number }) => {
    const d = [{ driver_number: 1, name_acronym: 'AAA', team_name: 'T' }, { driver_number: 2, name_acronym: 'BBB', team_name: 'T' }];
    if (endpoint === 'drivers') return d;
    // BBB wins both missing races.
    if (endpoint === 'session_result') return [{ driver_number: 2, position: 1, points: 25, number_of_laps: 50 }, { driver_number: 1, position: 2, points: 18, number_of_laps: 50 }].map((r) => ({ ...r, session_key: params.session_key }));
    return [];
  },
}));

describe('OpenF1 backup for several missing weekends', () => {
  it('fills in every missing weekend in order and builds the standings across them', async () => {
    const { getProvisional, provisionalWeekends } = await import('../../src/api/provisional');
    const p = (await getProvisional('current'))!;
    expect(provisionalWeekends(p).map((w) => w.round)).toEqual([2, 3]);
    expect(p.round).toBe(3);
    expect(p.earlier[0].race?.Results?.[0].Driver.code).toBe('BBB');
    // AAA 25 + 18 + 18 = 61, BBB 18 + 25 + 25 = 68, BBB now leads with 2 wins.
    expect(p.drivers.standings.map((s) => [s.Driver.code, s.points, s.wins])).toEqual([['BBB', '68', '2'], ['AAA', '61', '1']]);
    expect(p.constructors.standings[0].points).toBe(String(43 + 43 + 43));
  });
});
