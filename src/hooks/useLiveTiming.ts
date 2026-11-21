import { useMemo } from 'react';
import {
  openf1,
  type CarData,
  type Interval,
  type Lap,
  type OF1Driver,
  type Pit,
  type Position,
  type RaceControlMsg,
  type Session,
  type Stint,
  type Weather,
  type PitDetail,
} from '../api/openf1';
import { classify, type ClassifiedMsg } from '../lib/raceControl';
import { teamColour } from '../lib/teams';
import { usePoll } from './usePoll';

/** Poll intervals while a session is live, tuned to stay near 30 requests/minute. */
const LIVE_MS = { position: 10_000, intervals: 10_000, laps: 20_000, rc: 20_000, stints: 30_000, pit: 60_000, weather: 60_000, car: 10_000, drivers: 300_000 };

interface Latest<T> {
  byDriver: Map<number, T>;
  last: string | undefined;
}

function mergeLatest<T extends { driver_number: number; date: string }>(prev: Latest<T> | undefined, rows: T[]): Latest<T> {
  const byDriver = new Map(prev?.byDriver);
  let last = prev?.last;
  for (const r of rows) {
    const cur = byDriver.get(r.driver_number);
    if (!cur || cur.date <= r.date) byDriver.set(r.driver_number, r);
    if (!last || r.date > last) last = r.date;
  }
  return { byDriver, last };
}

const iso = (ms: number) => new Date(ms).toISOString();

export interface TimingRow {
  driver: OF1Driver;
  colour: string;
  position: number | null;
  gap: number | string | null;
  interval: number | string | null;
  lastLap: Lap | undefined;
  bestLap: number | null;
  lapsDone: number;
  sectorTone: ('overall' | 'personal' | 'slower' | 'none')[];
  lastLapTone: 'overall' | 'personal' | 'slower' | 'none';
  stint: Stint | undefined;
  /** Every stint so far, oldest first. */
  stints: Stint[];
  tyreAge: number | null;
  pits: number;
  /** Live: the newest lap row, still in progress, so sectors fill in as the car goes round. After the session: the best lap. */
  currentLap: Lap | undefined;
  currentSectorTone: ('overall' | 'personal' | 'slower' | 'none')[];
  status: 'IN PIT' | 'PIT OUT' | null;
  /** Live speed, throttle and brake, when the session is live. */
  car: CarData | undefined;
  /** Fastest speed-trap reading this session. */
  trapSpeed: number | null;
}

/** Last mini-sector code recorded on a lap. */
function lastSegment(l: Lap): number | null {
  const all = [...(l.segments_sector_1 ?? []), ...(l.segments_sector_2 ?? []), ...(l.segments_sector_3 ?? [])].filter((v): v is number => v != null && v > 0);
  return all.length ? all[all.length - 1] : null;
}

/** Whether a car is in the pit lane, or on its way out, from pit records and mini-sector codes. */
function pitStatus(mine: Lap[], pits: Pit[], t: number): TimingRow['status'] {
  const latest = mine[mine.length - 1];
  const p = pits.filter((x) => Date.parse(x.date) <= t).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (p) {
    const entered = Date.parse(p.date);
    const laterLap = mine.some((l) => l.date_start && Date.parse(l.date_start) > entered + 5_000);
    if (p.pit_duration != null ? t < entered + p.pit_duration * 1000 : !laterLap) return 'IN PIT';
  }
  if (!latest) return null;
  if (latest.lap_duration == null) {
    if (latest.is_pit_out_lap) {
      const segs = (latest.segments_sector_1 ?? []).filter((v): v is number => v != null && v > 0);
      return segs.length === 0 || segs.every((v) => v === 2064) ? 'IN PIT' : 'PIT OUT';
    }
    return null;
  }
  // The newest lap is finished and ended in the pit lane, with no lap after it: the car is in the garage.
  return lastSegment(latest) === 2064 ? 'IN PIT' : null;
}

