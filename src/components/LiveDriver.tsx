import { FiaText, FiaWhen } from './FiaText';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStartingGrid, openf1, type OF1Driver, type Overtake, type Position, type Session, type TeamRadio } from '../api/openf1';
import { useLiveTiming } from '../hooks/useLiveTiming';
import { usePoll } from '../hooks/usePoll';
import { ingestFavourite } from '../lib/alerts';
import { fmtLap, fmtSector } from '../lib/format';
import { summarisePenalties, summariseTrackLimits, trackStatus } from '../lib/raceControl';
import { href } from '../lib/router';
import { useSettings } from '../lib/settings';
import { teamColour, tyre } from '../lib/teams';
import { Empty, ErrorBox, Loading } from './States';
import { TrackMap } from './TrackMap';
import { RadioList } from './RadioList';

/** Live section of the My Driver page, shown while a session is running. */
export function LiveDriver({ session, code, alerts = true }: { session: Session; code: string; alerts?: boolean }) {
  const sk = session.session_key;
  const { trackMap } = useSettings();
  const drivers = useQuery({ queryKey: ['drv', sk], queryFn: () => openf1<OF1Driver>('drivers', { session_key: sk }), staleTime: 10 * 60_000 });
  const me = drivers.data?.find((d) => d.name_acronym === code);
  const num = me?.driver_number ?? null;
  const t = useLiveTiming(session, true, num);
  const isRace = /race|sprint/i.test(session.session_name) && !/qualifying|shootout/i.test(session.session_name);

  const radio = usePoll<TeamRadio[]>(num ? `radio-${sk}-${num}` : null, (_p, signal) => openf1('team_radio', { session_key: sk, driver_number: num ?? undefined }, signal), 30_000);
  const overtakes = usePoll<Overtake[]>(num && isRace ? `ot-${sk}` : null, (_p, signal) => openf1('overtakes', { session_key: sk }, signal), 30_000);
  const history = usePoll<Position[]>(num ? `ph-${sk}-${num}` : null, (_p, signal) => openf1('position', { session_key: sk, driver_number: num ?? undefined }, signal), 20_000);
  const grid = useQuery({
    queryKey: ['grid', sk],
    enabled: isRace && !!session,
    staleTime: 60 * 60_000,
    queryFn: ({ signal }) => getStartingGrid(session!, signal),
  });

  const idx = t.rows.findIndex((r) => r.driver.driver_number === num);
  const row = t.rows[idx];
  const ahead = idx > 0 ? t.rows[idx - 1] : undefined;
  const behind = idx >= 0 ? t.rows[idx + 1] : undefined;
  const gapAhead = typeof row?.interval === 'number' ? row.interval : null;
  const gapBehind = typeof behind?.interval === 'number' ? behind.interval : null;

  // Remember the gaps at each lap so the arrows show the change over the last lap.
  const [byLap, setByLap] = useState(() => new Map<number, { ahead: number | null; behind: number | null }>());
  const lap = row?.lapsDone ?? 0;
  useEffect(() => {
    if (lap && !byLap.has(lap)) setByLap((m) => new Map(m).set(lap, { ahead: gapAhead, behind: gapBehind }));
  }, [lap, byLap, gapAhead, gapBehind]);
  const prev = byLap.get(lap - 1);
  const trend = (now: number | null, before: number | null | undefined) => (now == null || before == null ? null : now - before);

  const myLaps = t.laps.filter((l) => l.driver_number === num && l.lap_duration).sort((a, b) => a.lap_number - b.lap_number);
  const myPits = t.pits.filter((p) => p.driver_number === num).sort((a, b) => a.lap_number - b.lap_number);
  const myMsgs = t.messages.filter((m) => num != null && m.cars.includes(num));
  const penalties = summarisePenalties(myMsgs).filter((p) => p.car === num);
  const deleted = summariseTrackLimits(myMsgs).find((l) => l.car === num)?.deleted ?? 0;
  const status = trackStatus([...t.messages].reverse());
  const positions = (history.data ?? []).map((p) => p.position);
  // A start position only means something in a race or sprint.
  const started = isRace ? (grid.data?.find((g) => g.driver_number === num)?.position ?? positions[0] ?? null) : null;
  const made = (overtakes.data ?? []).filter((o) => o.overtaking_driver_number === num).length;
  const lost = (overtakes.data ?? []).filter((o) => o.overtaken_driver_number === num).length;
  const colour = teamColour(me?.team_name, me?.team_colour);

  useEffect(() => {
    if (!alerts || !num || t.loading || !row) return;
    ingestFavourite({ sessionKey: sk, code, position: row.position, pits: row.pits, messages: myMsgs });
  }, [alerts, sk, code, num, t.loading, row, myMsgs]);

  if (drivers.isLoading || t.loading) return <section className="card live-card"><Loading rows={4} /></section>;
  if (drivers.error) return <ErrorBox error={drivers.error} what="live data" />;
  if (!num) return null;
  const ty = tyre(row?.stint?.compound);

  return (
    <section className="card live-card" aria-labelledby="live-now">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px' }}>
        <span className="pill tone-solid" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, letterSpacing: 1 }}>
          <span className="dot live-dot on" style={{ background: '#fff' }} />
          LIVE
        </span>
        <h2 className="h2" id="live-now" style={{ fontSize: 26 }}>
          {session.location} · {session.session_name}
        </h2>
        {lap > 0 && <span className="mono muted">Lap {lap}</span>}
        {status && (
          <span className={`pill tone-${status.tone}`}>
            <span className="dot" />
            {status.label}
          </span>
        )}
        <a className="link" href={href('live')} style={{ marginLeft: 'auto' }}>Full timing →</a>
      </div>
      {t.error ? <ErrorBox error={t.error} what="live timing" /> : null}

      <div className="live-grid">
        <div className="inset" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, gridColumn: 'span 2' }}>
          <div className="pos-big">{row?.position ? `P${row.position}` : '-'}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            {started != null && <div className="muted">Started P{started}</div>}
            <div className="muted">{isRace ? 'Gap to leader' : 'Best lap'}</div>
            <div className="mono" style={{ fontSize: 18 }}>
              {isRace ? (idx === 0 ? 'Leader' : typeof row?.gap === 'number' ? `+${row.gap.toFixed(3)}` : (row?.gap ?? '-')) : fmtLap(row?.bestLap)}
            </div>
          </div>
        </div>
        {isRace && <NeighbourTile label="Car ahead" code={ahead?.driver.name_acronym} colour={ahead?.colour} gap={gapAhead} change={trend(gapAhead, prev?.ahead)} goodWhenSmaller />}
        {isRace && <NeighbourTile label="Car behind" code={behind?.driver.name_acronym} colour={behind?.colour} gap={gapBehind} change={trend(gapBehind, prev?.behind)} />}
        <div className="inset" style={{ padding: '14px 16px' }}>
          <div className="kicker" style={{ fontSize: 11 }}>Tyre</div>
          <div className="who" style={{ gap: 8, marginTop: 6 }}>
            <span className="tyre" style={{ borderColor: ty.colour }}>{ty.letter}</span>
            <span>{ty.name}</span>
          </div>
          <div className="mono" style={{ fontSize: 22, marginTop: 4 }}>
            {row?.tyreAge ?? '-'}
            <span className="muted" style={{ fontSize: 12 }}> laps old</span>
          </div>
        </div>
        <div className="inset" style={{ padding: '14px 16px' }}>
          <div className="kicker" style={{ fontSize: 11 }}>{isRace ? 'Pit stops' : 'Pit visits'}</div>
          <div className="mono" style={{ fontSize: 22, marginTop: 6 }}>{myPits.length}</div>
          {myPits.length > 0 && (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {myPits.map((p) => `Lap ${p.lap_number}${isRace && (p.lane_duration ?? p.pit_duration) ? ` · ${(p.lane_duration ?? p.pit_duration)!.toFixed(1)}s` : ''}`).join(', ')}
            </div>
          )}
        </div>
        {isRace && (
          <div className="inset" style={{ padding: '14px 16px' }}>
            <div className="kicker" style={{ fontSize: 11 }}>Overtakes</div>
            <div className="mono" style={{ fontSize: 22, marginTop: 6 }}>
              <span className="delta-up">+{made}</span> <span className="delta-down">-{lost}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Made / lost, as recorded by OpenF1</div>
          </div>
        )}
      </div>

      <div className="row">
        <div className="inset w3" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Lap times</span>
            {row?.lastLap && (
              <span className="muted" style={{ fontSize: 12 }}>
                Last <span className={`mono tone-${row.lastLapTone === 'slower' ? 'none' : row.lastLapTone}`}>{fmtLap(row.lastLap.lap_duration)}</span> · Best{' '}
                <span className="mono">{fmtLap(row.bestLap)}</span> ·{' '}
                {[row.lastLap.duration_sector_1, row.lastLap.duration_sector_2, row.lastLap.duration_sector_3].map((s, k) => (
                  <span key={k}>
                    S{k + 1} <span className={`mono tone-${row.sectorTone[k]}`}>{fmtSector(s)}</span>{' '}
                  </span>
                ))}
              </span>
            )}
          </div>
          <LapChart laps={myLaps.map((l) => ({ lap: l.lap_number, t: l.lap_duration! }))} pitLaps={isRace ? myPits.map((p) => p.lap_number) : []} colour={colour} joined={isRace} />
        </div>
        <div className="inset w2" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>Car data</span>
          {t.car ? (
            <>
              <div className="stat-grid three">
                <div><div className="muted" style={{ fontSize: 11 }}>SPEED</div><div className="mono" style={{ fontSize: 22 }}>{t.car.speed}</div></div>
                <div><div className="muted" style={{ fontSize: 11 }}>GEAR</div><div className="mono" style={{ fontSize: 22 }}>{t.car.n_gear}</div></div>
                <div><div className="muted" style={{ fontSize: 11 }}>RPM</div><div className="mono" style={{ fontSize: 22 }}>{(t.car.rpm / 1000).toFixed(1)}k</div></div>
              </div>
              <Bar label="Throttle" v={t.car.throttle} c="var(--green)" />
              <Bar label="Brake" v={t.car.brake} c="#F87171" />
            </>
          ) : (
            <span className="muted">No car data received yet.</span>
          )}
          {positions.length > 0 && (
            <div className="muted" style={{ fontSize: 12 }}>
              This session: {started != null ? `started P${started}, ` : ''}best P{Math.min(...positions)}, now P{row?.position ?? positions[positions.length - 1]}
            </div>
          )}
        </div>
      </div>

      {trackMap && (
        <div className="inset" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Track position</div>
          <TrackMap sessionKey={sk} driverNumber={num} laps={t.laps} colour={colour} live />
        </div>
      )}

      <div className="row">
        <div className="inset w3" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>FIA messages for {code}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {penalties.length ? `${penalties.length} penalt${penalties.length > 1 ? 'ies' : 'y'}` : 'No penalties'} · {deleted} lap time{deleted === 1 ? '' : 's'} deleted
            </span>
          </div>
          {myMsgs.length === 0 ? (
            <span className="muted">No messages about {code} this session.</span>
          ) : (
            myMsgs.slice(0, 6).map((m) => (
              <div className="msg" key={m.id}>
                <FiaWhen m={m} />
                <span className={`badge tone-${m.tone}`}>{m.label}</span>
                <FiaText m={m} />
              </div>
            ))
          )}
        </div>
        <div className="inset w2" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Team radio</div>
          <RadioList clips={radio.data ?? []} limit={6} />
        </div>
      </div>
      <div className="faint" style={{ fontSize: 12 }}>Updates every 10 to 30 seconds while this page is open.</div>
    </section>
  );
}

