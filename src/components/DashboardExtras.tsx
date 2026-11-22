import { ErrorBox } from './States';
import { OpenF1BlockedError } from '../lib/openf1Window';
import { useQuery } from '@tanstack/react-query';
import { getCircuitLaps, type Race } from '../api/jolpica';
import { isSessionLive } from '../api/openf1';
import { useNow } from '../hooks/usePoll';
import { useLatestSessions } from '../hooks/useSeason';
import { fmtDuration } from '../lib/format';
import { href, raceHref } from '../lib/router';
import { lapLengthKm } from '../lib/trackGeometry';
import { useCircuitLayout } from './CircuitOverview';
import { TrackOutline } from './TrackOutline';

/** A banner while any session of the current weekend is running, linking to Live Timing. */
export function LiveNowBanner() {
  const sessions = useLatestSessions();
  const now = useNow(1000);
  const live = (sessions.data ?? []).find((s) => isSessionLive(s, now));
  if (!live) return null;
  const started = now >= Date.parse(live.date_start);
  return (
    <a className="live-banner" href={href('live')}>
      <span className="pill tone-solid" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, letterSpacing: 1 }}>
        <span className="dot live-dot on" style={{ background: '#fff' }} />
        LIVE
      </span>
      <span style={{ fontWeight: 600 }}>{live.location} · {live.session_name} is {started ? 'running now' : 'about to start'}</span>
      {started && <span className="muted mono">{fmtDuration(now - Date.parse(live.date_start))}</span>}
      <span className="live-banner-cta">Open Live Timing →</span>
    </a>
  );
}

/** Next race's circuit: map with sectors and turns, and the key facts, linking to the full race and circuit page. */
export function NextRaceCircuit({ race }: { race: Race }) {
  const { layout, sectorLines, meeting } = useCircuitLayout(race);
  const laps = useQuery({
    queryKey: ['planned-laps', race.Circuit.circuitId, false],
    staleTime: Infinity,
    queryFn: () => getCircuitLaps(race.Circuit.circuitId, false),
  });
  const c = layout.data;
  const length = c ? lapLengthKm(c) : null;
  const type = meeting.data?.circuit_type === 'Temporary - Street' ? 'Street circuit' : meeting.data?.circuit_type === 'Temporary - Road' ? 'Temporary road course' : meeting.data?.circuit_type === 'Permanent' ? 'Permanent circuit' : null;
  return (
    <section className="card next-circuit" aria-labelledby="next-circuit">
      <div className="card-head">
        <div>
          <h2 className="h2" id="next-circuit">{race.Circuit.circuitName}</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{race.Circuit.Location.locality}, {race.Circuit.Location.country}{type ? ` · ${type}` : ''}</div>
        </div>
        <a className="link" href={raceHref(race.round)}>Circuit and race page →</a>
      </div>
      {c ? (
        // The map grows to fill the card, so it matches the height of the forecast and last race column beside it.
        <div className="next-circuit-map">
          <TrackOutline circuit={c} sectorLines={sectorLines.data} label={`Layout of ${race.Circuit.circuitName}`} />
        </div>
      ) : layout.isLoading || meeting.isLoading ? (
        <div className="empty">Loading the circuit…</div>
      ) : (
        meeting.error instanceof OpenF1BlockedError ? <ErrorBox error={meeting.error} what="the track layout" /> : <div className="empty">No track layout available for this circuit.</div>
      )}
      <div className="circuit-facts" style={{ marginTop: 10 }}>
        <div className="stat inset" title="Measured along the recorded track outline"><div className="l">LAP LENGTH</div><div className="v" style={{ fontSize: 18 }}>{length ? `≈ ${length.toFixed(2)} km` : '-'}</div></div>
        <div className="stat inset"><div className="l">TURNS</div><div className="v" style={{ fontSize: 18 }}>{c ? c.corners.length : '-'}</div></div>
        <div className="stat inset" title={laps.data ? `Laps run in the ${laps.data.season} race here` : undefined}><div className="l">RACE LAPS</div><div className="v" style={{ fontSize: 18 }}>{laps.data?.laps ?? '-'}</div></div>
      </div>
    </section>
  );
}
