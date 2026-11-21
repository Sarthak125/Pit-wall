import { useEffect, useMemo, useState } from 'react';
import { isSessionLive, type OF1Driver, type Session, type Stint } from '../api/openf1';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { useNow } from '../hooks/usePoll';
import { useLatestSessions } from '../hooks/useSeason';
import { useLiveTiming, type TimingRow } from '../hooks/useLiveTiming';
import { fmtClock, fmtDuration, fmtGap, fmtLap, fmtSector, fmtShortClock } from '../lib/format';
import {
  openInvestigations,
  summarisePenalties,
  summariseTrackLimits,
  TABS,
  trackStatus,
  type ClassifiedMsg,
  type MsgTab,
} from '../lib/raceControl';
import { teamColour, tyre, TYRE } from '../lib/teams';
import { StarIcon } from '../components/Icons';
import { useFavourite, useFavouriteTeam, type FavouriteTeam } from '../hooks/useFavourite';
import { RadioList, type DriverLabel } from '../components/RadioList';
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
  const [carDriver, setCarDriver] = useState<number | null>(null);

  const list = sessions.data ?? [];
  const defaultSession = list.find((s) => isSessionLive(s, now)) ?? [...list].reverse().find((s) => Date.parse(s.date_start) <= now) ?? list[0];
  const session = list.find((s) => s.session_key === picked) ?? defaultSession;
  const live = session ? isSessionLive(session, now) : false;

  const t = useLiveTiming(session, live, carDriver);
  const fav = useFavourite();
  const favTeam = useFavouriteTeam();
  const teamNums = t.rows.filter((r) => favTeam?.codes.has(r.driver.name_acronym)).map((r) => r.driver.driver_number);
  const favNum = t.rows.find((r) => r.driver.name_acronym === fav?.code)?.driver.driver_number ?? null;
  // Car data opens on the favourite when they are in this session, else the leader.
  const effectiveCar = carDriver ?? favNum ?? t.rows[0]?.driver.driver_number ?? null;
  // Once rows load, select the leader for the car data panel.
  if (carDriver == null && effectiveCar != null && t.rows[0]?.position != null) setCarDriver(effectiveCar);

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
              {t.updatedAt && <span className="faint">Updated {fmtClock(new Date(t.updatedAt))}</span>}
            </div>
          </div>
          {t.loading ? <Loading rows={12} /> : t.rows.length === 0 ? <Empty>No timing data for this session yet.</Empty> : (
            <TimingTable rows={t.rows} isRace={isRace} fastest={t.fastest} selected={effectiveCar} favNum={favNum} team={favTeam} onSelect={setCarDriver} />
          )}
        </section>

        <div className="col w1">
          <CarPanel rows={t.rows} car={t.car} selected={effectiveCar} onSelect={setCarDriver} />
          <StrategyPanel rows={t.rows} stints={t.stints} />
        </div>
      </div>

      <FiaSection messages={t.messages} drivers={t.driversByNumber} favNum={favNum} team={favTeam} teamNums={teamNums} />
      <RadioPanel session={session} live={live} drivers={t.driversByNumber} favNum={favNum} teamNums={teamNums} />
      <Footer />
    </>
  );
}