export function useLiveTiming(session: Session | undefined, live: boolean, carDriver: number | null) {
  const sk = session?.session_key;
  const every = (ms: number) => (live ? ms : 0);
  const endMs = session ? Date.parse(session.date_end) : 0;

  const drivers = usePoll<OF1Driver[]>(sk ? `drv-${sk}` : null, (_p, signal) => openf1('drivers', { session_key: sk }, signal), every(LIVE_MS.drivers));

  const positions = usePoll<Latest<Position>>(
    sk ? `pos-${sk}-${live}` : null,
    async (prev, signal) => mergeLatest(prev, await openf1<Position>('position', { session_key: sk, 'date>': prev?.last }, signal)),
    every(LIVE_MS.position),
  );

  const intervals = usePoll<Latest<Interval>>(
    sk ? `int-${sk}-${live}` : null,
    async (prev, signal) => {
      // Intervals are published every few seconds, so only ask for recent rows.
      const since = prev?.last ?? iso(live ? Date.now() - 60_000 : endMs - 20 * 60_000);
      return mergeLatest(prev, await openf1<Interval>('intervals', { session_key: sk, 'date>': since }, signal));
    },
    every(LIVE_MS.intervals),
  );

  const laps = usePoll<Map<string, Lap>>(
    sk ? `laps-${sk}-${live}` : null,
    async (prev, signal) => {
      // Lap rows fill in as sectors complete, so re-read the last two laps each time.
      const maxLap = prev ? Math.max(0, ...[...prev.values()].map((l) => l.lap_number)) : 0;
      const rows = await openf1<Lap>('laps', { session_key: sk, 'lap_number>=': prev ? Math.max(1, maxLap - 1) : undefined }, signal);
      const next = new Map(prev);
      for (const l of rows) next.set(`${l.driver_number}-${l.lap_number}`, l);
      return next;
    },
    every(LIVE_MS.laps),
  );

  const raceControl = usePoll<RaceControlMsg[]>(
    sk ? `rc-${sk}-${live}` : null,
    async (prev, signal) => {
      const last = prev?.length ? prev[prev.length - 1].date : undefined;
      const rows = await openf1<RaceControlMsg>('race_control', { session_key: sk, 'date>': last }, signal);
      return [...(prev ?? []), ...rows].sort((a, b) => a.date.localeCompare(b.date));
    },
    every(LIVE_MS.rc),
  );

  const stints = usePoll<Stint[]>(sk ? `st-${sk}-${live}` : null, (_p, signal) => openf1('stints', { session_key: sk }, signal), every(LIVE_MS.stints));
  const pits = usePoll<Pit[]>(sk ? `pit-${sk}-${live}` : null, (_p, signal) => openf1('pit', { session_key: sk }, signal), every(LIVE_MS.pit));
  const weather = usePoll<Weather[]>(sk ? `wx-${sk}-${live}` : null, (_p, signal) => openf1('weather', { session_key: sk }, signal), every(LIVE_MS.weather));

  // Speed, throttle and brake for every car, in one request. Only while live: after the session the cars are parked.
  const cars = usePoll<Latest<CarData>>(
    sk && live ? `cars-${sk}` : null,
    async (prev, signal) => {
      const since = iso(Date.now() - 5_000);
      const rows = await openf1<CarData>('car_data', { session_key: sk, 'date>': prev?.last && prev.last > since ? prev.last : since }, signal);
      return mergeLatest(prev, rows);
    },
    LIVE_MS.car,
  );

  const messages: ClassifiedMsg[] = useMemo(
    () => (raceControl.data ?? []).map(classify).reverse(),
    [raceControl.data],
  );

  const rows: TimingRow[] = useMemo(() => {
    const list = drivers.data ?? [];
    const allLaps = [...(laps.data?.values() ?? [])];
    const best = (k: 'lap_duration' | 'duration_sector_1' | 'duration_sector_2' | 'duration_sector_3', ls: Lap[]) => {
      const vals = ls.map((l) => l[k]).filter((v): v is number => v != null && v > 0);
      return vals.length ? Math.min(...vals) : null;
    };
    const overall = {
      lap: best('lap_duration', allLaps),
      s: [best('duration_sector_1', allLaps), best('duration_sector_2', allLaps), best('duration_sector_3', allLaps)],
    };
    const tone = (v: number | null, pb: number | null, ob: number | null) =>
      v == null ? 'none' : ob != null && v <= ob ? 'overall' : pb != null && v <= pb ? 'personal' : 'slower';

    const out = list.map((d): TimingRow => {
      const mine = allLaps.filter((l) => l.driver_number === d.driver_number).sort((a, b) => a.lap_number - b.lap_number);
      const completed = mine.filter((l) => l.lap_duration != null);
      const lastLap = completed[completed.length - 1];
      const pbLap = best('lap_duration', mine);
      const pbS = [best('duration_sector_1', mine), best('duration_sector_2', mine), best('duration_sector_3', mine)];
      const myStints = (stints.data ?? []).filter((s) => s.driver_number === d.driver_number).sort((a, b) => a.stint_number - b.stint_number);
      const stint = myStints[myStints.length - 1];
      const lapsDone = mine.length ? mine[mine.length - 1].lap_number : 0;
      const tyreAge = stint ? (stint.tyre_age_at_start ?? 0) + Math.max(0, lapsDone - (stint.lap_start ?? lapsDone)) : null;
      const iv = intervals.data?.byDriver.get(d.driver_number);
      // Live: the lap in progress, so sectors fill in as the car goes round. Afterwards: the driver's best lap.
      const bestRow = completed.filter((l) => l.lap_duration === pbLap)[0];
      const currentLap = live ? mine[mine.length - 1] : (bestRow ?? mine[mine.length - 1]);
      const myPits = (pits.data ?? []).filter((p) => p.driver_number === d.driver_number);
      const traps = mine.map((l) => l.st_speed ?? 0).filter((v) => v > 0);
      return {
        driver: d,
        colour: teamColour(d.team_name, d.team_colour),
        position: positions.data?.byDriver.get(d.driver_number)?.position ?? null,
        gap: iv?.gap_to_leader ?? null,
        interval: iv?.interval ?? null,
        lastLap,
        bestLap: pbLap,
        lapsDone,
        lastLapTone: tone(lastLap?.lap_duration ?? null, pbLap, overall.lap),
        sectorTone: [0, 1, 2].map((i) =>
          tone(
            lastLap ? [lastLap.duration_sector_1, lastLap.duration_sector_2, lastLap.duration_sector_3][i] : null,
            pbS[i],
            overall.s[i],
          ),
        ),
        stint,
        stints: myStints,
        tyreAge,
        pits: myPits.length,
        currentLap,
        currentSectorTone: [0, 1, 2].map((i) =>
          tone(currentLap ? [currentLap.duration_sector_1, currentLap.duration_sector_2, currentLap.duration_sector_3][i] : null, pbS[i], overall.s[i]),
        ),
        // Once a session is over every car is parked, so the pit status only means something while live.
        status: live ? pitStatus(mine, myPits, Date.now()) : null,
        car: cars.data?.byDriver.get(d.driver_number),
        trapSpeed: traps.length ? Math.max(...traps) : null,
      };
    });
    return out.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  }, [drivers.data, laps.data, stints.data, intervals.data, positions.data, pits.data, cars.data, live, endMs]);

  const currentLap = rows.reduce((m, r) => Math.max(m, r.lapsDone), 0);
  const fastest = rows.reduce<number | null>((m, r) => (r.bestLap != null && (m == null || r.bestLap < m) ? r.bestLap : m), null);
  const latestWeather = weather.data?.length ? weather.data[weather.data.length - 1] : undefined;

  const errors = [drivers, positions, laps, raceControl].map((s) => s.error).filter(Boolean);
  const loading = drivers.loading || positions.loading;
  const updatedAt = Math.max(positions.updatedAt ?? 0, laps.updatedAt ?? 0, raceControl.updatedAt ?? 0) || null;

  return {
    rows,
    messages,
    stints: stints.data ?? [],
    weather: latestWeather,
    car: (carDriver != null ? cars.data?.byDriver.get(carDriver) : undefined) ?? null,
    currentLap,
    fastest,
    loading,
    error: errors[0] ?? null,
    updatedAt,
    driversByNumber: new Map((drivers.data ?? []).map((d) => [d.driver_number, d])),
    laps: [...(laps.data?.values() ?? [])],
    pits: (pits.data ?? []) as PitDetail[],
  };
}
