import { useQuery } from '@tanstack/react-query';
import { openf1, type CarLocation, type Lap } from '../api/openf1';
import { usePoll } from '../hooks/usePoll';

/**
 * Live position on track. The outline is the driver's own path over one
 * completed lap; the dot is their latest reported position.
 */
export function TrackMap({ sessionKey, driverNumber, laps, colour, live }: { sessionKey: number; driverNumber: number; laps: Lap[]; colour: string; live: boolean }) {
  // Use a recent full lap that was not a pit out-lap to draw the circuit.
  const ref = [...laps]
    .filter((l) => l.driver_number === driverNumber && l.lap_duration && l.date_start && !l.is_pit_out_lap)
    .sort((a, b) => b.lap_number - a.lap_number)
    .slice(0, 2)
    .pop();
  const outline = useQuery({
    queryKey: ['outline', sessionKey, driverNumber, ref?.lap_number],
    enabled: !!ref,
    staleTime: Infinity,
    queryFn: () => {
      const start = Date.parse(ref!.date_start!);
      return openf1<CarLocation>('location', {
        session_key: sessionKey,
        driver_number: driverNumber,
        'date>': new Date(start).toISOString(),
        'date<': new Date(start + ref!.lap_duration! * 1000).toISOString(),
      });
    },
  });
  const dot = usePoll<CarLocation | null>(
    `dot-${sessionKey}-${driverNumber}-${live}`,
    async (prev, signal) => {
      const rows = await openf1<CarLocation>('location', { session_key: sessionKey, driver_number: driverNumber, 'date>': new Date(Date.now() - 8_000).toISOString() }, signal);
      return rows.length ? rows[rows.length - 1] : (prev ?? null);
    },
    live ? 4_000 : 0,
  );

  const pts = (outline.data ?? []).filter((p) => p.x !== 0 || p.y !== 0);
  if (!ref) return <div className="empty">The map appears after your driver completes a couple of laps.</div>;
  if (outline.isLoading) return <div className="skeleton" style={{ height: 220 }} aria-label="Loading map" />;
  if (pts.length < 20) return <div className="empty">Not enough position data to draw the circuit yet.</div>;

  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 400, H = 260, pad = 16;
  const scale = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * scale) / 2, oy = (H - (maxY - minY) * scale) / 2;
  const px = (x: number) => ox + (x - minX) * scale;
  const py = (y: number) => H - (oy + (y - minY) * scale);
  const d = dot.data;

  return (
    <svg role="img" aria-label="Circuit map with your driver's current position" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 340, display: 'block', margin: '0 auto' }}>
      <polyline points={pts.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')} fill="none" stroke="#3a414d" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      {d && (
        <>
          <circle cx={px(d.x)} cy={py(d.y)} r={11} fill={colour} opacity={0.25} />
          <circle cx={px(d.x)} cy={py(d.y)} r={6} fill={colour} stroke="#fff" strokeWidth={2} />
        </>
      )}
    </svg>
  );
}