function TimingTable({ rows, isRace, fastest, selected, favNum, team, onSelect }: { rows: TimingRow[]; isRace: boolean; fastest: number | null; selected: number | null; favNum: number | null; team: FavouriteTeam | null; onSelect: (n: number) => void }) {
  return (
    <div className="scroll-x">
      <table className="tbl timing" style={{ minWidth: 820 }}>
        <thead>
          <tr>
            <th>POS</th>
            <th>DRIVER</th>
            <th className="r">{isRace ? 'GAP' : 'GAP (BEST)'}</th>
            <th className="r">INT</th>
            <th className="r">LAST LAP</th>
            <th className="r">BEST</th>
            <th className="r">S1</th>
            <th className="r">S2</th>
            <th className="r">S3</th>
            <th>TYRE</th>
            <th className="r">PITS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const gap = isRace ? (i === 0 ? 'Leader' : fmtGap(r.gap)) : r.bestLap != null && fastest != null ? (i === 0 ? 'Fastest' : `+${(r.bestLap - fastest).toFixed(3)}`) : '-';
            const ty = tyre(r.stint?.compound);
            const l = r.lastLap;
            return (
              <tr key={r.driver.driver_number} className={[favNum === r.driver.driver_number ? 'fav' : '', team?.codes.has(r.driver.name_acronym) ? 'team' : '', selected === r.driver.driver_number ? 'me' : ''].join(' ').trim() || undefined} onClick={() => onSelect(r.driver.driver_number)} style={{ cursor: 'pointer', ...(team?.codes.has(r.driver.name_acronym) ? ({ '--team': team.colour } as React.CSSProperties) : {}) }}>
                <td className="mono muted">{r.position ?? '-'}</td>
                <td>
                  <div className="who">
                    <span className="team-bar" style={{ height: 20, background: r.colour }} />
                    <a className="code name-link" style={{ fontWeight: 700 }} href={driverHref(r.driver.name_acronym)} title={`${r.driver.name_acronym}: full stats`} onClick={(e) => e.stopPropagation()}>{r.driver.name_acronym}</a>
                    <span className="faint" style={{ fontSize: 11 }}>{r.driver.driver_number}</span>
                    {favNum === r.driver.driver_number && <span className="fav-star" aria-label="Favourite"><StarIcon filled size={14} /></span>}
                  </div>
                </td>
                <td className="r mono">{gap}</td>
                <td className="r mono muted">{isRace && i > 0 ? fmtGap(r.interval) : '-'}</td>
                <td className={`r mono tone-${r.lastLapTone === 'slower' ? 'none' : r.lastLapTone}`}>{fmtLap(l?.lap_duration)}</td>
                <td className="r mono">{fmtLap(r.bestLap)}</td>
                {[l?.duration_sector_1, l?.duration_sector_2, l?.duration_sector_3].map((s, k) => (
                  <td key={k} className={`r mono tone-${r.sectorTone[k]}`}>{fmtSector(s)}</td>
                ))}
                <td>
                  {r.stint ? (
                    <div className="who" style={{ gap: 8 }}>
                      <span className="tyre" style={{ borderColor: ty.colour }} title={ty.name}>{ty.letter}</span>
                      <span className="mono muted" style={{ fontSize: 12 }}>{r.tyreAge ?? '-'} laps</span>
                    </div>
                  ) : '-'}
                </td>
                <td className="r mono muted">{r.pits}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CarPanel({ rows, car, selected, onSelect }: { rows: TimingRow[]; car: { speed: number; n_gear: number; rpm: number; throttle: number; brake: number } | null; selected: number | null; onSelect: (n: number) => void }) {
  return (
    <section className="card tight" aria-labelledby="car">
      <div className="card-head">
        <h2 className="h2 sm" id="car">Car data</h2>
        <label className="field">
          Driver
          <select className="select" value={selected ?? ''} onChange={(e) => onSelect(Number(e.target.value))}>
            {rows.map((r) => (
              <option key={r.driver.driver_number} value={r.driver.driver_number}>
                {r.driver.name_acronym}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!car ? (
        <Empty>No car data received yet.</Empty>
      ) : (
        <>
          <div className="stat-grid three">
            <div className="stat inset"><div className="l">SPEED</div><div className="v">{car.speed}<span className="u"> km/h</span></div></div>
            <div className="stat inset"><div className="l">GEAR</div><div className="v">{car.n_gear}</div></div>
            <div className="stat inset"><div className="l">RPM</div><div className="v">{(car.rpm / 1000).toFixed(1)}k</div></div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Meter label="Throttle" value={car.throttle} colour="var(--green)" />
            {/* OpenF1 reports brake as 0 or 100 (on or off). */}
            <Meter label="Brake" value={car.brake} colour="#F87171" />
          </div>
        </>
      )}
    </section>
  );
}

function Meter({ label, value, colour }: { label: string; value: number; colour: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="mono">{v}%</span>
      </div>
      <div className="meter" role="meter" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${v}%`, background: colour }} />
      </div>
    </div>
  );
}

function StrategyPanel({ rows, stints }: { rows: TimingRow[]; stints: Stint[] }) {
  const maxLap = Math.max(1, ...rows.map((r) => r.lapsDone), ...stints.map((s) => s.lap_end ?? 0));
  return (
    <section className="card tight" aria-labelledby="strategy">
      <h2 className="h2 sm" id="strategy" style={{ marginBottom: 14 }}>Tyre strategy</h2>
      {stints.length === 0 ? <Empty>No stint data yet.</Empty> : (
        <div className="stints">
          {rows.slice(0, 10).map((r) => {
            const mine = stints.filter((s) => s.driver_number === r.driver.driver_number).sort((a, b) => a.stint_number - b.stint_number);
            return (
              <div className="stint-row" key={r.driver.driver_number}>
                <a className="code name-link" style={{ fontWeight: 700 }} href={driverHref(r.driver.name_acronym)} title={`${r.driver.name_acronym}: full stats`} onClick={(e) => e.stopPropagation()}>{r.driver.name_acronym}</a>
                <div className="stint-track">
                  {mine.map((s) => {
                    const startLap = s.lap_start ?? 1;
                    const endLap = s.lap_end ?? r.lapsDone;
                    const laps = Math.max(1, endLap - startLap + 1);
                    return <div key={s.stint_number} title={`${tyre(s.compound).name}: laps ${startLap} to ${endLap}`} style={{ width: `${(laps / maxLap) * 100}%`, background: tyre(s.compound).colour }} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="legend" style={{ marginTop: 12, fontSize: 11 }}>
        {Object.values(TYRE).map((ty) => (
          <span key={ty.name}><i className="sw" style={{ background: ty.colour }} />{ty.name}</span>
        ))}
      </div>
    </section>
  );
}

function FiaSection({ messages, drivers, favNum, team, teamNums }: { messages: ClassifiedMsg[]; drivers: Map<number, OF1Driver>; favNum: number | null; team: FavouriteTeam | null; teamNums: number[] }) {
  const [tab, setTab] = useState<MsgTab>('All');
  const [driver, setDriver] = useState<number | 0>(0);
  // driver -1 means "the favourite team's cars".
  const byDriver = driver === -1 ? messages.filter((m) => m.cars.some((c) => teamNums.includes(c))) : driver ? messages.filter((m) => m.cars.includes(driver)) : messages;
  const shown = tab === 'All' ? byDriver : byDriver.filter((m) => m.tab === tab);
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
              <span className="n">{tb === 'All' ? byDriver.length : byDriver.filter((m) => m.tab === tb).length}</span>
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
        {shown.length === 0 ? (
          <Empty>No messages in this category.</Empty>
        ) : (
          <div role="log" aria-live="polite" aria-label="Race control messages">
            {shown.map((m) => (
              <div className={favNum != null && m.cars.includes(favNum) ? 'msg fav' : 'msg'} key={m.id}>
                <div className="when">
                  <div className="muted">{m.lap_number ? `LAP ${m.lap_number}` : ' '}</div>
                  <div>{fmtClock(new Date(m.date))}</div>
                </div>
                <span className={`badge tone-${m.tone}`}>{m.label}</span>
                <div className="text">
                  <div>{m.message}</div>
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
                </div>
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
      {radio.error ? <ErrorBox error={radio.error} what="team radio" /> : radio.loading ? <Loading rows={3} /> : <RadioList clips={clips} labels={labels} limit={6} />}
    </section>
  );
}
