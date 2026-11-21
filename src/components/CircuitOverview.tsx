import { useQuery } from '@tanstack/react-query';
import { getCircuit } from '../api/circuit';
import { getCircuitRecords, type Race, type RaceWithResults } from '../api/jolpica';
import { findMeeting } from '../api/openf1';
import { getSectorLines } from '../lib/sectorLines';
import { useSchedule } from '../hooks/useSeason';
import { driverHref, raceHref, teamHref } from '../lib/router';
import { teamColour } from '../lib/teams';
import { lapLengthKm } from '../lib/trackGeometry';
import { Loading } from './States';
import { TrackOutline } from './TrackOutline';

const secs = (t: string | undefined) => {
  if (!t) return Infinity;
  const [m, s] = t.includes(':') ? t.split(':') : ['0', t];
  return Number(m) * 60 + Number(s);
};

const TYPE: Record<string, string> = { Permanent: 'Permanent circuit', 'Temporary - Street': 'Street circuit', 'Temporary - Road': 'Temporary road course' };

/** Track overview for a race page: map, layout facts and the circuit's history. */
export function CircuitOverview({ race }: { race: Race }) {
  const circuitId = race.Circuit.circuitId;
  // OpenF1 starts in 2023: for older seasons, this year's race at the same circuit gives the circuit key.
  const current = useSchedule('current');
  const sameNow = (current.data ?? []).find((r) => r.Circuit.circuitId === circuitId);
  const meeting = useQuery({
    queryKey: ['meeting-for', race.season, race.round, sameNow?.date],
    enabled: !current.isLoading,
    staleTime: Infinity,
    queryFn: ({ signal }) => findMeeting([race.date, ...(sameNow ? [sameNow.date] : [])], signal),
  });
  const layout = useQuery({
    queryKey: ['circuit', meeting.data?.circuit_key, meeting.data?.year],
    enabled: !!meeting.data,
    staleTime: Infinity,
    queryFn: ({ signal }) => getCircuit(meeting.data!.circuit_key, meeting.data!.year, signal),
  });
  const sectorLines = useQuery({
    queryKey: ['sector-lines', meeting.data?.meeting_key],
    enabled: !!meeting.data,
    staleTime: Infinity,
    queryFn: ({ signal }) => getSectorLines(meeting.data!.meeting_key, signal),
  });
  const records = useQuery({ queryKey: ['circuit-records', circuitId], staleTime: 60 * 60_000, queryFn: () => getCircuitRecords(circuitId) });

  const c = layout.data;
  const length = c ? lapLengthKm(c) : null;
  const facts = records.data ? history(records.data.winners, records.data.fastest) : null;
  const poles = records.data?.poles ?? [];
  const loc = race.Circuit.Location;

  return (
    <section className="card" aria-labelledby="circuit">
      <div className="card-head">
        <div>
          <h2 className="h2" id="circuit">{race.Circuit.circuitName}</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {loc.locality}, {loc.country}
            {meeting.data?.circuit_type ? ` · ${TYPE[meeting.data.circuit_type] ?? meeting.data.circuit_type}` : ''}
          </div>
        </div>
        {loc.lat && loc.long && <a className="link" href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.long}#map=14/${loc.lat}/${loc.long}`} target="_blank" rel="noreferrer">
          Map of the area ↗
        </a>}
      </div>

      <div className="row top">
        <div className="w2" style={{ minWidth: 0 }}>
          {layout.data ? (
            <TrackOutline circuit={layout.data} sectorLines={sectorLines.data} label={`Layout of ${race.Circuit.circuitName}`} />
          ) : meeting.isLoading || layout.isLoading || current.isLoading ? (
            <Loading rows={6} />
          ) : (
            <div className="empty">No track layout available for this circuit.</div>
          )}
          {layout.data && (
            <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
              {sectorLines.data && (
                <span className="legend" style={{ display: 'inline-flex', marginRight: 10 }}>
                  <span><i className="sw" style={{ background: 'var(--s1)' }} />S1</span>
                  <span><i className="sw" style={{ background: 'var(--s2)' }} />S2</span>
                  <span><i className="sw" style={{ background: 'var(--s3)' }} />S3</span>
                </span>
              )}
              Numbers are turns; the red arrow shows the direction of travel.{sectorLines.data ? ' Sector lines placed from the fastest lap of that weekend.' : ''} Layout: MultiViewer.
            </div>
          )}
        </div>

        <div className="w3" style={{ minWidth: 0 }}>
          <div className="circuit-facts">
            <Fact l="Lap length" v={length ? `≈ ${length.toFixed(2)} km` : '-'} note="Measured along the recorded track outline, so it can differ slightly from the official figure" />
            <Fact l="Turns" v={c ? String(c.corners.length) : '-'} />
            <Fact l="Race laps" v={facts?.laps ? String(facts.laps) : '-'} note={facts?.lapsSeason ? `Laps run in the ${facts.lapsSeason} race` : undefined} />
            <Fact l="Race distance" v={facts?.laps && length ? `≈ ${(facts.laps * length).toFixed(0)} km` : '-'} note="Race laps × measured lap length" />
            <Fact l="Pit stop time loss" v={c?.pitLoss?.normal ? `${Number(c.pitLoss.normal).toFixed(1)} s` : '-'} note="Estimated time lost making a pit stop (MultiViewer). Under a safety car or virtual safety car the field is slower, so a stop costs less." sub={c?.pitLoss?.sc ? `SC ${Number(c.pitLoss.sc).toFixed(1)} s · VSC ${Number(c.pitLoss.vsc).toFixed(1)} s` : undefined} />
            <Fact l="First Grand Prix" v={facts?.first ?? '-'} />
            <Fact l="Grands Prix held" v={facts ? String(facts.count) : '-'} />
            <Fact l="Won from pole" v={facts ? `${facts.fromPole} of ${facts.count}` : '-'} />
            <Fact l="Won from furthest back" v={facts?.furthest ?? '-'} />
          </div>

          {records.isLoading ? <Loading rows={3} /> : facts && (
            <div className="circuit-records">
              {facts.record && (
                <div className="inset" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }} title="Race laps only; Jolpica records fastest laps from 2004. The layout may have changed over the years.">Fastest race lap on record</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="mono tone-overall" style={{ fontSize: 18, fontWeight: 700 }}>{facts.record.time}</span>{' '}
                    <Who r={facts.record.race} /> <span className="faint">({facts.record.race.season})</span>
                  </div>
                </div>
              )}
              <div className="inset" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>Most wins here</div>
                <div style={{ marginTop: 4 }}>{facts.topDrivers}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Most successful team</div>
                <div style={{ marginTop: 4 }}>{facts.topTeams}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {records.data && records.data.winners.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 className="h2 sm" style={{ marginBottom: 8 }}>Recent winners</h3>
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>Season</th><th>Winner</th><th>Team</th><th className="r">Grid</th><th>Pole</th></tr></thead>
              <tbody>
                {[...records.data.winners].reverse().slice(0, 6).map((w) => {
                  const p = poles.find((x) => x.season === w.season)?.QualifyingResults?.[0];
                  const r = w.Results![0];
                  return (
                    <tr key={w.season}>
                      <td className="mono"><a className="name-link" style={{ fontWeight: 400 }} href={raceHref(w.round, w.season)}>{w.season}</a></td>
                      <td><Who r={w} /></td>
                      <td><span className="team-bar" style={{ display: 'inline-block', width: 3, height: 14, marginRight: 8, verticalAlign: 'middle', background: teamColour(r.Constructor.constructorId) }} /><a className="name-link" style={{ fontWeight: 400 }} href={teamHref(r.Constructor.constructorId)}>{r.Constructor.name}</a></td>
                      <td className="r mono">{r.grid === '0' ? 'Pit lane' : `P${r.grid}`}</td>
                      <td>{p ? (p.Driver.code ? <a className="name-link" style={{ fontWeight: 400 }} href={driverHref(p.Driver.code)}>{p.Driver.givenName} {p.Driver.familyName}</a> : `${p.Driver.givenName} ${p.Driver.familyName}`) : <span className="faint">-</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>History from Jolpica-F1 (all Grands Prix held here); circuit type from OpenF1.</div>
    </section>
  );
}

function Fact({ l, v, note, sub }: { l: string; v: string; note?: string; sub?: string }) {
  return (
    <div className="stat inset" title={note}>
      <div className="l">{l.toUpperCase()}</div>
      <div className="v" style={{ fontSize: 20 }}>{v}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Who({ r }: { r: RaceWithResults }) {
  const d = r.Results?.[0]?.Driver;
  if (!d) return null;
  return d.code ? <a className="name-link" href={driverHref(d.code)}>{d.givenName} {d.familyName}</a> : <span style={{ fontWeight: 600 }}>{d.givenName} {d.familyName}</span>;
}

function history(winners: RaceWithResults[], fastest: RaceWithResults[]) {
  const won = winners.filter((w) => w.Results?.[0]);
  const count = won.length;
  const tally = (key: (w: RaceWithResults) => string) => {
    const m = new Map<string, number>();
    for (const w of won) m.set(key(w), (m.get(key(w)) ?? 0) + 1);
    const max = Math.max(0, ...m.values());
    const names = [...m.entries()].filter(([, n]) => n === max).map(([k]) => k);
    return max ? `${names.join(', ')} · ${max} win${max > 1 ? 's' : ''}` : '-';
  };
  const grids = won.map((w) => ({ w, g: Number(w.Results![0].grid) }));
  const fromPole = grids.filter((x) => x.g === 1).length;
  const back = grids.filter((x) => x.g >= 1).sort((a, b) => b.g - a.g)[0];
  const pitLane = grids.find((x) => x.g === 0);
  const latest = won[won.length - 1];
  let record: { time: string; race: RaceWithResults } | null = null;
  for (const f of fastest) {
    const t = f.Results?.[0]?.FastestLap?.Time?.time;
    if (t && (!record || secs(t) < secs(record.time))) record = { time: t, race: f };
  }
  const nameOf = (w: RaceWithResults) => `${w.Results![0].Driver.givenName} ${w.Results![0].Driver.familyName}`;
  return {
    count,
    first: won[0]?.season ?? null,
    fromPole,
    furthest: pitLane ? `Pit lane (${nameOf(pitLane.w)}, ${pitLane.w.season})` : back ? `P${back.g} (${nameOf(back.w)}, ${back.w.season})` : null,
    laps: latest ? Number(latest.Results![0].laps) || null : null,
    lapsSeason: latest?.season ?? null,
    topDrivers: tally(nameOf),
    topTeams: tally((w) => w.Results![0].Constructor.name),
    record,
  };
}
