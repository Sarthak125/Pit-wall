import { meetingSessions, openf1, type CarLocation, type Lap } from '../api/openf1';

/**
 * Where the two timing sector lines are on track, in layout coordinates. OpenF1 does not publish them, so this
 * takes the fastest clean lap of a weekend (qualifying if there was one) and finds where that car was when its
 * sector 1 and sector 2 times ended.
 */
export async function getSectorLines(meetingKey: number, signal?: AbortSignal): Promise<{ x: number; y: number }[] | null> {
  const sessions = await meetingSessions(meetingKey, signal);
  const pick = sessions.find((s) => s.session_name === 'Qualifying') ?? sessions.find((s) => s.session_name === 'Race') ?? sessions[sessions.length - 1];
  if (!pick) return null;
  const laps = await openf1<Lap>('laps', { session_key: pick.session_key }, signal);
  const ref = laps
    .filter((l) => l.date_start && l.duration_sector_1 && l.duration_sector_2 && l.lap_duration && !l.is_pit_out_lap)
    .sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
  if (!ref) return null;
  const t1 = Date.parse(ref.date_start!) + ref.duration_sector_1! * 1000;
  const t2 = t1 + ref.duration_sector_2! * 1000;
  const rows = await openf1<CarLocation>(
    'location',
    { session_key: pick.session_key, driver_number: ref.driver_number, 'date>': new Date(t1 - 2_000).toISOString(), 'date<': new Date(t2 + 2_000).toISOString() },
    signal,
  );
  const samples = rows.filter((r) => r.x || r.y).map((r) => ({ t: Date.parse(r.date), x: r.x, y: r.y }));
  const at = (t: number) => {
    let best = samples[0];
    for (const s of samples) if (Math.abs(s.t - t) < Math.abs(best.t - t)) best = s;
    return best ? { x: best.x, y: best.y } : null;
  };
  const p1 = samples.length ? at(t1) : null;
  const p2 = samples.length ? at(t2) : null;
  return p1 && p2 ? [p1, p2] : null;
}

export interface PositionTrace {
  driver: number;
  /** Position at the end of each lap; index 0 is the start. */
  positions: (number | null)[];
}

/**
 * Lap-by-lap positions for a race. OpenF1 records a row only when a position changes, so each driver's
 * position at the end of a lap is the last change at or before the moment that lap finished.
 */
export async function getRacePositions(meetingKey: number, sprint: boolean, signal?: AbortSignal): Promise<{ laps: number; traces: PositionTrace[] } | null> {
  const sessions = await meetingSessions(meetingKey, signal);
  const race = sessions.find((s) => (sprint ? s.session_name === 'Sprint' : s.session_name === 'Race'));
  if (!race) return null;
  const [pos, laps] = await Promise.all([
    openf1<{ date: string; driver_number: number; position: number }>('position', { session_key: race.session_key }, signal),
    openf1<Lap>('laps', { session_key: race.session_key }, signal),
  ]);
  if (!pos.length || !laps.length) return null;
  const byDriver = new Map<number, { t: number; p: number }[]>();
  for (const r of pos) {
    const list = byDriver.get(r.driver_number) ?? [];
    list.push({ t: Date.parse(r.date), p: r.position });
    byDriver.set(r.driver_number, list);
  }
  const total = Math.max(...laps.map((l) => l.lap_number));
  const traces: PositionTrace[] = [];
  for (const [driver, list] of byDriver) {
    list.sort((a, b) => a.t - b.t);
    const mine = laps.filter((l) => l.driver_number === driver && l.date_start).sort((a, b) => a.lap_number - b.lap_number);
    const at = (t: number) => {
      let p: number | null = null;
      for (const x of list) {
        if (x.t <= t) p = x.p;
        else break;
      }
      return p;
    };
    const positions: (number | null)[] = [list[0].p];
    for (let n = 1; n <= total; n++) {
      const lap = mine.find((l) => l.lap_number === n);
      if (!lap) {
        positions.push(null);
        continue;
      }
      const next = mine.find((l) => l.lap_number === n + 1);
      const end = next?.date_start ? Date.parse(next.date_start) : lap.lap_duration ? Date.parse(lap.date_start!) + lap.lap_duration * 1000 : null;
      positions.push(end != null ? at(end) : null);
    }
    traces.push({ driver, positions });
  }
  return { laps: total, traces };
}
