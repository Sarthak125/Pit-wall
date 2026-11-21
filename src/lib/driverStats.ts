/** Season statistics for one driver, worked out from Jolpica results. */
import type { RaceWithQualifying, RaceWithResults, Result } from '../api/jolpica';

export const isClassified = (r: Result) => /^\d+$/.test(r.positionText);
const pos = (r: Result) => Number(r.positionText);

export interface RoundRow {
  round: number;
  name: string;
  qualified: number | null;
  grid: number | null;
  finish: number | null;
  finishText: string;
  delta: number | null;
  points: number;
  fastestLap: string | null;
  fastestRank: number | null;
  status: string;
}

export function roundRows(races: RaceWithResults[], key: 'Results' | 'SprintResults', code: string, quali: RaceWithQualifying[]): RoundRow[] {
  const out: RoundRow[] = [];
  for (const race of races) {
    const r = race[key]?.find((x) => x.Driver.code === code);
    if (!r) continue;
    const q = quali.find((x) => x.round === race.round)?.QualifyingResults?.find((x) => x.Driver.code === code);
    const grid = r.grid != null && Number(r.grid) > 0 ? Number(r.grid) : null;
    const finish = isClassified(r) ? pos(r) : null;
    out.push({
      round: Number(race.round),
      name: race.raceName.replace(/ Grand Prix$/, ''),
      qualified: key === 'Results' && q ? Number(q.position) : null,
      grid,
      finish,
      finishText: finish ? `P${finish}` : r.positionText === 'W' ? 'DNS' : r.positionText === 'D' ? 'DSQ' : 'DNF',
      delta: grid != null && finish != null ? grid - finish : null,
      points: Number(r.points) || 0,
      fastestLap: r.FastestLap?.Time?.time ?? null,
      fastestRank: r.FastestLap?.rank ? Number(r.FastestLap.rank) : null,
      status: r.status,
    });
  }
  return out;
}

export interface SeasonStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  frontRows: number;
  fastestLaps: number;
  pointsFinishes: number;
  avgFinish: number | null;
  avgGrid: number | null;
  gained: number;
  dnfRounds: number[];
  sprintPoints: number;
  sprints: number;
  totalPoints: number;
}

export function seasonStats(gp: RoundRow[], sprint: RoundRow[], quali: RaceWithQualifying[], code: string): SeasonStats {
  const classified = gp.filter((r) => r.finish != null);
  const grids = gp.filter((r) => r.grid != null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const sprintPoints = sprint.reduce((a, r) => a + r.points, 0);
  const gpPoints = gp.reduce((a, r) => a + r.points, 0);
  return {
    races: gp.length,
    wins: gp.filter((r) => r.finish === 1).length,
    podiums: gp.filter((r) => r.finish != null && r.finish <= 3).length,
    poles: quali.filter((q) => q.QualifyingResults?.find((x) => x.Driver.code === code)?.position === '1').length,
    frontRows: gp.filter((r) => r.grid != null && r.grid <= 2).length,
    fastestLaps: gp.filter((r) => r.fastestRank === 1).length,
    pointsFinishes: gp.filter((r) => r.points > 0).length,
    avgFinish: avg(classified.map((r) => r.finish!)),
    avgGrid: avg(grids.map((r) => r.grid!)),
    gained: gp.reduce((a, r) => a + (r.delta ?? 0), 0),
    dnfRounds: gp.filter((r) => r.finish == null).map((r) => r.round),
    sprintPoints,
    sprints: sprint.length,
    totalPoints: gpPoints + sprintPoints,
  };
}

export interface HeadToHead {
  racesA: number;
  racesB: number;
  qualiA: number;
  qualiB: number;
  podiumsA: number;
  podiumsB: number;
  winsA: number;
  winsB: number;
}

/** Head-to-head between two drivers over rounds both took part in. */
export function headToHead(races: RaceWithResults[], quali: RaceWithQualifying[], a: string, b: string): HeadToHead {
  const h: HeadToHead = { racesA: 0, racesB: 0, qualiA: 0, qualiB: 0, podiumsA: 0, podiumsB: 0, winsA: 0, winsB: 0 };
  for (const race of races) {
    const ra = race.Results?.find((x) => x.Driver.code === a);
    const rb = race.Results?.find((x) => x.Driver.code === b);
    if (ra && isClassified(ra) && pos(ra) <= 3) h.podiumsA++;
    if (rb && isClassified(rb) && pos(rb) <= 3) h.podiumsB++;
    if (ra && isClassified(ra) && pos(ra) === 1) h.winsA++;
    if (rb && isClassified(rb) && pos(rb) === 1) h.winsB++;
    if (!ra || !rb) continue;
    const ca = isClassified(ra), cb = isClassified(rb);
    if (ca && cb) pos(ra) < pos(rb) ? h.racesA++ : h.racesB++;
    else if (ca) h.racesA++;
    else if (cb) h.racesB++;
  }
  for (const q of quali) {
    const qa = q.QualifyingResults?.find((x) => x.Driver.code === a);
    const qb = q.QualifyingResults?.find((x) => x.Driver.code === b);
    if (qa && qb) Number(qa.position) < Number(qb.position) ? h.qualiA++ : h.qualiB++;
  }
  return h;
}

/**
 * Most points still available. Assumes the current points system:
 * 25 for a Grand Prix win, 8 for a sprint win, no fastest-lap point.
 */
export function pointsAvailable(remainingGps: number, remainingSprints: number) {
  return remainingGps * 25 + remainingSprints * 8;
}
