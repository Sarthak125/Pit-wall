import { useEffect, useMemo, useState } from 'react';
import { isSessionLive, type OF1Driver, type Session } from '../api/openf1';
import { Empty, ErrorBox, Loading } from '../components/States';
import { FiaText, FiaWhen } from '../components/FiaText';
import { LiveTrackMap } from '../components/LiveTrackMap';
import { RadioCards } from '../components/RadioCards';
import { Footer } from '../components/Shell';
import { useNow } from '../hooks/usePoll';
import { useLatestSessions } from '../hooks/useSeason';
import { useLiveTiming, type TimingRow } from '../hooks/useLiveTiming';
import { fmtClock, fmtDuration, fmtGap, fmtLap, fmtSector, fmtShortClock } from '../lib/format';
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

  if (sessions.error) return <ErrorBox error={sessions.error} what="the session list" />;
  if (sessions.isLoading) return <Loading rows={10} />;
  if (!session) return <Empty>No sessions found on OpenF1 yet.</Empty>;

  const start = Date.parse(session.date_start);
  const elapsed = live ? now - start : Date.parse(session.date_end) - start;

  return (
    <>
      <section className="card session-bar" aria-label="Session">
        {live ? (
          <span className="pill tone-solid" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, letterSpacing: 1 }}>
            <span className="dot live-dot on" style={{ background: '#fff' }} />
            LIVE
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
          <div className="metric">
            <div className="l">LAP</div>
            <div className="v">{t.currentLap || '-'}</div>
          </div>
          <div className="metric">
            <div className="l">{live ? 'ELAPSED' : 'DURATION'}</div>
            <div className="v">{fmtDuration(elapsed)}</div>
          </div>
          <div className="metric">
            <div className="l">TRACK</div>
            <div className="v">{t.weather ? `${t.weather.track_temperature.toFixed(0)}°C` : '-'}</div>
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
            <TimingTable rows={t.rows} isRace={isRace} live={live} fastest={t.fastest} favNum={favNum} team={favTeam} />
          )}
        </section>
      </div>

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

      <FiaSection messages={t.messages} drivers={t.driversByNumber} favNum={favNum} team={favTeam} teamNums={teamNums} />
      <RadioPanel session={session} live={live} drivers={t.driversByNumber} favNum={favNum} teamNums={teamNums} />
      <Footer />
    </>
  );
}

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

