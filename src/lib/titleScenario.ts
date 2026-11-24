/**
 * "What if" for the drivers' championship: if each of two drivers finishes in a chosen position in every Grand Prix and
 * sprint still to run, who ends the season ahead? Race points are 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 and sprint points
 * 8 to 1; there is no fastest-lap point (since 2025). A tie on points is settled by countback (most wins first), which
 * this does not model, so it is reported as level.
 */
export const GP_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

/** Points for a finishing position (1 is a win); null, or a position outside the points, scores nothing. */
export function pointsAt(table: number[], position: number | null): number {
  return position == null ? 0 : (table[position - 1] ?? 0);
}

export interface ScenarioInput {
  /** Points now. */
  mine: number;
  rival: number;
  /** Grands Prix and sprints still to run. */
  gps: number;
  sprints: number;
  /** Finishing position in every one of them (null: outside the points). */
  minePosition: number | null;
  rivalPosition: number | null;
}

export interface ScenarioResult {
  mine: number;
  rival: number;
  outcome: 'mine' | 'rival' | 'level';
}

export function scenario(i: ScenarioInput): ScenarioResult {
  const total = (now: number, position: number | null) => now + i.gps * pointsAt(GP_POINTS, position) + i.sprints * pointsAt(SPRINT_POINTS, position);
  const mine = total(i.mine, i.minePosition);
  const rival = total(i.rival, i.rivalPosition);
  return { mine, rival, outcome: mine > rival ? 'mine' : mine < rival ? 'rival' : 'level' };
}

/**
 * The lowest finishing position the driver can have in every remaining race and sprint and still end ahead of a
 * rival who finishes in `rivalPosition` in all of them: 1 to 10, "outside" (no points at all would do), or null when
 * even winning every one is not enough.
 */
export function worstPositionThatWins(i: Omit<ScenarioInput, 'minePosition'>): number | 'outside' | null {
  if (scenario({ ...i, minePosition: null }).outcome === 'mine') return 'outside';
  for (let p = 10; p >= 1; p--) {
    if (scenario({ ...i, minePosition: p }).outcome === 'mine') return p;
  }
  return null;
}
