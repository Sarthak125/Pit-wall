/**
 * A season in numbers, from Jolpica's results, sprint results, qualifying and standings: per-driver and per-team
 * stats, team-mate battles and a few highlights. Works for a season in progress ("so far") as well as a finished one.
 */
import type { ConstructorStanding, DriverStanding, RaceWithQualifying, RaceWithResults, Result } from '../api/jolpica';
import { headToHead, isClassified } from './driverStats';

const pos = (r: Result) => Number(r.positionText);

export interface DriverSeason {
  driverId: string;
  code: string;
  name: string;
  teamId: string;
  teamName: string;
  points: number;
  position: number;
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  bestFinish: number | null;
  avgFinish: number | null;
  dnfs: number;
  /** Places gained (positive) or lost from the grid over all classified Grands Prix. */
  gained: number;
}

export interface TeamSeason {
  teamId: string;
  name: string;
  points: number;
  position: number;
  wins: number;
  podiums: number;
  oneTwos: number;
  bestFinish: number | null;
}

export interface TeamBattle {
  teamId: string;
  teamName: string;
  a: DriverSeason;
  b: DriverSeason;
  races: [number, number];
  quali: [number, number];
}

export interface Highlight {
  key: string;
  label: string;
  value: string;
  detail: string;
  /** Driver code or team id the highlight is about, for links. */
  driverCode?: string;
  teamId?: string;
  round?: string;
}

export interface SeasonReview {
  rounds: number;
  drivers: DriverSeason[];
  teams: TeamSeason[];
  battles: TeamBattle[];
  highlights: Highlight[];
}

