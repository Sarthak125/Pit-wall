import { describe, expect, it } from 'vitest';
import { titleDecisions } from '../../src/lib/titles';
import type { Race, RaceWithResults, Result } from '../../src/api/jolpica';

const race = (round: number, sprint = false): Race => ({
  season: '2026', round: String(round), raceName: `Race ${round}`, date: `2026-0${Math.min(9, round)}-01`, time: '12:00:00Z',
  Circuit: { circuitId: 'c' + round, circuitName: 'C', Location: { locality: 'L', country: 'X' } },
  ...(sprint ? { Sprint: { date: '2026-01-01', time: '10:00:00Z' } } : {}),
});
const res = (code: string, team: string, pos: number, points: number): Result => ({
  number: '1', position: String(pos), positionText: String(pos), points: String(points), status: 'Finished',
  Driver: { driverId: code.toLowerCase(), code, givenName: code, familyName: code }, Constructor: { constructorId: team, name: team },
});
const done = (round: number, results: Result[]): RaceWithResults => ({ ...race(round), Results: results });

describe('title decisions', () => {
  it('finds the round a driver could no longer be caught, and the team title', () => {
    const schedule = [1, 2, 3, 4].map((r) => race(r));
    // A wins every race; B second. After R2: lead 14, 50 left (open). After R3: lead 21, 25 left (open).
    const races = [1, 2, 3].map((r) => done(r, [res('AAA', 'red', 1, 25), res('BBB', 'blue', 2, 18), res('CCC', 'red', 3, 15)]));
    const t = titleDecisions(schedule, races, []);
    expect(t.driver).toBeNull();
    // Team red scores 40 a race, blue 18: after R1 lead 22 (129 left), R2 44 (86), R3 66 (43) -> decided at R3.
    expect(t.team?.id).toBe('red');
    expect(t.team?.round).toBe(3);
    expect(t.team?.seasonOver).toBe(false);
  });

  it('counts a title as decided when the rival could only draw level on points without passing on wins', () => {
    const schedule = [1, 2].map((r) => race(r));
    // After R1: A 25 (1 win), B 0. 25 left: B can reach 25 with 1 win, same as A -> not passed on wins, but level.
    // Countback ties on wins go further down, so a level case with equal wins stays open.
    const t1 = titleDecisions(schedule, [done(1, [res('AAA', 'red', 1, 25), res('BBB', 'blue', 2, 0)])], []);
    expect(t1.driver).toBeNull();
    // With a 26-point lead it is decided.
    const t2 = titleDecisions(schedule, [done(1, [res('AAA', 'red', 1, 26), res('BBB', 'blue', 2, 0)])], []);
    expect(t2.driver?.id).toBe('aaa');
    expect(t2.driver?.round).toBe(1);
    expect(t2.driver?.available).toBe(25);
  });

  it('includes sprints in the points still available', () => {
    const schedule = [race(1), race(2, true)];
    const t = titleDecisions(schedule, [done(1, [res('AAA', 'red', 1, 30), res('BBB', 'blue', 2, 0)])], []);
    // 25 + 8 = 33 left: a 30-point lead is not enough.
    expect(t.driver).toBeNull();
  });

  it('names the champion after the final round', () => {
    const schedule = [race(1)];
    const t = titleDecisions(schedule, [done(1, [res('AAA', 'red', 1, 25), res('BBB', 'blue', 2, 18)])], []);
    expect(t.driver?.seasonOver).toBe(true);
    expect(t.driver?.round).toBe(1);
  });
});
