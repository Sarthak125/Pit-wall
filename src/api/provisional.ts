/**
 * Provisional results for the latest race weekend, between the chequered flag and Jolpica publishing it.
 *
 * Jolpica (results and standings) can take hours to add a race, and in the meantime its standings for the new round
 * are a copy of the previous one. OpenF1 has the official classification, with points, shortly after the session.
 * This builds Jolpica-shaped results and standings from it, so the standings, title chart, last race card, calendar
 * and race page show the race straight away, marked as provisional. As soon as Jolpica has the session, its own data
 * is used again.
 */
import {
  getConstructorStandingsAt,
  getDriverStandingsAt,
  getRaceResults,
  getSchedule,
  getSprintResults,
  type ConstructorStanding,
  type DriverStanding,
  type Race,
  type RaceWithResults,
  type Result,
} from './jolpica';
import { findMeeting, meetingSessions, openf1, type OF1Driver, type SessionResult } from './openf1';

const MIN = 60_000;
/** How long after the start a session's classification is expected (a race runs about 2 hours). */
const RACE_AFTER = 2 * 60 * MIN;
const SPRINT_AFTER = 50 * MIN;

export interface Provisional {
  season: string;
  round: number;
  raceName: string;
  /** Sessions filled in from OpenF1, for the note shown with them. */
  sessions: ('Race' | 'Sprint')[];
  race: RaceWithResults | null;
  sprint: RaceWithResults | null;
  drivers: { round: number; standings: DriverStanding[] };
  constructors: { round: number; standings: ConstructorStanding[] };
}

const at = (t?: { date: string; time?: string }) => (t?.date && t.time ? Date.parse(`${t.date}T${t.time}`) : NaN);

let memo: { key: string; at: number; p: Promise<Provisional | null> } | null = null;

/** Provisional data for the season's latest weekend, or null when Jolpica is up to date (or OpenF1 has nothing yet). */
export function getProvisional(season: string): Promise<Provisional | null> {
  // Only the season in progress can be missing a race.
  if (season !== 'current' && season !== String(new Date().getFullYear())) return Promise.resolve(null);
  const now = Date.now();
  // Shared by the standings, results and race page queries, and refreshed every 5 minutes.
  if (memo && memo.key === season && now - memo.at < 5 * MIN) return memo.p;
  const p = build(season, now).catch(() => null);
  memo = { key: season, at: now, p };
  return p;
}

async function build(season: string, now: number): Promise<Provisional | null> {
  const [schedule, races, sprints] = await Promise.all([getSchedule(season), getRaceResults(season), getSprintResults(season)]);
  // The latest weekend whose race or sprint should be over.
  const weekend = [...schedule]
    .reverse()
    .find((r) => now - at({ date: r.date, time: r.time }) > RACE_AFTER || now - at(r.Sprint) > SPRINT_AFTER);
  if (!weekend) return null;
  const has = (list: RaceWithResults[], key: 'Results' | 'SprintResults') => list.some((x) => x.round === weekend.round && (x[key]?.length ?? 0) > 0);
  const needRace = now - at({ date: weekend.date, time: weekend.time }) > RACE_AFTER && !has(races, 'Results');
  const needSprint = now - at(weekend.Sprint) > SPRINT_AFTER && !has(sprints, 'SprintResults');
  if (!needRace && !needSprint) return null;

  const meeting = await findMeeting([weekend.date]);
  if (!meeting) return null;
  const sessions = await meetingSessions(meeting.meeting_key);
  const round = Number(weekend.round);
  // Standings after the previous round: the base the new points are added to.
  const [baseDrivers, baseTeams] = await Promise.all([getDriverStandingsAt(season, round - 1), getConstructorStandingsAt(season, round - 1)]);

  const load = async (name: 'Race' | 'Sprint') => {
    const s = sessions.find((x) => x.session_name === name);
    if (!s) return null;
    // The grid comes from the qualifying session that set it (OpenF1 files the starting grid under it).
    const quali = sessions.find((x) => (name === 'Race' ? x.session_name === 'Qualifying' : /Sprint (Qualifying|Shootout)/.test(x.session_name)));
    const [results, drivers, grid] = await Promise.all([
      openf1<SessionResult>('session_result', { session_key: s.session_key }),
      openf1<OF1Driver>('drivers', { session_key: s.session_key }),
      quali ? openf1<{ driver_number: number; position: number }>('starting_grid', { session_key: quali.session_key }).catch(() => []) : Promise.resolve([]),
    ]);
    // Only a complete classification with points counts.
    if (!results.length || !results.some((r) => r.position === 1 && typeof r.points === 'number')) return null;
    return { results: toResults(results, drivers, baseDrivers.standings, new Map(grid.map((g) => [g.driver_number, g.position]))), drivers, sessionKey: s.session_key };
  };
  const raceLoad = needRace ? await load('Race') : null;
  const sprintLoad = needSprint ? await load('Sprint') : null;
  if (!raceLoad && !sprintLoad) return null;
  const raceResults = raceLoad?.results ?? null;
  const sprintResults = sprintLoad?.results ?? null;

  const race = raceResults ? { ...stripSessions(weekend), Results: raceResults } : null;
  const sprint = sprintResults ? { ...stripSessions(weekend), SprintResults: sprintResults } : null;
  // Everything this weekend has scored: provisional sessions plus any Jolpica already has (e.g. the sprint).
  const weekendResults = [
    ...(raceResults ?? races.find((x) => x.round === weekend.round)?.Results ?? []),
    ...(sprintResults ?? sprints.find((x) => x.round === weekend.round)?.SprintResults ?? []),
  ];
  const wonRace = raceResults?.find((r) => r.position === '1')?.Driver.driverId ?? races.find((x) => x.round === weekend.round)?.Results?.find((r) => r.position === '1')?.Driver.driverId;
  let driverTable = addDrivers(baseDrivers.standings, weekendResults, wonRace);
  let teamTable = addTeams(baseTeams.standings, weekendResults, raceResults ?? races.find((x) => x.round === weekend.round)?.Results ?? []);
  // OpenF1's own championship standings after the latest session, when it has them: its points and order (ties
  // included) replace the sums above. Wins still come from the results.
  const latest = raceLoad ?? sprintLoad!;
  try {
    const [champD, champT] = await Promise.all([
      openf1<ChampionshipDriver>('championship_drivers', { session_key: latest.sessionKey }),
      openf1<ChampionshipTeam>('championship_teams', { session_key: latest.sessionKey }),
    ]);
    driverTable = applyDriverChampionship(driverTable, champD, latest.drivers);
    teamTable = applyTeamChampionship(teamTable, champT, latest.drivers, weekendResults);
  } catch {
    // Not available (or OpenF1 busy): the sums from the results stand.
  }
  return {
    season,
    round,
    raceName: weekend.raceName,
    sessions: [...(raceResults ? (['Race'] as const) : []), ...(sprintResults ? (['Sprint'] as const) : [])],
    race,
    sprint,
    drivers: { round, standings: driverTable },
    constructors: { round, standings: teamTable },
  };
}

