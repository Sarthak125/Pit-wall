/**
 * When the drivers' and constructors' championships were decided: the first round after which the leader could no
 * longer be caught, even if the rival scored the maximum in every remaining Grand Prix and sprint.
 *
 * Points come from the season's race and sprint results (the same results the title chart uses). A tie on points is
 * settled by countback (most wins first), so a title also counts as decided when the rival could at best draw level
 * on points without being able to pass the leader's number of wins.
 */
import type { Race, RaceWithResults } from '../api/jolpica';

/** Most points one driver can score: a Grand Prix win (no fastest-lap point since 2025) and a sprint win. */
const DRIVER_GP = 25;
const DRIVER_SPRINT = 8;
/** Most points one team can score: a one-two. */
const TEAM_GP = 25 + 18;
const TEAM_SPRINT = 8 + 7;

export interface TitleDecision {
  /** Jolpica id of the driver (driverId) or team (constructorId). */
  id: string;
  name: string;
  /** Driver's team id (drivers only). */
  teamId?: string;
  teamName?: string;
  points: number;
  /** Lead over second place now. */
  lead: number;
  /** Points still available to a rival now. */
  available: number;
  /** The round, and its race, after which the title could no longer be lost. */
  round: number;
  raceName: string;
  /** True when every round has been run. */
  seasonOver: boolean;
}

interface Totals {
  points: Map<string, number>;
  wins: Map<string, number>;
  names: Map<string, { name: string; teamId?: string; teamName?: string }>;
}

function decide(
  schedule: Race[],
  races: RaceWithResults[],
  sprints: RaceWithResults[],
  key: 'driver' | 'team',
): TitleDecision | null {
  const sprintRounds = new Set(schedule.filter((r) => r.Sprint).map((r) => r.round));
  const raceByRound = new Map(races.map((r) => [r.round, r]));
  const sprintByRound = new Map(sprints.map((r) => [r.round, r]));
  const t: Totals = { points: new Map(), wins: new Map(), names: new Map() };
  const add = (results: RaceWithResults['Results'], isRace: boolean) => {
    for (const r of results ?? []) {
      const id = key === 'driver' ? r.Driver.driverId : r.Constructor.constructorId;
      t.points.set(id, (t.points.get(id) ?? 0) + Number(r.points || 0));
      if (isRace && r.position === '1') t.wins.set(id, (t.wins.get(id) ?? 0) + 1);
      t.names.set(
        id,
        key === 'driver'
          ? { name: `${r.Driver.givenName} ${r.Driver.familyName}`, teamId: r.Constructor.constructorId, teamName: r.Constructor.name }
          : { name: r.Constructor.name },
      );
    }
  };
  const perGp = key === 'driver' ? DRIVER_GP : TEAM_GP;
  const perSprint = key === 'driver' ? DRIVER_SPRINT : TEAM_SPRINT;
  const rounds = [...schedule].sort((a, b) => Number(a.round) - Number(b.round));
  let decided: { round: number; raceName: string } | null = null;
  let last: ReturnType<typeof standing> | null = null;

  function standing(afterIdx: number) {
    const sorted = [...t.points.entries()].sort((a, b) => b[1] - a[1] || (t.wins.get(b[0]) ?? 0) - (t.wins.get(a[0]) ?? 0));
    const [leaderId, leaderPts] = sorted[0] ?? ['', 0];
    const left = rounds.slice(afterIdx + 1);
    const available = left.length * perGp + left.filter((r) => sprintRounds.has(r.round)).length * perSprint;
    // Could any rival still finish ahead? Level on points only counts if they could also have more wins.
    const catchable = sorted.slice(1).some(([id, pts]) => {
      const gap = leaderPts - pts;
      if (gap < available) return true;
      if (gap > available) return false;
      return (t.wins.get(id) ?? 0) + left.length >= (t.wins.get(leaderId) ?? 0);
    });
    return { leaderId, leaderPts, lead: leaderPts - (sorted[1]?.[1] ?? 0), available, catchable, seasonOver: left.length === 0 };
  }

  for (let i = 0; i < rounds.length; i++) {
    const race = raceByRound.get(rounds[i].round);
    // Only rounds whose Grand Prix has a result count; the next round is still to come.
    if (!race?.Results?.length) break;
    add(race.Results, true);
    add(sprintByRound.get(rounds[i].round)?.SprintResults, false);
    last = standing(i);
    if (!decided && !last.catchable) decided = { round: Number(rounds[i].round), raceName: rounds[i].raceName };
    // A leader who could still be caught later is not champion yet (does not happen once decided, but stay safe).
    if (last.catchable) decided = null;
  }
  if (!decided || !last || !last.leaderId) return null;
  const who = t.names.get(last.leaderId);
  return {
    id: last.leaderId,
    name: who?.name ?? last.leaderId,
    teamId: who?.teamId,
    teamName: who?.teamName,
    points: last.leaderPts,
    lead: last.lead,
    available: last.available,
    round: decided.round,
    raceName: decided.raceName,
    seasonOver: last.seasonOver,
  };
}

/** The drivers' and constructors' champions, if decided, and when. */
export function titleDecisions(schedule: Race[], races: RaceWithResults[], sprints: RaceWithResults[]) {
  return { driver: decide(schedule, races, sprints, 'driver'), team: decide(schedule, races, sprints, 'team') };
}
