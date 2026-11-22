import { useQuery } from '@tanstack/react-query';
import { getRainWatch } from '../api/weather';
import { fmtShortClock } from '../lib/format';

/**
 * Rain watch for a session in progress: will it rain at the circuit in the next 2 hours? A headline, 15-minute rain
 * bars and the next 3 hours' chance of rain, from Open-Meteo, refreshed every 10 minutes.
 */
export function RainWatch({ lat, long, compact = false }: { lat?: string; long?: string; compact?: boolean }) {
  const q = useQuery({
    queryKey: ['rain-watch', lat, long],
    enabled: !!lat && !!long,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    queryFn: ({ signal }) => getRainWatch(lat!, long!, signal),
  });
  if (!lat || !long) return null;
  if (q.error) return <div className="rain-watch muted" role="status">Rain watch: the weather service is not answering right now.</div>;
  if (!q.data) return <div className="rain-watch muted">Rain watch: loading…</div>;
  const { quarters, hours } = q.data;
  const now = Date.now();
  const next = quarters.filter((x) => x.t + 15 * 60_000 > now);
  // Light rain starts to matter for slick tyres from a few tenths of a millimetre per quarter hour.
  const wet = next.find((x) => x.mm >= 0.1);
  const maxChance = Math.max(0, ...hours.map((h) => h.chance ?? 0));
  const headline = wet
    ? wet.t <= now
      ? `Rain at the circuit now (${wet.mm.toFixed(1)} mm in 15 min)`
      : `Rain expected from about ${fmtShortClock(new Date(wet.t))}`
    : maxChance >= 40
      ? `No rain in the next 2 hours on the forecast, but a ${maxChance}% chance in the next 3`
      : 'No rain expected in the next 2 hours';
  const tone = wet ? 'wet' : maxChance >= 40 ? 'maybe' : 'dry';
  const top = Math.max(0.5, ...next.map((x) => x.mm));
  return (
    <div className={`rain-watch ${tone}${compact ? ' compact' : ''}`} role="status" aria-label={`Rain watch: ${headline}`}>
      <div className="rain-head">
        <span className="rain-dot" aria-hidden="true" />
        <strong>{headline}</strong>
      </div>
      <div className="rain-body">
        <div className="rain-bars" title="Rain in each 15 minutes (mm)">
          {next.slice(0, 8).map((x, i) => (
            <div key={x.t} className="rain-bar">
              <i style={{ height: `${Math.max(2, (x.mm / top) * 100)}%`, opacity: x.mm > 0 ? 1 : 0.25 }} />
              <span>{i % 2 === 0 ? barLabel(x.t) : '\u00a0'}</span>
            </div>
          ))}
        </div>
        <div className="rain-hours">
          {hours.map((h) => (
            <span key={h.t} title={`${fmtShortClock(new Date(h.t))}: ${h.chance ?? '?'}% chance, ${h.mm.toFixed(1)} mm`}>
              <span className="muted">{fmtShortClock(new Date(h.t))}</span> <b className="mono">{h.chance ?? '-'}%</b>
            </span>
          ))}
        </div>
      </div>
      {!compact && <div className="faint" style={{ fontSize: 11 }}>Forecast for the circuit from Open-Meteo, updated every 10 minutes. Not radar: showers can arrive earlier or later.</div>}
    </div>
  );
}

/** Hours and minutes in the viewer's clock style, without AM/PM, to fit under a bar. */
const clockParts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
function barLabel(t: number): string {
  return clockParts
    .formatToParts(new Date(t))
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .trim();
}
