/**
 * Jolpica-F1 (Ergast-compatible) client: calendar, results and standings.
 * Docs: https://github.com/jolpica/jolpica-f1
 */
import { fetchJson, RateLimiter } from './http';

const BASE = (import.meta.env.VITE_JOLPICA_BASE as string | undefined) ?? 'https://api.jolpi.ca/ergast/f1';

// Jolpica allows a small burst per second and a few hundred calls per hour.
// Its rate-limit replies carry no CORS header (the browser sees "Failed to fetch"),
// so the app stays well under the burst limit.
const limiter = new RateLimiter(2, 90);

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

export interface QualifyingResult {
  number: string;
  position: string;
  Driver: Driver;
  Constructor: Constructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface RaceWithQualifying extends Race {
  QualifyingResults?: QualifyingResult[];
}

const DAY = 24 * 60 * MIN;

/** Qualifying results of one season. Pass a driverId to get only that driver. */
export async function getQualifying(season: string, driverId?: string): Promise<RaceWithQualifying[]> {
  const path = driverId ? `${season}/drivers/${driverId}/qualifying` : `${season}/qualifying`;
  const races: RaceWithQualifying[] = [];
  let offset = 0;
  for (let page = 0; page < 20; page++) {
    const data = await fetchJson<MR<{ RaceTable: { Races: RaceWithQualifying[] } }>>(`${BASE}/${path}/?limit=100&offset=${offset}`, {
      limiter,
      cacheTtlMs: 15 * MIN,
    });
    for (const r of data.MRData.RaceTable.Races) {
      const existing = races.find((x) => x.round === r.round);
      if (existing) existing.QualifyingResults = [...(existing.QualifyingResults ?? []), ...(r.QualifyingResults ?? [])];
      else races.push({ ...r });
    }
    offset += Number(data.MRData.limit);
    if (offset >= Number(data.MRData.total)) break;
  }
  return races.sort((a, b) => Number(a.round) - Number(b.round));
}

/** Number of matching rows, read from the API's "total" with a 1-row request. */
async function countOf(path: string): Promise<number> {
  const data = await fetchJson<MR<object>>(`${BASE}/${path}/?limit=1`, { limiter, cacheTtlMs: DAY });
  return Number(data.MRData.total) || 0;
}

export interface CareerCounts {
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
}

/** Career counts, each read from the API's total with a 1-row request (5 to 6 requests). */
export async function getCareerCounts(driverId: string): Promise<CareerCounts> {
  const d = `drivers/${driverId}`;
  const [starts, wins, p2, p3, poles, fastestLaps] = await Promise.all([
    countOf(`${d}/results`),
    countOf(`${d}/results/1`),
    countOf(`${d}/results/2`),
    countOf(`${d}/results/3`),
    countOf(`${d}/qualifying/1`),
    countOf(`${d}/fastest/1/results`),
  ]);
  return { starts, wins, podiums: wins + p2 + p3, poles, fastestLaps };
}

export interface CareerTitles {
  titles: number;
  points: number;
  seasons: number;
  /** Seasons whose standings could not be loaded; their titles and points are left out. */
  missing: string[];
}

/**
 * Titles (completed seasons only) and career points, from each season's final
 * standings: one request per season, cached for a week for past seasons.
 */
export async function getCareerTitles(driverId: string, currentYear: number): Promise<CareerTitles> {
  const d = `drivers/${driverId}`;
  const seasonData = await fetchJson<MR<{ SeasonTable: { Seasons: { season: string }[] } }>>(`${BASE}/${d}/seasons/?limit=100`, {
    limiter,
    cacheTtlMs: DAY,
  });
  const seasons = seasonData.MRData.SeasonTable.Seasons.map((s) => s.season);
  let titles = 0;
  let points = 0;
  const missing: string[] = [];
  for (const season of seasons) {
    try {
      const st = await fetchJson<MR<{ StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } }>>(
        `${BASE}/${season}/${d}/driverstandings/`,
        { limiter, cacheTtlMs: Number(season) < currentYear ? 7 * DAY : 30 * MIN, retries: 3 },
      );
      const row = st.MRData.StandingsTable.StandingsLists[0]?.DriverStandings[0];
      if (!row) continue;
      points += Number(row.points) || 0;
      if (row.position === '1' && Number(season) < currentYear) titles++;
    } catch {
      missing.push(season);
    }
  }
  return { titles, points, seasons: seasons.length, missing };
}

/** A driver's Grand Prix results at one circuit, all seasons. */
export async function getCircuitHistory(circuitId: string, driverId: string): Promise<RaceWithResults[]> {
  const data = await fetchJson<MR<{ RaceTable: { Races: RaceWithResults[] } }>>(
    `${BASE}/circuits/${circuitId}/drivers/${driverId}/results/?limit=100`,
    { limiter, cacheTtlMs: DAY },
  );
  return data.MRData.RaceTable.Races;
}

/** A team's Grand Prix results at one circuit, all seasons (both cars). */
export async function getTeamCircuitHistory(circuitId: string, constructorId: string): Promise<RaceWithResults[]> {
  const data = await fetchJson<MR<{ RaceTable: { Races: RaceWithResults[] } }>>(
    `${BASE}/circuits/${circuitId}/constructors/${constructorId}/results/?limit=100`,
    { limiter, cacheTtlMs: DAY },
  );
  return data.MRData.RaceTable.Races;
}
