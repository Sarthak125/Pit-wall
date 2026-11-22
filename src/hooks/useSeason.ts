import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConstructorStandings,
  getDriverStandings,
  getRaceResults,
  getSchedule,
  getSprintResults,
  type Race,
  type RaceWithResults,
} from '../api/jolpica';
import { openf1, type Session } from '../api/openf1';
import { getProvisional, type Provisional } from '../api/provisional';

const MIN = 60_000;

export function useSchedule(season: string, enabled = true) {
  return useQuery({ queryKey: ['schedule', season], queryFn: () => getSchedule(season), staleTime: 30 * MIN, enabled });
}

/** Which race weekend the data includes provisionally (from OpenF1's classification), if any. */
export interface ProvisionalTag {
  provisional?: { raceName: string; sessions: Provisional['sessions'] };
}
const tag = (p: Provisional): ProvisionalTag => ({ provisional: { raceName: p.raceName, sessions: p.sessions } });

/**
 * The provisional lookup, but never holding up Jolpica's data for more than a few seconds (OpenF1 can be slow, down,
 * paused or busy with the page's other requests). If it finishes later, `late` refreshes the query that gave up on it.
 */
export function provisionalSoon(season: string, late: () => void): Promise<Provisional | null> {
  const lookup = getProvisional(season);
  let gaveUp = false;
  lookup.then((p) => {
    if (p && gaveUp) late();
  });
  return Promise.race([
    lookup,
    new Promise<null>((done) =>
      setTimeout(() => {
        gaveUp = true;
        done(null);
      }, 4000),
    ),
  ]);
}

/**
 * Between seasons. Jolpica moves its "current" season to the new year before that year's first race, and then has no
 * standings or results for it. Until the first race, standings-type data (standings, results, the title chart, the
 * champions) comes from the season before, tagged so pages can say so. The calendar stays on the new season.
 */
export interface OffseasonTag {
  offseason?: { shown: string; upcoming: string };
}

/** The year Jolpica's "current" season stands for. */
async function currentYear(): Promise<string> {
  const races = await getSchedule('current').catch(() => [] as Race[]);
  if (races[0]?.season) return races[0].season;
  const standings = await getDriverStandings('current').catch(() => null);
  return standings?.season || String(new Date().getFullYear());
}

export function useDriverStandings(season: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['dstand', season],
    queryFn: async () => {
      const late = () => qc.invalidateQueries({ queryKey: ['dstand', season] });
      const [jolpica, p] = await Promise.all([getDriverStandings(season), provisionalSoon(season, late)]);
      type Out = typeof jolpica & ProvisionalTag & OffseasonTag;
      if (p) return { ...p.drivers, season: jolpica.season, ...tag(p) } as Out;
      if (season === 'current' && !jolpica.standings.length) {
        const upcoming = jolpica.season || (await currentYear());
        const shown = String(Number(upcoming) - 1);
        const prev = await getDriverStandings(shown);
        if (prev.standings.length) return { ...prev, offseason: { shown, upcoming } } as Out;
      }
      return jolpica as Out;
    },
    staleTime: 10 * MIN,
    refetchInterval: 10 * MIN,
  });
}

export function useConstructorStandings(season: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['cstand', season],
    queryFn: async () => {
      const late = () => qc.invalidateQueries({ queryKey: ['cstand', season] });
      const [jolpica, p] = await Promise.all([getConstructorStandings(season), provisionalSoon(season, late)]);
      type Out = typeof jolpica & ProvisionalTag & OffseasonTag;
      if (p) return { ...p.constructors, season: jolpica.season, ...tag(p) } as Out;
      if (season === 'current' && !jolpica.standings.length) {
        const upcoming = jolpica.season || (await currentYear());
        const shown = String(Number(upcoming) - 1);
        const prev = await getConstructorStandings(shown);
        if (prev.standings.length) return { ...prev, offseason: { shown, upcoming } } as Out;
      }
      return jolpica as Out;
    },
    staleTime: 10 * MIN,
    refetchInterval: 10 * MIN,
  });
}

export function useResults(season: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['results', season],
    queryFn: async () => {
      const late = () => qc.invalidateQueries({ queryKey: ['results', season] });
      const [races, sprints, p] = await Promise.all([getRaceResults(season), getSprintResults(season), provisionalSoon(season, late)]);
      type Out = { races: RaceWithResults[]; sprints: RaceWithResults[] } & ProvisionalTag & OffseasonTag;
      if (!p) {
        if (season === 'current' && !races.some((r) => r.Results?.length)) {
          const upcoming = await currentYear();
          const shown = String(Number(upcoming) - 1);
          const [prevRaces, prevSprints] = await Promise.all([getRaceResults(shown), getSprintResults(shown)]);
          if (prevRaces.some((r) => r.Results?.length)) return { races: prevRaces, sprints: prevSprints, offseason: { shown, upcoming } } as Out;
        }
        return { races, sprints } as Out;
      }
      // The provisional sessions replace any empty entry Jolpica has for the round.
      const merge = (list: RaceWithResults[], add: RaceWithResults | null) =>
        add ? [...list.filter((r) => r.round !== add.round), add].sort((a, b) => Number(a.round) - Number(b.round)) : list;
      return { races: merge(races, p.race), sprints: merge(sprints, p.sprint), ...tag(p) } as Out;
    },
    staleTime: 15 * MIN,
  });
}

/** Sessions of the latest meeting on OpenF1, to find a live or recent session. */
export function useLatestSessions() {
  return useQuery({
    queryKey: ['of1-sessions-latest'],
    queryFn: async () => (await openf1<Session>('sessions', { meeting_key: 'latest' })).sort((a, b) => a.date_start.localeCompare(b.date_start)),
    staleTime: 2 * MIN,
    refetchInterval: 5 * MIN,
  });
}

export interface ProgressSeries {
  driverId: string;
  code: string;
  colour: string;
  /** Cumulative points after each round, index 0 = before round 1. */
  points: number[];
  /** Second car of a team: drawn dashed in the team colour. */
  dashed?: boolean;
}

/** Cumulative points (races plus sprints) per round for the given drivers. */
export function pointsProgression(races: RaceWithResults[], sprints: RaceWithResults[], driverIds: string[]): Map<string, number[]> {
  const rounds = Math.max(0, ...races.map((r) => Number(r.round)));
  const perRound = new Map<string, number[]>(driverIds.map((id) => [id, new Array(rounds + 1).fill(0)]));
  const add = (list: RaceWithResults[], key: 'Results' | 'SprintResults') => {
    for (const race of list) {
      const round = Number(race.round);
      if (round > rounds) continue;
      for (const res of race[key] ?? []) {
        const arr = perRound.get(res.Driver.driverId);
        if (arr) arr[round] += Number(res.points) || 0;
      }
    }
  };
  add(races, 'Results');
  add(sprints, 'SprintResults');
  for (const arr of perRound.values()) {
    for (let i = 1; i < arr.length; i++) arr[i] += arr[i - 1];
  }
  return perRound;
}
