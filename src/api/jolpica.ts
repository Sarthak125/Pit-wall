/**
 * Jolpica-F1 (Ergast-compatible) client: calendar, results and standings.
 * Docs: https://github.com/jolpica/jolpica-f1
 */
import { fetchJson, RateLimiter } from './http';

const BASE = (import.meta.env.VITE_JOLPICA_BASE as string | undefined) ?? 'https://api.jolpi.ca/ergast/f1';

// Jolpica allows a small burst per second and a few hundred calls per hour.
const limiter = new RateLimiter(3, 120);

const MIN = 60_000;

export interface SessionTime {
  date: string;
  time?: string;
}

export interface Race {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  Qualifying?: SessionTime;
  Sprint?: SessionTime;
  SprintQualifying?: SessionTime;
  SprintShootout?: SessionTime;
}

export interface Driver {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
  nationality?: string;
}

export interface DriverStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

export interface Result {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid?: string;
  laps?: string;
  status: string;
  Time?: { millis?: string; time: string };
  FastestLap?: { rank?: string; lap?: string; Time?: { time: string } };
}

export interface RaceWithResults extends Race {
  Results?: Result[];
  SprintResults?: Result[];
}

interface MR<T> {
  MRData: T & { total: string; limit: string; offset: string };
}

export async function getSchedule(season: string): Promise<Race[]> {
  const data = await fetchJson<MR<{ RaceTable: { Races: Race[] } }>>(`${BASE}/${season}/races/?limit=100`, {
    limiter,
    cacheTtlMs: 30 * MIN,
  });
  return data.MRData.RaceTable.Races;
}

export async function getDriverStandings(season: string) {
  const data = await fetchJson<
    MR<{ StandingsTable: { StandingsLists: { round: string; DriverStandings: DriverStanding[] }[] } }>
  >(`${BASE}/${season}/driverstandings/?limit=100`, { limiter, cacheTtlMs: 10 * MIN });
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return { round: list ? Number(list.round) : 0, standings: list?.DriverStandings ?? [] };
}

export async function getConstructorStandings(season: string) {
  const data = await fetchJson<
    MR<{ StandingsTable: { StandingsLists: { round: string; ConstructorStandings: ConstructorStanding[] }[] } }>
  >(`${BASE}/${season}/constructorstandings/?limit=100`, { limiter, cacheTtlMs: 10 * MIN });
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return { round: list ? Number(list.round) : 0, standings: list?.ConstructorStandings ?? [] };
}

/**
 * All race (or sprint) results of a season. The API pages results per
 * driver row (max 100), so this follows the pages and merges races.
 */
async function getAllResults(season: string, kind: 'results' | 'sprint'): Promise<RaceWithResults[]> {
  const key = kind === 'results' ? 'Results' : 'SprintResults';
  const byRound = new Map<string, RaceWithResults>();
  let offset = 0;
  for (let page = 0; page < 20; page++) {
    const data = await fetchJson<MR<{ RaceTable: { Races: RaceWithResults[] } }>>(
      `${BASE}/${season}/${kind}/?limit=100&offset=${offset}`,
      { limiter, cacheTtlMs: 15 * MIN },
    );
    for (const race of data.MRData.RaceTable.Races) {
      const existing = byRound.get(race.round);
      if (existing) {
        existing[key] = [...(existing[key] ?? []), ...(race[key] ?? [])];
      } else {
        byRound.set(race.round, { ...race });
      }
    }
    offset += Number(data.MRData.limit);
    if (offset >= Number(data.MRData.total)) break;
  }
  return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

export const getRaceResults = (season: string) => getAllResults(season, 'results');
export const getSprintResults = (season: string) => getAllResults(season, 'sprint');

/** Full name of a session field on a Race, for display. */
export const SESSION_FIELDS: { key: keyof Race; label: string }[] = [
  { key: 'FirstPractice', label: 'Practice 1' },
  { key: 'SecondPractice', label: 'Practice 2' },
  { key: 'ThirdPractice', label: 'Practice 3' },
  { key: 'SprintQualifying', label: 'Sprint Qualifying' },
  { key: 'SprintShootout', label: 'Sprint Shootout' },
  { key: 'Sprint', label: 'Sprint' },
  { key: 'Qualifying', label: 'Qualifying' },
];