export interface ChampionshipDriver {
  driver_number: number;
  position_current: number | null;
  points_current: number | null;
}

export interface ChampionshipTeam {
  team_name: string;
  position_current: number | null;
  points_current: number | null;
}

/** OpenF1's driver standings applied to ours: matched by car number (via the session's drivers, then permanent number). */
export function applyDriverChampionship(table: DriverStanding[], champ: ChampionshipDriver[], drivers: OF1Driver[]): DriverStanding[] {
  if (!champ.some((c) => c.position_current === 1)) return table;
  const codeByNum = new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));
  const find = (n: number) => table.find((s) => (codeByNum.get(n) && s.Driver.code === codeByNum.get(n)) || s.Driver.permanentNumber === String(n));
  const placed = new Set<DriverStanding>();
  const out: DriverStanding[] = [];
  for (const c of [...champ].sort((a, b) => (a.position_current ?? 999) - (b.position_current ?? 999))) {
    const s = find(c.driver_number);
    if (!s || placed.has(s) || c.points_current == null) continue;
    placed.add(s);
    out.push({ ...s, points: String(c.points_current) });
  }
  // Anyone OpenF1 does not list keeps their own sum, in points order.
  for (const s of table) if (!placed.has(s)) out.push(s);
  return out.map((s, i) => ({ ...s, position: String(i + 1), positionText: String(i + 1) }));
}

/** OpenF1's team standings applied to ours: team names matched through the drivers who raced for each team. */
export function applyTeamChampionship(table: ConstructorStanding[], champ: ChampionshipTeam[], drivers: OF1Driver[], results: Result[]): ConstructorStanding[] {
  if (!champ.some((c) => c.position_current === 1)) return table;
  const idByCode = new Map(results.map((r) => [r.Driver.code ?? '', r.Constructor.constructorId]));
  const idByTeam = new Map<string, string>();
  for (const d of drivers) {
    const id = idByCode.get(d.name_acronym);
    if (d.team_name && id && !idByTeam.has(d.team_name)) idByTeam.set(d.team_name, id);
  }
  const placed = new Set<ConstructorStanding>();
  const out: ConstructorStanding[] = [];
  for (const c of [...champ].sort((a, b) => (a.position_current ?? 999) - (b.position_current ?? 999))) {
    const s = table.find((t) => t.Constructor.constructorId === idByTeam.get(c.team_name));
    if (!s || placed.has(s) || c.points_current == null) continue;
    placed.add(s);
    out.push({ ...s, points: String(c.points_current) });
  }
  for (const s of table) if (!placed.has(s)) out.push(s);
  return out.map((s, i) => ({ ...s, position: String(i + 1), positionText: String(i + 1) }));
}

function stripSessions(r: Race): Race {
  return { season: r.season, round: r.round, raceName: r.raceName, date: r.date, time: r.time, Circuit: r.Circuit };
}

