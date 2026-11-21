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
  tyreAge: number | null;
  pits: number;
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

  const car = usePoll<CarData | null>(
    sk && carDriver ? `car-${sk}-${carDriver}-${live}` : null,
    async (prev, signal) => {
      const since = live ? iso(Date.now() - 20_000) : iso(endMs - 5 * 60_000);
      const rows = await openf1<CarData>('car_data', { session_key: sk, driver_number: carDriver ?? undefined, 'date>': prev?.date ?? since }, signal);
      return rows.length ? rows[rows.length - 1] : (prev ?? null);
    },
    every(LIVE_MS.car),
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
        tyreAge,
        pits: (pits.data ?? []).filter((p) => p.driver_number === d.driver_number).length,
      };
    });
    return out.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  }, [drivers.data, laps.data, stints.data, intervals.data, positions.data, pits.data]);

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
    car: car.data ?? null,
    currentLap,
    fastest,
    loading,
    error: errors[0] ?? null,
    updatedAt,
    driversByNumber: new Map((drivers.data ?? []).map((d) => [d.driver_number, d])),
  };
}
