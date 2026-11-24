import { describe, expect, it } from 'vitest';
import { pointsAt, scenario, SPRINT_POINTS, GP_POINTS, worstPositionThatWins } from '../../src/lib/titleScenario';

describe('title scenarios', () => {
  it('scores positions with the race and sprint tables', () => {
    expect([1, 2, 10, 11].map((p) => pointsAt(GP_POINTS, p))).toEqual([25, 18, 1, 0]);
    expect([1, 8, 9].map((p) => pointsAt(SPRINT_POINTS, p))).toEqual([8, 1, 0]);
    expect(pointsAt(GP_POINTS, null)).toBe(0);
  });
  it('adds each driver\'s points over the races and sprints left', () => {
    // 3 races and 1 sprint left: P1 scores 3 x 25 + 8 = 83, P2 scores 3 x 18 + 7 = 61.
    const r = scenario({ mine: 300, rival: 330, gps: 3, sprints: 1, minePosition: 1, rivalPosition: 2 });
    expect([r.mine, r.rival, r.outcome]).toEqual([383, 391, 'rival']);
    expect(scenario({ mine: 300, rival: 310, gps: 3, sprints: 1, minePosition: 1, rivalPosition: 2 }).outcome).toBe('mine');
  });
  it('reports a tie as level', () => {
    expect(scenario({ mine: 100, rival: 107, gps: 1, sprints: 0, minePosition: 1, rivalPosition: 2 }).outcome).toBe('level'); // 125 and 125
  });
  it('finds the lowest finish that still wins', () => {
    // 2 races left, 10 points behind, rival always P2 (36 points): need more than 46 from two races.
    const base = { mine: 290, rival: 300, gps: 2, sprints: 0, rivalPosition: 2 };
    // P1 gives 50 (340 vs 336): wins. P2 gives 36 (326 vs 336): loses.
    expect(worstPositionThatWins(base)).toBe(1);
    // Far enough ahead that the rival cannot catch up whatever happens.
    expect(worstPositionThatWins({ ...base, mine: 400 })).toBe('outside');
    // Too far behind: even two wins do not do it.
    expect(worstPositionThatWins({ ...base, mine: 200 })).toBeNull();
  });
  it('gives a middle position when the gap is small', () => {
    // One race left, 3 points ahead of a rival who finishes 3rd (15 points): P3 (15) keeps 318 vs 315, P4 (12) only draws level.
    expect(worstPositionThatWins({ mine: 303, rival: 300, gps: 1, sprints: 0, rivalPosition: 3 })).toBe(3);
  });
});