/** OpenF1's classification as Jolpica results, matched to Jolpica's drivers and teams by three-letter code. */
export function toResults(results: SessionResult[], drivers: OF1Driver[], standings: DriverStanding[], grid?: Map<number, number>): Result[] {
  const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
  const byCode = new Map(standings.map((s) => [s.Driver.code ?? '', s]));
  // OpenF1 team name to Jolpica team, learnt from drivers who have driven for one team only. A driver who changed
  // team during the season is then credited to the team OpenF1 lists for this session.
  const teamOf = new Map<string, string>();
  for (const d of drivers) {
    const s = byCode.get(d.name_acronym);
    if (d.team_name && s?.Constructors.length === 1) teamOf.set(d.team_name, s.Constructors[0].constructorId);
  }
  const constructorFor = (s: DriverStanding | undefined, d: OF1Driver | undefined) =>
    s?.Constructors.find((c) => c.constructorId === teamOf.get(d?.team_name ?? '')) ?? s?.Constructors[s.Constructors.length - 1];
  const winner = results.find((r) => r.position === 1);
  const winnerLaps = winner?.number_of_laps ?? 0;
  const classified = [...results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || (b.number_of_laps ?? 0) - (a.number_of_laps ?? 0));
  return classified.map((r, i) => {
    const d = byNum.get(r.driver_number);
    const s = byCode.get(d?.name_acronym ?? '');
    const laps = r.number_of_laps ?? 0;
    const status = r.dsq ? 'Disqualified' : r.dns ? 'Did not start' : r.dnf ? 'Retired' : laps < winnerLaps ? `+${winnerLaps - laps} Lap${winnerLaps - laps > 1 ? 's' : ''}` : 'Finished';
    const gap = typeof r.gap_to_leader === 'number' ? r.gap_to_leader : null;
    const time = r === winner && typeof r.duration === 'number' ? clock(r.duration) : gap != null && gap > 0 && !r.dnf ? `+${gap.toFixed(3)}` : undefined;
    return {
      number: String(r.driver_number),
      position: String(r.position ?? i + 1),
      positionText: r.position != null ? String(r.position) : r.dsq ? 'D' : r.dns ? 'W' : 'R',
      points: String(r.points ?? 0),
      Driver: s?.Driver ?? { driverId: (d?.name_acronym ?? String(r.driver_number)).toLowerCase(), code: d?.name_acronym, givenName: d?.first_name ?? '', familyName: d?.last_name ?? d?.name_acronym ?? '' },
      Constructor: constructorFor(s, d) ?? { constructorId: (d?.team_name ?? 'unknown').toLowerCase().replace(/\s+/g, '_'), name: d?.team_name ?? '' },
      grid: grid?.has(r.driver_number) ? String(grid.get(r.driver_number)) : undefined,
      laps: String(laps),
      status,
      Time: time ? { time } : undefined,
    };
  });
}

function clock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = (sec % 60).toFixed(3).padStart(6, '0');
  return `${h}:${String(m).padStart(2, '0')}:${s}`;
}

export function addDrivers(base: DriverStanding[], results: Result[], raceWinner?: string): DriverStanding[] {
  const add = new Map<string, number>();
  for (const r of results) add.set(r.Driver.driverId, (add.get(r.Driver.driverId) ?? 0) + Number(r.points));
  const rows = base.map((s) => ({
    ...s,
    points: String(Number(s.points) + (add.get(s.Driver.driverId) ?? 0)),
    wins: String(Number(s.wins) + (s.Driver.driverId === raceWinner ? 1 : 0)),
  }));
  // A driver with no points before this round may be missing from the base standings.
  for (const r of results) {
    if (!rows.some((s) => s.Driver.driverId === r.Driver.driverId) && Number(r.points) > 0) {
      rows.push({ positionText: '', points: r.points, wins: r.Driver.driverId === raceWinner ? '1' : '0', Driver: r.Driver, Constructors: [r.Constructor] });
    }
  }
  return rank(rows, (s) => Number(s.points), (s) => Number(s.wins));
}

export function addTeams(base: ConstructorStanding[], results: Result[], raceResults: Result[]): ConstructorStanding[] {
  const add = new Map<string, number>();
  for (const r of results) add.set(r.Constructor.constructorId, (add.get(r.Constructor.constructorId) ?? 0) + Number(r.points));
  const winner = raceResults.find((r) => r.position === '1')?.Constructor.constructorId;
  const rows = base.map((s) => ({
    ...s,
    points: String(Number(s.points) + (add.get(s.Constructor.constructorId) ?? 0)),
    wins: String(Number(s.wins) + (s.Constructor.constructorId === winner ? 1 : 0)),
  }));
  return rank(rows, (s) => Number(s.points), (s) => Number(s.wins));
}

/** Sorted by points, then wins (a simplified countback), with positions filled in. */
function rank<T extends { position?: string; positionText: string }>(rows: T[], pts: (t: T) => number, wins: (t: T) => number): T[] {
  return [...rows]
    .sort((a, b) => pts(b) - pts(a) || wins(b) - wins(a) || Number(a.position ?? 99) - Number(b.position ?? 99))
    .map((r, i) => ({ ...r, position: String(i + 1), positionText: String(i + 1) }));
}
