import { getCircuit, type Circuit } from '../api/circuit';
import { meetingSessions, openf1, type CarLocation, type Lap, type Meeting } from '../api/openf1';

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

/**
 * Sector lines for a weekend's circuit. Before the weekend has any laps (an upcoming race), they come from the most
 * recent earlier weekend at the same circuit, and `year` says which.
 */
export async function getSectorLinesFor(meeting: Pick<Meeting, 'meeting_key' | 'circuit_key' | 'date_start' | 'year'>, signal?: AbortSignal): Promise<{ lines: { x: number; y: number }[]; year: number } | null> {
  const own = await getSectorLines(meeting.meeting_key, signal);
  if (own) return { lines: own, year: meeting.year };
  const earlier = (await openf1<Meeting>('meetings', { circuit_key: meeting.circuit_key, 'date_start<': meeting.date_start }, signal))
    .sort((a, b) => b.date_start.localeCompare(a.date_start))
    .slice(0, 2);
  for (const m of earlier) {
    const lines = await getSectorLines(m.meeting_key, signal);
    if (lines) return { lines, year: m.year };
  }
  return null;
}

/**
 * A circuit's layout: MultiViewer's, or, for a circuit MultiViewer does not have yet (a new venue, or one F1 has not
 * raced at for years), an outline drawn from where a car actually went on the fastest lap of the weekend.
 */
export async function getLayout(circuitKey: number, year: number, meetingKey: number | undefined, signal?: AbortSignal): Promise<Circuit> {
  try {
    return await getCircuit(circuitKey, year, signal);
  } catch (err) {
    const recorded = meetingKey ? await recordedLayout(meetingKey, signal).catch(() => null) : null;
    if (recorded) return recorded;
    throw err;
  }
}

export async function recordedLayout(meetingKey: number, signal?: AbortSignal): Promise<Circuit | null> {
  const sessions = (await meetingSessions(meetingKey, signal)).filter((s) => Date.parse(s.date_start) < Date.now());
  const pick = sessions.find((s) => s.session_name === 'Qualifying') ?? sessions.find((s) => s.session_name === 'Race') ?? sessions[sessions.length - 1];
  if (!pick) return null;
  const laps = await openf1<Lap>('laps', { session_key: pick.session_key }, signal);
  const ref = laps.filter((l) => l.date_start && l.lap_duration && !l.is_pit_out_lap).sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
  if (!ref) return null;
  const t0 = Date.parse(ref.date_start!);
  const rows = await openf1<CarLocation>(
    'location',
    { session_key: pick.session_key, driver_number: ref.driver_number, 'date>': new Date(t0).toISOString(), 'date<': new Date(t0 + ref.lap_duration! * 1000).toISOString() },
    signal,
  );
  // Positions are in tenths of a metre; keep a point every 5 m or so.
  const pts: { x: number; y: number }[] = [];
  for (const r of rows) {
    if (!r.x && !r.y) continue;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(r.x - last.x, r.y - last.y) >= 50) pts.push({ x: r.x, y: r.y });
  }
  if (pts.length < 50) return null;
  return {
    x: pts.map((p) => p.x),
    y: pts.map((p) => p.y),
    // North up: geometry() turns by rotation + 180 degrees before flipping y for SVG.
    rotation: 180,
    corners: [],
    // The lap starts on the start/finish line, which the map marks at marshal sector 1.
    marshalSectors: [{ number: 1, angle: 0, length: 0, trackPosition: pts[0] }],
    recorded: true,
  };
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
export async function getRacePositions(meetingKey: number, sprint: boolean, signal?: AbortSignal): Promise<{ laps: number; traces: PositionTrace[]; lapRows: Lap[] } | null> {
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
  return { laps: total, traces, lapRows: laps };
}