function NeighbourTile({ label, code, colour, gap, change, goodWhenSmaller = false }: { label: string; code?: string; colour?: string; gap: number | null; change: number | null; goodWhenSmaller?: boolean }) {
  // For the car ahead a shrinking gap is good; for the car behind a growing gap is good.
  const good = change == null ? null : goodWhenSmaller ? change < 0 : change > 0;
  return (
    <div className="inset" style={{ padding: '14px 16px' }}>
      <div className="kicker" style={{ fontSize: 11 }}>{label}</div>
      {code ? (
        <>
          <div className="who" style={{ gap: 8, marginTop: 6 }}>
            <span className="team-bar" style={{ height: 18, background: colour }} />
            <span className="code" style={{ fontSize: 18 }}>{code}</span>
          </div>
          <div className="mono" style={{ fontSize: 22, marginTop: 4 }}>
            {gap != null ? gap.toFixed(3) : '-'}
            {change != null && Math.abs(change) >= 0.05 && (
              <span className={good ? 'delta-up' : 'delta-down'} style={{ fontSize: 12 }} title="Change over the last lap">
                {' '}{change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="muted" style={{ marginTop: 8 }}>None</div>
      )}
    </div>
  );
}

function Bar({ label, v, c }: { label: string; v: number; c: string }) {
  const x = Math.max(0, Math.min(100, v));
  return (
    <div>
      <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="mono">{x}%</span>
      </div>
      <div className="meter" role="meter" aria-label={label} aria-valuenow={x} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${x}%`, background: c }} />
      </div>
    </div>
  );
}

/** Race laps are joined as a line; in practice and qualifying only fast laps are shown, as dots. */
function LapChart({ laps: all, pitLaps, colour, joined }: { laps: { lap: number; t: number }[]; pitLaps: number[]; colour: string; joined: boolean }) {
  const fastest = Math.min(...all.map((l) => l.t));
  const laps = joined ? all : all.filter((l) => l.t <= fastest + 3);
  if (laps.length < (joined ? 2 : 1)) return <Empty>The chart starts after two completed laps.</Empty>;
  const best = Math.min(...laps.map((l) => l.t));
  const top = best + 3; // Show laps within 3 seconds of the best; slower laps sit at the top edge.
  const maxLap = Math.max(...laps.map((l) => l.lap));
  const W = 600, H = 160, L = 52, R = 590, T = 16, B = 128;
  const x = (lap: number) => L + ((lap - 1) / Math.max(1, maxLap - 1)) * (R - L);
  const y = (t: number) => B - ((top - Math.min(t, top)) / 3) * (B - T);
  return (
    <svg role="img" aria-label="Lap time for each completed lap, pit stops marked" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <g fontFamily="JetBrains Mono, monospace" fontSize={10} fill="#7D8693">
        {[0, 1.5, 3].map((d) => (
          <g key={d}>
            <line x1={L} x2={R} y1={y(best + d)} y2={y(best + d)} stroke="#1F242C" />
            <text x={L - 6} y={y(best + d) + 3} textAnchor="end">{fmtLap(best + d).slice(0, -2)}</text>
          </g>
        ))}
        <text x={L} y={H - 8}>L1</text>
        <text x={R} y={H - 8} textAnchor="end">L{maxLap}</text>
        {pitLaps.map((p) => (
          <g key={p}>
            <line x1={x(p)} x2={x(p)} y1={T - 4} y2={B} stroke="#4A5260" strokeDasharray="3 3" />
            <text x={x(p)} y={T - 6} textAnchor="middle" fill="#A9B1BC">PIT</text>
          </g>
        ))}
      </g>
      {joined ? (
        <polyline points={laps.map((l) => `${x(l.lap).toFixed(1)},${y(l.t).toFixed(1)}`).join(' ')} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" />
      ) : (
        laps.map((l) => (
          <circle key={l.lap} cx={x(l.lap)} cy={y(l.t)} r={4} fill={colour}>
            <title>{`Lap ${l.lap}: ${fmtLap(l.t)}`}</title>
          </circle>
        ))
      )}
    </svg>
  );
}

