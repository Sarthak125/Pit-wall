import { useQuery } from '@tanstack/react-query';
import {
  getConstructorStandings,
  getDriverStandings,
  getRaceResults,
  getSchedule,
  getSprintResults,
  type RaceWithResults,
} from '../api/jolpica';
import { openf1, type Session } from '../api/openf1';

const MIN = 60_000;

export function useSchedule(season: string) {
  return useQuery({ queryKey: ['schedule', season], queryFn: () => getSchedule(season), staleTime: 30 * MIN });
}

export function useDriverStandings(season: string) {
  return useQuery({ queryKey: ['dstand', season], queryFn: () => getDriverStandings(season), staleTime: 10 * MIN, refetchInterval: 10 * MIN });
}

export function useConstructorStandings(season: string) {
  return useQuery({ queryKey: ['cstand', season], queryFn: () => getConstructorStandings(season), staleTime: 10 * MIN, refetchInterval: 10 * MIN });
}

export function useResults(season: string) {
  return useQuery({
    queryKey: ['results', season],
    queryFn: async () => {
      const [races, sprints] = await Promise.all([getRaceResults(season), getSprintResults(season)]);
      return { races, sprints };
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
