import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCircuitLaps } from '../api/jolpica';
import { getCircuit } from '../api/circuit';
import { useSchedule } from '../hooks/useSeason';
import { isSessionLive, liveEvery, type Lap, type OF1Driver, type Session } from '../api/openf1';
import { Empty, ErrorBox, Loading } from '../components/States';
import { FiaText, FiaWhen } from '../components/FiaText';
import { LiveTrackMap } from '../components/LiveTrackMap';
import { RadioCards } from '../components/RadioCards';
import { LiveStandings } from '../components/LiveStandings';
import { InvestigationsPanel, TrackLimitsPanel } from '../components/FiaPanels';
import { GapChart } from '../components/GapChart';
import { Footer } from '../components/Shell';
import { useNow } from '../hooks/usePoll';
import { useLatestSessions } from '../hooks/useSeason';
import { useLiveTiming, type TimingRow } from '../hooks/useLiveTiming';
import { fmtClock, fmtDuration, fmtGap, fmtLap, fmtSector, fmtShortClock, raceStart } from '../lib/format';
import {
  isMinor,
  openInvestigations,
  summarisePenalties,
  summariseTrackLimits,
  TABS,
  trackStatus,
  type ClassifiedMsg,
  type MsgTab,
} from '../lib/raceControl';
import { teamColour, tyre } from '../lib/teams';
import { StarIcon } from '../components/Icons';
import { useFavourite, useFavouriteTeam, type FavouriteTeam } from '../hooks/useFavourite';
import type { DriverLabel } from '../components/RadioList';
import { driverHref } from '../lib/router';
import { usePoll } from '../hooks/usePoll';
import { openf1, type TeamRadio } from '../api/openf1';
import { FlagIcon } from '../components/Icons';
import type React from 'react';
import { ingestFavourite } from '../lib/alerts';