function TimingTable({ rows, isRace, live, fastest, favNum, team }: { rows: TimingRow[]; isRace: boolean; live: boolean; fastest: number | null; favNum: number | null; team: FavouriteTeam | null }) {
  return (
    <div className="scroll-x">
      <table className="tbl timing" style={{ minWidth: live ? 1180 : 1060 }}>
        <thead>
          <tr>
            <th>POS</th>
            <th>DRIVER</th>
            <th className="r">{isRace ? 'GAP' : 'GAP (BEST)'}</th>
            <th className="r">INT</th>
            <th>LAST LAP</th>
            <th className="r">BEST</th>
            <th className="r" title={live ? 'Current lap' : 'Best lap'}>SECTOR 1{live ? '' : ' (BEST LAP)'}</th>
            <th className="r">SECTOR 2</th>
            <th className="r">SECTOR 3</th>
            <th>TYRES</th>
            <th className="r" title={live ? 'Current speed' : 'Fastest speed trap reading this session'}>{live ? 'SPEED' : 'TOP TRAP'}</th>
            {live && <th>PEDALS</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const gap = isRace ? (i === 0 ? 'Leader' : fmtGap(r.gap)) : r.bestLap != null && fastest != null ? (i === 0 ? 'Fastest' : `+${(r.bestLap - fastest).toFixed(3)}`) : '-';
            const l = r.lastLap;
            const c = r.currentLap;
            const isTeam = team?.codes.has(r.driver.name_acronym);
            const speed = live ? r.car?.speed : r.trapSpeed;
            return (
              <tr key={r.driver.driver_number} className={[favNum === r.driver.driver_number ? 'fav' : '', isTeam ? 'team' : '', r.status === 'IN PIT' ? 'in-pit' : ''].join(' ').trim() || undefined} style={isTeam ? ({ '--team': team!.colour } as React.CSSProperties) : undefined}>
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
                <td className="r mono muted">{isRace && i > 0 ? fmtGap(r.interval) : '-'}</td>
                <td>
                  {r.status ? (
                    <span className={`pit-pill ${r.status === 'IN PIT' ? 'in' : 'out'}`}>{r.status}</span>
                  ) : (
                    <span className={`lap-pill tone-${r.lastLapTone === 'slower' ? 'none' : r.lastLapTone}`}>{fmtLap(l?.lap_duration)}</span>
                  )}
                </td>
                <td className="r mono">{fmtLap(r.bestLap)}</td>
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
                    {r.stints.slice(0, -1).map((st) => {
                      const ty = tyre(st.compound);
                      return <span key={st.stint_number} className="tyre small" style={{ borderColor: ty.colour }} title={`Earlier: ${ty.name}, laps ${st.lap_start ?? '?'} to ${st.lap_end ?? '?'}`}>{ty.letter}</span>;
                    })}
                    {r.stint ? (
                      <>
                        <span className="tyre" style={{ borderColor: tyre(r.stint.compound).colour }} title={`Now: ${tyre(r.stint.compound).name}`}>{tyre(r.stint.compound).letter}</span>
                        <span className="mono muted" style={{ fontSize: 12 }}>{r.tyreAge ?? '-'}</span>
                      </>
                    ) : <span className="faint">-</span>}
                  </div>
                </td>
                <td className="r mono">{speed != null ? <>{speed}<span className="faint" style={{ fontSize: 11 }}> km/h</span></> : '-'}</td>
                {live && (
                  <td>
                    <div className="pedals" title={r.car ? `Throttle ${r.car.throttle}%, brake ${r.car.brake ? 'on' : 'off'}` : 'No car data yet'}>
                      <i className="thr"><b style={{ width: `${Math.max(0, Math.min(100, r.car?.throttle ?? 0))}%` }} /></i>
                      <i className="brk"><b style={{ width: `${r.car?.brake ? 100 : 0}%` }} /></i>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FiaSection({ messages, drivers, favNum, team, teamNums }: { messages: ClassifiedMsg[]; drivers: Map<number, OF1Driver>; favNum: number | null; team: FavouriteTeam | null; teamNums: number[] }) {
  const [tab, setTab] = useState<MsgTab>('All');
  const [driver, setDriver] = useState<number | 0>(0);
  // driver -1 means "the favourite team's cars".
  const byDriver = driver === -1 ? messages.filter((m) => m.cars.some((c) => teamNums.includes(c))) : driver ? messages.filter((m) => m.cars.includes(driver)) : messages;
  const [showMinor, setShowMinor] = useState(false);
  // Routine sector and blue flags crowd out the important messages, so All hides them unless asked.
  const minor = tab === 'All' ? byDriver.filter(isMinor).length : 0;
  const shown = tab === 'All' ? byDriver.filter((m) => showMinor || !isMinor(m)) : byDriver.filter((m) => m.tab === tab);
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
            {shown.map((m) => (
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

        <section className="card tight" aria-labelledby="limits">
          <h2 className="h2 sm" id="limits" style={{ marginBottom: 4 }}>Track limits</h2>
          <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Lap times deleted per driver</div>
          {limits.length === 0 ? <Empty>No track limits messages.</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {limits.map((l) => (
                <div className="who" key={l.car}>
                  <span className="code" style={{ width: 40, fontSize: 15 }}>{code(l.car)}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                    {Array.from({ length: Math.max(4, l.deleted) }, (_, k) => (
                      <span key={k} style={{ flex: 1, height: 10, borderRadius: 2, background: k < l.deleted ? (l.blackAndWhite ? 'var(--violet-soft)' : '#8B93A1') : 'var(--line-soft)' }} />
                    ))}
                  </div>
                  <span style={{ width: 72, textAlign: 'right', fontSize: 12, color: l.blackAndWhite ? 'var(--violet-soft)' : 'var(--muted)' }}>
                    {l.blackAndWhite ? 'B/W flag' : `${l.deleted} deleted`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card tight" aria-label="Open investigations" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>
            {open.length === 0 ? 'No incidents under investigation' : `${open.length} incident${open.length > 1 ? 's' : ''} under investigation`}
          </div>
          {open.map((m) => (
            <div key={m.id} className="muted" style={{ fontSize: 12 }}>
              {m.lap_number ? `Lap ${m.lap_number} · ` : ''}
              {m.cars.map(code).join(', ') || m.message}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/** Team radio for the whole session. */
function RadioPanel({ session, live, drivers, favNum, teamNums }: { session: Session; live: boolean; drivers: Map<number, OF1Driver>; favNum: number | null; teamNums: number[] }) {
  const sk = session.session_key;
  const [who, setWho] = useState<number>(0);
  const radio = usePoll<TeamRadio[]>(`radio-all-${sk}-${live}`, (_p, signal) => openf1<TeamRadio>('team_radio', { session_key: sk }, signal), live ? 30_000 : 0);
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
      {radio.error ? <ErrorBox error={radio.error} what="team radio" /> : radio.loading ? <Loading rows={3} /> : <RadioCards clips={clips} drivers={drivers} favNum={favNum} teamNums={teamNums} limit={8} />}
    </section>
  );
}
