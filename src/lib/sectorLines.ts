import { openf1, type CarLocation, type Lap, type Session } from '../api/openf1';

/**
 * Where the two timing sector lines are on track, in layout coordinates. OpenF1 does not publish them, so this
 * takes the fastest clean lap of a weekend (qualifying if there was one) and finds where that car was when its
 * sector 1 and sector 2 times ended.
 */
export async function getSectorLines(meetingKey: number, signal?: AbortSignal): Promise<{ x: number; y: number }[] | null> {
  const sessions = await openf1<Session>('sessions', { meeting_key: meetingKey }, signal);
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