export function LiveTiming() {
  const sessions = useLatestSessions();
  const now = useNow(1000);
  const [picked, setPicked] = useState<number | null>(null);

  const list = sessions.data ?? [];
  const defaultSession = list.find((s) => isSessionLive(s, now)) ?? [...list].reverse().find((s) => Date.parse(s.date_start) <= now) ?? list[0];
  const session = list.find((s) => s.session_key === picked) ?? defaultSession;
  const live = session ? isSessionLive(session, now) : false;

  const t = useLiveTiming(session, live, null);
  const fav = useFavourite();
  const favTeam = useFavouriteTeam();
  const teamNums = t.rows.filter((r) => favTeam?.codes.has(r.driver.name_acronym)).map((r) => r.driver.driver_number);
  const favNum = t.rows.find((r) => r.driver.name_acronym === fav?.code)?.driver.driver_number ?? null;

  useEffect(() => {
    if (!live || !session || !fav || favNum == null || t.loading) return;
    const me = t.rows.find((r) => r.driver.driver_number === favNum);
    ingestFavourite({ sessionKey: session.session_key, code: fav.code, position: me?.position ?? null, pits: me?.pits ?? 0, messages: t.messages.filter((m) => m.cars.includes(favNum)) });
  }, [live, session, fav, favNum, t.rows, t.messages, t.loading]);

  const status = useMemo(() => trackStatus([...t.messages].reverse()), [t.messages]);
  const isRace = /race|sprint/i.test(session?.session_name ?? '') && !/qualifying|shootout/i.test(session?.session_name ?? '');
  const isSprint = /sprint/i.test(session?.session_name ?? '');

  // Planned race distance: laps run by the winner of the latest race (or sprint) at this circuit.
  const schedule = useSchedule(session ? String(session.year) : 'current');
  const round = session
    ? (schedule.data ?? []).find((r) => {
        const d = raceStart(r)?.getTime() ?? Date.parse(r.date);
        return Math.abs(d - Date.parse(session.date_start)) < 4 * 86_400_000;
      })
    : undefined;
  // Pit stop time loss for this circuit (same layout data the track map uses, so it comes from cache).
  const layout = useQuery({
    queryKey: ['circuit', session?.circuit_key, session?.year],
    enabled: !!session?.circuit_key,
    staleTime: Infinity,
    queryFn: ({ signal }) => getCircuit(session!.circuit_key, session!.year, signal),
  });
  const pitLoss = layout.data?.pitLoss;
  const planned = useQuery({
    queryKey: ['planned-laps', round?.Circuit.circuitId, isSprint],
    enabled: isRace && !!round,
    staleTime: Infinity,
    queryFn: () => getCircuitLaps(round!.Circuit.circuitId, isSprint),
  });

  if (sessions.error) return <ErrorBox error={sessions.error} what="the session list" />;
  if (sessions.isLoading) return <Loading rows={10} />;
  if (!session) return <Empty>No sessions found on OpenF1 yet.</Empty>;

  const start = Date.parse(session.date_start);
  const elapsed = live ? now - start : Date.parse(session.date_end) - start;
  const remaining = Math.max(0, Date.parse(session.date_end) - now);
  const upcoming = now < start;
  const total = planned.data?.laps;
  const wx = t.weather;
  const compass = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];

  return (
    <>
      <section className="card session-bar" aria-label="Session">
        {live ? (
          <span className="pill tone-solid" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, letterSpacing: 1 }}>
            <span className="dot live-dot on" style={{ background: '#fff' }} />
            LIVE
          </span>
        ) : upcoming ? (
          <span className="pill" style={{ borderRadius: 6, padding: '6px 12px', background: '#14233a', color: '#8ab8ff' }}>
            UPCOMING
          </span>
        ) : (
          <span className="pill tone-grey" style={{ borderRadius: 6, padding: '6px 12px' }}>
            FINISHED
          </span>
        )}
        <div>
          <h1>
            {session.location} · {session.session_name}
          </h1>
          <label className="field" style={{ marginTop: 6 }}>
            <span className="sr-only">Session</span>
            <select className="select" value={session.session_key} onChange={(e) => setPicked(Number(e.target.value))}>
              {list.map((s: Session) => (
                <option key={s.session_key} value={s.session_key}>
                  {s.session_name} · {fmtShortClock(new Date(s.date_start))}
                  {isSessionLive(s, now) ? ' (live)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="metrics">
          <div className="metric" title={total ? `Planned distance: ${total} laps, as run in the ${planned.data!.season} ${isSprint ? 'sprint' : 'race'} here` : undefined}>
            <div className="l">LAP</div>
            <div className="v">
              {t.currentLap || '-'}
              {isRace && total ? <span className="faint">/{total}</span> : null}
            </div>
            {isRace && total && t.currentLap ? <div className="s">{Math.max(0, total - t.currentLap)} left</div> : null}
          </div>
          <div className="metric">
            <div className="l">{upcoming ? 'STARTS IN' : live ? (isRace ? 'ELAPSED' : 'TIME LEFT') : 'DURATION'}</div>
            <div className="v">{fmtDuration(upcoming ? start - now : live && !isRace ? remaining : elapsed)}</div>
          </div>
          {pitLoss?.normal && (
            <div className="metric" title="Estimated time lost making a pit stop (MultiViewer). Under a safety car or virtual safety car the field is slower, so a stop costs less.">
              <div className="l">PIT LOSS</div>
              <div className="v">{Number(pitLoss.normal).toFixed(1)}<span className="u"> s</span></div>
              <div className="s">
                {pitLoss.sc ? `SC ${Number(pitLoss.sc).toFixed(1)} s` : ''}
                {pitLoss.sc && pitLoss.vsc ? ' · ' : ''}
                {pitLoss.vsc ? `VSC ${Number(pitLoss.vsc).toFixed(1)} s` : ''}
              </div>
            </div>
          )}
          <div className="metric">
            <div className="l">TRACK</div>
            <div className="v">{wx ? `${wx.track_temperature.toFixed(1)}°C` : '-'}</div>
          </div>
          <div className="metric">
            <div className="l">AIR</div>
            <div className="v">{wx ? `${wx.air_temperature.toFixed(1)}°C` : '-'}</div>
          </div>
          <div className="metric">
            <div className="l">HUMIDITY</div>
            <div className="v">{wx ? `${Math.round(wx.humidity)}%` : '-'}</div>
          </div>
          <div className="metric">
            <div className="l">WIND</div>
            <div className="v">
              {wx ? (
                <>
                  {(wx.wind_speed * 3.6).toFixed(1)}
                  <span className="u"> km/h </span>
                  <span className="wind-dir" title={`From ${wx.wind_direction}°`}>
                    <span style={{ display: 'inline-block', transform: `rotate(${wx.wind_direction + 180}deg)` }}>↑</span> {compass(wx.wind_direction)}
                  </span>
                </>
              ) : '-'}
            </div>
          </div>
          <div className="metric">
            <div className="l">RAIN</div>
            <div className="v" style={{ color: wx?.rainfall ? '#4f9dff' : undefined }}>{wx ? (wx.rainfall ? 'Yes' : 'No') : '-'}</div>
          </div>
          <div className="metric">
            <div className="l">STATUS</div>
            <div style={{ marginTop: 4 }}>
              {status ? (
                <span className={`pill tone-${status.tone}`} style={{ fontSize: 13 }}>
                  <span className="dot" />
                  {status.label}
                </span>
              ) : (
                <span className="muted">-</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {t.error ? <ErrorBox error={t.error} what="live timing" /> : null}

      <div className="row top">
        <section className="card w3" style={{ padding: '16px 16px 8px' }} aria-labelledby="tower">
          <div className="card-head" style={{ padding: '0 8px' }}>
            <h2 className="h2" id="tower">
              Timing tower
            </h2>
            <div className="legend">
              <span><i className="sw" style={{ background: 'var(--purple)' }} />Overall best</span>
              <span><i className="sw" style={{ background: 'var(--green)' }} />Personal best</span>
              <span><i className="sw" style={{ background: 'var(--amber)' }} />Slower</span>
              <span><i className="sw" style={{ background: '#4f9dff' }} />Pit lane</span>
              {t.updatedAt && <span className="faint">Updated {fmtClock(new Date(t.updatedAt))}</span>}
            </div>
          </div>
          {t.loading ? <Loading rows={12} /> : t.rows.length === 0 ? <Empty>No timing data for this session yet.</Empty> : (
            <TimingTable rows={t.rows} isRace={isRace} live={live} upcoming={upcoming} fastest={t.fastest} favNum={favNum} team={favTeam} pitLoss={pitLoss} neutral={status?.label === 'Safety car' ? 'sc' : status?.label === 'Virtual safety car' ? 'vsc' : null} />
          )}
        </section>
      </div>

      {live && isRace && !upcoming && round && (
        <LiveStandings season={String(session.year)} round={Number(round.round)} sprint={isSprint} rows={t.rows} favCode={fav?.code} favTeam={favTeam?.id} />
      )}

      {isRace && !upcoming && (
        <section className="card tight" aria-labelledby="gaps">
          <div className="card-head">
            <h2 className="h2" id="gaps">Gap to leader</h2>
          </div>
          <GapChart laps={t.laps} drivers={t.driversByNumber} order={t.rows.map((r) => r.driver.driver_number)} favNum={favNum} />
        </section>
      )}

      <section className="card tight" aria-labelledby="map">
        <div className="card-head">
          <div>
            <h2 className="h2" id="map">Track map</h2>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{live ? 'Every car on track, moving live' : 'Replay where every car was during the session'} · tap a car for full stats</div>
          </div>
          <div className="legend">
            <span><i className="sw" style={{ background: '#f5c518' }} />Yellow flag</span>
            <span><i className="sw" style={{ background: '#ff9f1a' }} />Double yellow</span>
            <span><i className="sw" style={{ background: 'var(--amber)' }} />Safety car (dashed)</span>
            <span><i className="sw" style={{ background: 'var(--accent)' }} />Red flag</span>
          </div>
        </div>
        <LiveTrackMap session={session} live={live} drivers={[...t.driversByNumber.values()]} messages={t.messages} laps={t.laps} favNum={favNum} teamNums={teamNums} />
      </section>

      <RadioPanel session={session} live={live} drivers={t.driversByNumber} favNum={favNum} teamNums={teamNums} laps={t.laps} />
      <FiaSection messages={t.messages} drivers={t.driversByNumber} favNum={favNum} team={favTeam} teamNums={teamNums} isRace={isRace} />
      <Footer />
    </>
  );
}

const PILL: Record<NonNullable<TimingRow['status']>, string> = { 'IN PIT': 'in', 'PIT OUT': 'pitout', STOP: 'stop', RETIRED: 'ret', DNS: 'ret', DSQ: 'ret' };
const PILL_TITLE: Record<NonNullable<TimingRow['status']>, string> = {
  'IN PIT': 'In the pit lane or garage',
  'PIT OUT': 'On an out-lap after leaving the pits',
  STOP: 'Stopped out on track (0 km/h)',
  RETIRED: 'Retired from the session',
  DNS: 'Did not start',
  DSQ: 'Disqualified',
};

const SEG: Record<number, string> = { 2048: 'yellow', 2049: 'green', 2051: 'purple', 2064: 'pit' };

/** Mini-sector bar: one block per timing loop, coloured like the official timing screens. */
function Segments({ segs }: { segs: (number | null)[] | null | undefined }) {
  if (!segs?.length) return <div className="segs" aria-hidden="true" />;
  return (
    <div className="segs" aria-hidden="true">
      {segs.map((v, i) => <i key={i} className={v ? SEG[v] ?? 'none' : 'none'} />)}
    </div>
  );
}

function TimingTable({ rows, isRace, live, upcoming, fastest, favNum, team, pitLoss, neutral }: { rows: TimingRow[]; isRace: boolean; live: boolean; upcoming: boolean; fastest: number | null; favNum: number | null; team: FavouriteTeam | null; pitLoss?: { normal?: string; sc?: string; vsc?: string }; neutral: 'sc' | 'vsc' | null }) {
  // Where each car would rejoin if it pitted now: its gap to the leader plus the pit loss, placed among the other
  // cars' gaps. Under a safety car or VSC the field is slower, so the smaller neutralised loss applies.
  const loss = Number((neutral === 'sc' ? pitLoss?.sc : neutral === 'vsc' ? pitLoss?.vsc : pitLoss?.normal) ?? NaN);
  const showPit = live && isRace && !upcoming && Number.isFinite(loss);
  const gaps = rows.map((r, i) => ({ n: r.driver.driver_number, code: r.driver.name_acronym, g: i === 0 ? 0 : typeof r.gap === 'number' ? r.gap : null }));
  const rejoin = (i: number) => {
    const me = gaps[i];
    if (me.g == null || rows[i].status === 'IN PIT' || rows[i].status === 'RETIRED') return null;
    const t = me.g + loss;
    const others = gaps.filter((o, k) => k !== i && o.g != null) as { n: number; code: string; g: number }[];
    const ahead = others.filter((o) => o.g < t).sort((a, b) => b.g - a.g)[0];
    const behind = others.filter((o) => o.g >= t).sort((a, b) => a.g - b.g)[0];
    const pos = 1 + others.filter((o) => o.g < t).length;
    const traffic = (ahead && t - ahead.g < 1) || (behind && behind.g - t < 1);
    return { pos, ahead, behind, t, traffic: !!traffic };
  };
  // Before a race starts, the order is the starting grid and the gap column shows the qualifying lap.
  const onGrid = isRace && upcoming;
  return (
    <div className="scroll-x">
      <table className="tbl timing" style={{ minWidth: isRace ? 960 : 880 }}>
        <thead>
          <tr>
            <th>{onGrid ? 'GRID' : 'POS'}</th>
            <th>DRIVER</th>
            <th className="r">{onGrid ? 'QUALI LAP' : isRace ? 'GAP' : 'GAP (BEST)'}</th>
            {isRace && <th className="r">INT</th>}
            <th>LAST LAP</th>
            <th className="r">BEST</th>
            <th className="r" title={live ? 'Lap in progress' : 'Latest lap'}><i className="sec-dot" style={{ background: 'var(--s1)' }} />SECTOR 1</th>
            <th className="r"><i className="sec-dot" style={{ background: 'var(--s2)' }} />SECTOR 2</th>
            <th className="r"><i className="sec-dot" style={{ background: 'var(--s3)' }} />SECTOR 3</th>
            <th>TYRES</th>
            {isRace && <th className="r" title="Places gained or lost against the starting grid">DIFF</th>}
            {showPit && <th title={`Where the car would rejoin if it pitted now (pit loss ${loss.toFixed(1)} s${neutral ? ` under ${neutral === 'sc' ? 'safety car' : 'VSC'}` : ''}). Lapped cars are left out.`}>PIT NOW</th>}
            <th className="r" title="Current speed. Shows 0 when there is no live data.">SPEED</th>
            <th>PEDALS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const gap = onGrid ? fmtLap(r.gridLap) : isRace ? (i === 0 ? 'Leader' : fmtGap(r.gap)) : r.bestLap != null && fastest != null ? (i === 0 ? 'Fastest' : `+${(r.bestLap - fastest).toFixed(3)}`) : '-';
            const l = r.lastLap;
            const c = r.currentLap;
            const isTeam = team?.codes.has(r.driver.name_acronym);
            // Live car data only; with none (no live session, or nothing received yet) the car shows 0.
            const tel = live ? r.car : undefined;
            const speed = tel?.speed ?? 0;
            return (
              <tr key={r.driver.driver_number} className={[favNum === r.driver.driver_number ? 'fav' : '', isTeam ? 'team' : '', r.status === 'IN PIT' ? 'in-pit' : '', r.status === 'RETIRED' || r.status === 'DNS' || r.status === 'DSQ' ? 'out' : ''].join(' ').trim() || undefined} style={isTeam ? ({ '--team': team!.colour } as React.CSSProperties) : undefined}>
                <td className="mono muted">{r.position ?? '-'}</td>
                <td>
                  <div className="who">
                    <span className="team-bar" style={{ height: 20, background: r.colour }} />
                    <a className="code name-link" style={{ fontWeight: 700 }} href={driverHref(r.driver.name_acronym)} title={`${r.driver.name_acronym}: full stats`}>{r.driver.name_acronym}</a>
                    <span className="faint" style={{ fontSize: 11 }}>{r.driver.driver_number}</span>
                    {favNum === r.driver.driver_number && <span className="fav-star" aria-label="Favourite"><StarIcon filled size={14} /></span>}
                  </div>
                </td>
                <td className="r mono">{gap}</td>
                {isRace && <td className="r mono muted">{i > 0 && !onGrid ? fmtGap(r.interval) : '-'}</td>}
                <td>
                  {r.status ? (
                    <span className={`pit-pill ${PILL[r.status]}`} title={PILL_TITLE[r.status]}>{r.status}</span>
                  ) : (
                    <span className={`lap-pill tone-${r.lastLapTone === 'slower' ? 'none' : r.lastLapTone}`}>{fmtLap(l?.lap_duration)}</span>
                  )}
                </td>
                <td className="r">
                  {r.bestLap != null && fastest != null && r.bestLap === fastest ? (
                    <span className="lap-pill best" title="Fastest lap of the session">{fmtLap(r.bestLap)}</span>
                  ) : (
                    <span className="mono">{fmtLap(r.bestLap)}</span>
                  )}
                </td>
                {[1, 2, 3].map((k) => {
                  const dur = c ? [c.duration_sector_1, c.duration_sector_2, c.duration_sector_3][k - 1] : null;
                  const segs = c ? [c.segments_sector_1, c.segments_sector_2, c.segments_sector_3][k - 1] : null;
                  return (
                    <td key={k} className="r sector-cell">
                      <div className={`mono tone-${r.currentSectorTone[k - 1]}`}>{dur != null ? fmtSector(dur) : '\u00a0'}</div>
                      <Segments segs={segs} />
                    </td>
                  );
                })}
                <td>
                  <div className="tyre-hist">
                    {r.stints.length === 0 && <span className="faint">-</span>}
                    {r.stints.map((st, k) => {
                      const ty = tyre(st.compound);
                      const now = k === r.stints.length - 1;
                      // Tyre age when it came off (or now, for the current set), counting laps it had before this stint.
                      const age = now ? r.tyreAge : (st.tyre_age_at_start ?? 0) + Math.max(0, (st.lap_end ?? 0) - (st.lap_start ?? 0) + 1);
                      return (
                        <span key={st.stint_number} className={`stint${now ? ' now' : ''}`} title={`${now ? 'Now' : 'Earlier'}: ${ty.name}, ${age ?? '?'} laps old${st.lap_start ? `, from lap ${st.lap_start}` : ''}`}>
                          <span className="mono">{age ?? '-'}</span>
                          <span className="tyre" style={{ borderColor: ty.colour }}>{ty.letter}</span>
                        </span>
                      );
                    })}
                  </div>
                </td>
                {isRace && (
                  <td className="r">
                    {onGrid || r.grid == null || r.position == null ? (
                      <span className="faint">-</span>
                    ) : (
                      <span className={`diff ${r.grid - r.position > 0 ? 'up' : r.grid - r.position < 0 ? 'down' : ''}`} title={`Started P${r.grid}, now P${r.position}`}>
                        {r.grid - r.position > 0 ? `↑${r.grid - r.position}` : r.grid - r.position < 0 ? `↓${r.position - r.grid}` : '–0'}
                      </span>
                    )}
                  </td>
                )}
                {showPit && (
                  <td>
                    {(() => {
                      const p = rejoin(i);
                      if (!p) return <span className="faint">-</span>;
                      return (
                        <span
                          className={`pit-now${p.traffic ? ' traffic' : ''}`}
                          title={`Would rejoin P${p.pos}${p.ahead ? `, ${(p.t - p.ahead.g).toFixed(1)} s behind ${p.ahead.code}` : ' in the lead'}${p.traffic ? ', within a second of another car (traffic)' : ''}`}
                        >
                          <b className="mono">P{p.pos}</b>
                          <span className="muted">{p.ahead ? ` · ${p.ahead.code} +${(p.t - p.ahead.g).toFixed(1)}` : ' · lead'}</span>
                          {p.traffic && <span className="pit-warn" aria-label="traffic"> ⚠</span>}
                        </span>
                      );
                    })()}
                  </td>
                )}
                <td className="r mono">{speed}<span className="faint" style={{ fontSize: 11 }}> km/h</span></td>
                <td>
                  <div className="pedals" title={tel ? `Throttle ${tel.throttle}%, brake ${tel.brake ? 'on' : 'off'}` : 'No live car data'}>
                    <i className="thr"><b style={{ width: `${Math.max(0, Math.min(100, tel?.throttle ?? 0))}%` }} /></i>
                    <i className="brk"><b style={{ width: `${tel?.brake ? 100 : 0}%` }} /></i>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FiaSection({ messages, drivers, favNum, team, teamNums, isRace }: { messages: ClassifiedMsg[]; drivers: Map<number, OF1Driver>; favNum: number | null; team: FavouriteTeam | null; teamNums: number[]; isRace: boolean }) {
  const [tab, setTab] = useState<MsgTab>('All');
  const [driver, setDriver] = useState<number | 0>(0);
  // driver -1 means "the favourite team's cars".
  const byDriver = driver === -1 ? messages.filter((m) => m.cars.some((c) => teamNums.includes(c))) : driver ? messages.filter((m) => m.cars.includes(driver)) : messages;
  const [showMinor, setShowMinor] = useState(false);
  // Routine sector and blue flags crowd out the important messages, so All hides them unless asked.
  const minor = tab === 'All' ? byDriver.filter(isMinor).length : 0;
  const shown = tab === 'All' ? byDriver.filter((m) => showMinor || !isMinor(m)) : byDriver.filter((m) => m.tab === tab);
  // On phones the full feed makes the page very long, so it starts with the newest messages.
  const [showAll, setShowAll] = useState(false);
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 599px)').matches;
  const PHONE_LIMIT = 15;
  const visible = phone && !showAll ? shown.slice(0, PHONE_LIMIT) : shown;
  const penalties = summarisePenalties(messages);
  const limits = summariseTrackLimits(messages);
  const open = openInvestigations(messages);
  const code = (n: number) => drivers.get(n)?.name_acronym ?? `#${n}`;
  const colour = (n: number) => {
    const d = drivers.get(n);
    return teamColour(d?.team_name, d?.team_colour);
  };
  const involved = [...new Set(messages.flatMap((m) => m.cars))].sort((a, b) => code(a).localeCompare(code(b)));

  return (
    <div className="row top">
      <section className="card tight w3" aria-labelledby="fia">
        <div className="card-head">
          <div>
            <h2 className="h2" id="fia">FIA race control and stewards</h2>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Every official message for this session, newest first</div>
          </div>
          <label className="field">
            Driver
            <select className="select" value={driver} onChange={(e) => setDriver(Number(e.target.value))}>
              <option value={0}>All drivers</option>
              {involved.map((n) => (
                <option key={n} value={n}>{code(n)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="tabs" role="tablist" aria-label="Message type">
          {TABS.map((tb) => (
            <button key={tb} role="tab" className="tab" aria-selected={tab === tb} onClick={() => setTab(tb)}>
              {tb}
              <span className="n">{tb === 'All' ? (showMinor ? byDriver.length : byDriver.filter((m) => !isMinor(m)).length) : byDriver.filter((m) => m.tab === tb).length}</span>
            </button>
          ))}
        </div>
        {(favNum != null || (team && teamNums.length > 0)) && (
          <div className="tabs">
            {favNum != null && (
              <button className="tab fav-toggle" aria-pressed={driver === favNum} onClick={() => setDriver(driver === favNum ? 0 : favNum)}>
                ★ {code(favNum)} only
              </button>
            )}
            {team && teamNums.length > 0 && (
              <button className="tab team-toggle" style={{ '--team': team.colour } as React.CSSProperties} aria-pressed={driver === -1} onClick={() => setDriver(driver === -1 ? 0 : -1)}>
                <FlagIcon filled size={14} /> {team.name} only
              </button>
            )}
          </div>
        )}
        {minor > 0 && (
          <div className="minor-note muted">
            {showMinor ? 'Showing' : 'Hiding'} {minor} routine sector and blue flag message{minor === 1 ? '' : 's'}.{' '}
            <button className="link-btn" onClick={() => setShowMinor(!showMinor)}>{showMinor ? 'Hide them' : 'Show them'}</button>
          </div>
        )}
        {shown.length === 0 ? (
          <Empty>No messages in this category.</Empty>
        ) : (
          <div role="log" aria-live="polite" aria-label="Race control messages">
            {visible.map((m) => (
              <div className={favNum != null && m.cars.includes(favNum) ? 'msg fav' : 'msg'} key={m.id}>
                <FiaWhen m={m} />
                <span className={`badge tone-${m.tone}`}>{m.label}</span>
                <FiaText m={m} codeOf={code}>
                  {m.cars.length > 0 && (
                    <div className="chips">
                      {m.cars.map((c) => (
                        drivers.get(c) ? (
                          <a className="chip chip-link" key={c} href={driverHref(code(c))} title={`${code(c)}: full stats`}><i style={{ background: colour(c) }} />{code(c)}</a>
                        ) : (
                          <span className="chip" key={c}><i style={{ background: colour(c) }} />{code(c)}</span>
                        )
                      ))}
                    </div>
                  )}
                </FiaText>
              </div>
            ))}
            {visible.length < shown.length && (
              <button className="tab" style={{ marginTop: 12 }} onClick={() => setShowAll(true)}>Show all {shown.length} messages</button>
            )}
          </div>
        )}
      </section>

      <div className="col w1">
        <section className="card tight" aria-labelledby="pens">
          <h2 className="h2 sm" id="pens" style={{ marginBottom: 12 }}>Penalties this session</h2>
          {penalties.length === 0 ? <Empty>No penalties so far.</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {penalties.map((p, i) => (
                <div className="inset" style={{ padding: 12 }} key={`${p.car}-${i}`}>
                  <div className="who">
                    <span className="team-bar" style={{ height: 20, background: colour(p.car) }} />
                    <span className="code">{code(p.car)}</span>
                    <span className="mono" style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--red-soft)' }}>{p.penalty}</span>
                  </div>
                  {(p.reason || p.lap) && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {p.reason}
                      {p.lap ? `${p.reason ? ' · ' : ''}Lap ${p.lap}` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 6, color: p.served ? 'var(--green)' : 'var(--amber)' }}>
                    {p.served ? 'Marked as served' : 'Not marked as served yet'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <TrackLimitsPanel limits={limits} penalties={penalties} drivers={drivers} isRace={isRace} favNum={favNum} />
        <InvestigationsPanel open={open} drivers={drivers} />
      </div>
    </div>
  );
}

/** Team radio for the whole session. */
function RadioPanel({ session, live, drivers, favNum, teamNums, laps }: { session: Session; live: boolean; drivers: Map<number, OF1Driver>; favNum: number | null; teamNums: number[]; laps: Lap[] }) {
  const sk = session.session_key;
  const [who, setWho] = useState<number>(0);
  const radio = usePoll<TeamRadio[]>(`radio-all-${sk}-${live}`, (_p, signal) => openf1<TeamRadio>('team_radio', { session_key: sk }, signal), live ? liveEvery(60_000) : 0, 1_500);
  const labels = new Map<number, DriverLabel>([...drivers.values()].map((d) => [d.driver_number, { code: d.name_acronym, colour: teamColour(d.team_name, d.team_colour) }]));
  const clips = (radio.data ?? []).filter((c) => (who === -1 ? teamNums.includes(c.driver_number) : who ? c.driver_number === who : true));
  const withRadio = [...new Set((radio.data ?? []).map((c) => c.driver_number))].sort((a, b) => (labels.get(a)?.code ?? '').localeCompare(labels.get(b)?.code ?? ''));
  return (
    <section className="card tight" aria-labelledby="radio">
      <div className="card-head">
        <h2 className="h2" id="radio">Team radio</h2>
        <label className="field">
          Driver
          <select className="select" value={who} onChange={(e) => setWho(Number(e.target.value))}>
            <option value={0}>All drivers</option>
            {favNum != null && <option value={favNum}>★ {labels.get(favNum)?.code}</option>}
            {teamNums.length > 0 && <option value={-1}>⚑ My team</option>}
            {withRadio.map((n) => (
              <option key={n} value={n}>{labels.get(n)?.code ?? n}</option>
            ))}
          </select>
        </label>
      </div>
      {radio.error ? <ErrorBox error={radio.error} what="team radio" /> : radio.loading ? <Loading rows={3} /> : <RadioCards clips={clips} drivers={drivers} favNum={favNum} teamNums={teamNums} laps={laps} limit={8} />}
    </section>
  );
}