/** "+0.639" or "+1:02.345" to seconds; null for laps down or a missing time. */
function gapSeconds(t?: string): number | null {
  const m = t?.match(/^\+(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function seasonReview(
  races: RaceWithResults[],
  sprints: RaceWithResults[],
  quali: RaceWithQualifying[],
  driverStandings: DriverStanding[],
  teamStandings: ConstructorStanding[],
): SeasonReview {
  const run = races.filter((r) => r.Results?.length);
  const drivers: DriverSeason[] = driverStandings.map((s, i) => {
    const code = s.Driver.code ?? s.Driver.familyName.slice(0, 3).toUpperCase();
    const mine = run.map((r) => r.Results!.find((x) => x.Driver.driverId === s.Driver.driverId)).filter((x): x is Result => !!x);
    // The team of the driver's latest race (Jolpica's list of a driver's teams is not in date order).
    const team = mine[mine.length - 1]?.Constructor ?? s.Constructors[s.Constructors.length - 1];
    const classified = mine.filter(isClassified);
    const finishes = classified.map(pos);
    return {
      driverId: s.Driver.driverId,
      code,
      name: `${s.Driver.givenName} ${s.Driver.familyName}`,
      teamId: team?.constructorId ?? '',
      teamName: team?.name ?? '',
      points: Number(s.points),
      position: Number(s.position ?? i + 1),
      starts: mine.length,
      wins: finishes.filter((p) => p === 1).length,
      podiums: finishes.filter((p) => p <= 3).length,
      poles: quali.filter((q) => q.QualifyingResults?.find((x) => x.Driver.driverId === s.Driver.driverId)?.position === '1').length,
      fastestLaps: mine.filter((r) => r.FastestLap?.rank === '1').length,
      bestFinish: finishes.length ? Math.min(...finishes) : null,
      avgFinish: finishes.length ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
      dnfs: mine.length - classified.length,
      gained: classified.reduce((a, r) => (Number(r.grid) > 0 ? a + Number(r.grid) - pos(r) : a), 0),
    };
  });

  const teams: TeamSeason[] = teamStandings.map((t, i) => {
    const id = t.Constructor.constructorId;
    let podiums = 0, oneTwos = 0, best: number | null = null;
    for (const r of run) {
      const ours = r.Results!.filter((x) => x.Constructor.constructorId === id && isClassified(x)).map(pos);
      podiums += ours.filter((p) => p <= 3).length;
      if (ours.includes(1) && ours.includes(2)) oneTwos++;
      for (const p of ours) best = best == null ? p : Math.min(best, p);
    }
    return { teamId: id, name: t.Constructor.name, points: Number(t.points), position: Number(t.position ?? i + 1), wins: Number(t.wins), podiums, oneTwos, bestFinish: best };
  });

  // Team-mate battles: each team's two drivers with the most Grands Prix for it (a seat swap leaves the regular pair).
  const startsFor = (driverId: string, teamId: string) => run.filter((r) => r.Results!.some((x) => x.Driver.driverId === driverId && x.Constructor.constructorId === teamId)).length;
  const battles: TeamBattle[] = [];
  for (const t of teams) {
    const pair = drivers
      .map((d) => ({ d, n: startsFor(d.driverId, t.teamId) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 2)
      .map((x) => x.d);
    if (pair.length < 2) continue;
    const h = headToHead(run, quali, pair[0].code, pair[1].code);
    battles.push({ teamId: t.teamId, teamName: t.name, a: pair[0], b: pair[1], races: [h.racesA, h.racesB], quali: [h.qualiA, h.qualiB] });
  }

  const highlights: Highlight[] = [];
  const top = <T,>(xs: T[], f: (x: T) => number) => xs.reduce<T | null>((m, x) => (m == null || f(x) > f(m) ? x : m), null);
  const winners = new Set(run.map((r) => r.Results!.find((x) => x.position === '1')?.Driver.driverId).filter(Boolean));
  if (run.length) highlights.push({ key: 'winners', label: 'Different winners', value: String(winners.size), detail: `in ${plural(run.length, 'Grand Prix', 'Grands Prix')}` });
  const mostWins = top(drivers, (d) => d.wins);
  if (mostWins?.wins) highlights.push({ key: 'wins', label: 'Most wins', value: String(mostWins.wins), detail: mostWins.name, driverCode: mostWins.code });
  const mostPoles = top(drivers, (d) => d.poles);
  if (mostPoles?.poles) highlights.push({ key: 'poles', label: 'Most poles', value: String(mostPoles.poles), detail: mostPoles.name, driverCode: mostPoles.code });
  const mostPodiums = top(drivers, (d) => d.podiums);
  if (mostPodiums?.podiums) highlights.push({ key: 'podiums', label: 'Most podiums', value: String(mostPodiums.podiums), detail: mostPodiums.name, driverCode: mostPodiums.code });

  // Biggest climb in one race: grid to finish, classified finishers who started from a grid slot.
  let climb: { r: Result; race: RaceWithResults; by: number } | null = null;
  for (const race of run) {
    for (const r of race.Results!) {
      if (!isClassified(r) || !(Number(r.grid) > 0)) continue;
      const by = Number(r.grid) - pos(r);
      if (!climb || by > climb.by) climb = { r, race, by };
    }
  }
  if (climb && climb.by > 0) {
    highlights.push({
      key: 'climb',
      label: 'Biggest climb in a race',
      value: `+${climb.by}`,
      detail: `${climb.r.Driver.givenName} ${climb.r.Driver.familyName}, P${climb.r.grid} to P${climb.r.positionText} at the ${climb.race.raceName}`,
      driverCode: climb.r.Driver.code,
      round: climb.race.round,
    });
  }

  // Closest win: the smallest gap from the winner to second place.
  let close: { race: RaceWithResults; gap: number } | null = null;
  for (const race of run) {
    const gap = gapSeconds(race.Results!.find((x) => x.position === '2')?.Time?.time);
    if (gap != null && (!close || gap < close.gap)) close = { race, gap };
  }
  if (close) {
    const w = close.race.Results!.find((x) => x.position === '1')!;
    const s = close.race.Results!.find((x) => x.position === '2')!;
    highlights.push({
      key: 'closest',
      label: 'Closest win',
      value: `${close.gap.toFixed(3)} s`,
      detail: `${w.Driver.familyName} ahead of ${s.Driver.familyName} at the ${close.race.raceName}`,
      round: close.race.round,
    });
  }

  const mostDnfs = top(drivers, (d) => d.dnfs);
  if (mostDnfs?.dnfs) highlights.push({ key: 'dnfs', label: 'Most retirements', value: String(mostDnfs.dnfs), detail: mostDnfs.name, driverCode: mostDnfs.code });
  const mostOneTwos = top(teams, (t) => t.oneTwos);
  if (mostOneTwos?.oneTwos) highlights.push({ key: 'onetwos', label: 'Most one-twos', value: String(mostOneTwos.oneTwos), detail: mostOneTwos.name, teamId: mostOneTwos.teamId });
  const sprintWins = top(drivers, (d) => sprints.filter((r) => r.SprintResults?.find((x) => x.position === '1')?.Driver.driverId === d.driverId).length);
  const sw = sprintWins ? sprints.filter((r) => r.SprintResults?.find((x) => x.position === '1')?.Driver.driverId === sprintWins.driverId).length : 0;
  if (sprintWins && sw) highlights.push({ key: 'sprints', label: 'Most sprint wins', value: String(sw), detail: sprintWins.name, driverCode: sprintWins.code });

  return { rounds: run.length, drivers, teams, battles, highlights };
}
