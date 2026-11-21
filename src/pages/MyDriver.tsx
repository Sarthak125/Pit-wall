import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCareerCounts, getCareerTitles, getCircuitHistory, getQualifying, type DriverStanding } from '../api/jolpica';
import { openf1, type OF1Driver, type Session, type SessionResult, type TeamRadio } from '../api/openf1';
import { StarIcon } from '../components/Icons';
import { FavTabs } from '../components/FavTabs';
import { LiveDriver } from '../components/LiveDriver';
import { RadioList } from '../components/RadioList';
import { Footer } from '../components/Shell';
import { Empty, ErrorBox, Loading } from '../components/States';
import { useFavourite, useLiveSession } from '../hooks/useFavourite';
import { useNow } from '../hooks/usePoll';
import { useDriverStandings, useLatestSessions, useResults, useSchedule } from '../hooks/useSeason';
import { headToHead, pointsAvailable, roundRows, seasonStats, type RoundRow } from '../lib/driverStats';
import { fmtLap, raceStart } from '../lib/format';
import { href, useRouteParam } from '../lib/router';
import { niceName } from '../lib/format';
import { setFavorite, useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';

export function MyDriver() {
  const fav = useFavourite();
  const param = useRouteParam();
  const { season } = useSettings();
  const standings = useDriverStandings(season);
  // #/driver/CODE shows any driver; #/driver alone shows the favourite.
  if (param) return <Profile key={param} code={param} name={fav?.code === param ? fav.name : ''} season={season} isFav={fav?.code === param} />;
  if (!fav) return <PickFavourite standings={standings.data?.standings ?? []} loading={standings.isLoading} />;
  return <Profile code={fav.code} name={fav.name} season={season} isFav />;
}

function PickFavourite({ standings, loading }: { standings: DriverStanding[]; loading: boolean }) {
  return (
    <>
      <FavTabs active="driver" />
      <section className="card">
        <h1 className="h2" style={{ marginBottom: 6 }}>My Driver</h1>
        <p className="muted" style={{ marginTop: 0 }}>Pick a favourite driver to see all their stats here, including live data during sessions.</p>
        {loading ? <Loading rows={6} /> : (
          <div className="driver-grid">
            {standings.map((d) => {
              const team = d.Constructors[d.Constructors.length - 1];
              return (
                <button
                  key={d.Driver.driverId}
                  className="inset driver-card"
                  style={{ borderTopColor: teamColour(team?.constructorId ?? team?.name), cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
                  onClick={() => setFavorite(d.Driver.code ?? '', `${d.Driver.givenName} ${d.Driver.familyName}`)}
                >
                  <span className="fav-star"><StarIcon /></span>
                  <span>
                    <span style={{ fontWeight: 600, display: 'block' }}>{d.Driver.givenName} {d.Driver.familyName}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{team?.name} · P{d.position ?? d.positionText}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}

function Profile({ code, name: givenName, season, isFav }: { code: string; name: string; season: string; isFav: boolean }) {
  const standings = useDriverStandings(season);
  const results = useResults(season);
  const schedule = useSchedule(season);
  const quali = useQuery({ queryKey: ['quali-all', season], queryFn: () => getQualifying(season), staleTime: 15 * 60_000 });
  const latestDrivers = useQuery({ queryKey: ['of1-drivers-latest'], queryFn: () => openf1<OF1Driver>('drivers', { session_key: 'latest' }), staleTime: 30 * 60_000 });
  const liveSession = useLiveSession();
  const liveDriverIn = useQuery({
    queryKey: ['drv', liveSession?.session_key],
    enabled: !!liveSession,
    queryFn: () => openf1<OF1Driver>('drivers', { session_key: liveSession!.session_key }),
    staleTime: 10 * 60_000,
  });
  const inLive = !!liveSession && !!liveDriverIn.data?.some((d) => d.name_acronym === code);

  const list = standings.data?.standings ?? [];
  const idx = list.findIndex((s) => s.Driver.code === code);
  const me = list[idx];
  const of1 = latestDrivers.data?.find((d) => d.name_acronym === code);
  const team = me?.Constructors[me.Constructors.length - 1];
  const name = givenName || (me ? `${me.Driver.givenName} ${me.Driver.familyName}` : of1 ? niceName(of1.full_name) : code);
  const colour = teamColour(team?.constructorId ?? team?.name ?? of1?.team_name, of1?.team_colour);
  const races = useMemo(() => results.data?.races ?? [], [results.data]);
  const sprints = useMemo(() => results.data?.sprints ?? [], [results.data]);
  const q = useMemo(() => quali.data ?? [], [quali.data]);
  const gpRows = useMemo(() => roundRows(races, 'Results', code, q), [races, code, q]);
  const sprintRows = useMemo(() => roundRows(sprints, 'SprintResults', code, q), [sprints, code, q]);
  const stats = useMemo(() => seasonStats(gpRows, sprintRows, q, code), [gpRows, sprintRows, q, code]);
  // Jolpica's standings "round" can run ahead of the results, so count finished races from the results themselves.
  const doneRound = races.reduce((m, r) => (r.Results?.length ? Math.max(m, Number(r.round)) : m), 0);
  const seasonLabel = schedule.data?.[0]?.season ?? (season === 'current' ? String(new Date().getFullYear()) : season);

  if (standings.error) return <ErrorBox error={standings.error} what="standings" />;
  if (standings.isLoading) return <Loading rows={10} />;

  return (
    <>
      {isFav ? (
        <FavTabs active="driver" />
      ) : (
        <a className="link" href={href('drivers')} style={{ alignSelf: 'flex-start' }}>← All drivers</a>
      )}
      <section className="card profile-head" style={{ borderLeftColor: colour }}>
        {of1?.headshot_url ? <img src={of1.headshot_url} alt="" /> : <div className="ph" aria-hidden="true" />}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div className="code" style={{ fontSize: 22, color: colour }}>
            {me?.Driver.permanentNumber || of1?.driver_number ? `#${me?.Driver.permanentNumber ?? of1?.driver_number} · ` : ''}
            {code}
          </div>
          <h1>{me ? `${me.Driver.givenName} ${me.Driver.familyName}` : name}</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            {team?.name ?? of1?.team_name}
            {me?.Driver.nationality ? ` · ${me.Driver.nationality}` : ''}
          </div>
        </div>
        {me && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div className="inset big-tile"><div className="kicker" style={{ fontSize: 11 }}>Championship</div><div className="v">P{me.position ?? me.positionText}</div></div>
            <div className="inset big-tile"><div className="kicker" style={{ fontSize: 11 }}>Points</div><div className="v">{me.points}</div></div>
            <div className="inset big-tile">
              <div className="kicker" style={{ fontSize: 11 }}>Gaps</div>
              <div className="mono" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                {idx === 0 ? 'Leader' : `-${Number(list[0].points) - Number(me.points)} to P1`}
                <br />
                {list[idx + 1] ? `+${Number(me.points) - Number(list[idx + 1].points)} over P${idx + 2}` : 'Last in standings'}
              </div>
            </div>
          </div>
        )}
        <button
          className="star-btn"
          aria-pressed={isFav}
          aria-label={isFav ? `Remove ${name} as favourite` : `Make ${name} your favourite`}
          title={isFav ? 'Your favourite driver' : 'Make favourite'}
          onClick={() => setFavorite(code, name)}
        >
          <StarIcon filled={isFav} />
        </button>
      </section>

      {inLive && liveSession && <LiveDriver session={liveSession} code={code} alerts={isFav} />}

      {!me ? (
        <section className="card"><Empty>{name} has no results in the {seasonLabel} season.</Empty></section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <h2 className="h2">{seasonLabel} season</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                After round {doneRound}
                {schedule.data ? ` of ${schedule.data.length}` : ''}
              </span>
            </div>
            {results.isLoading || quali.isLoading ? <Loading rows={3} /> : results.error ? <ErrorBox error={results.error} what="results" /> : (
              <div className="tile-grid">
                {[
                  ['Wins', stats.wins, pct(stats.wins, stats.races)],
                  ['Podiums', stats.podiums, pct(stats.podiums, stats.races)],
                  ['Pole positions', stats.poles, ''],
                  ['Front-row starts', stats.frontRows, ''],
                  ['Fastest laps', stats.fastestLaps, ''],
                  ['Points finishes', `${stats.pointsFinishes} / ${stats.races}`, ''],
                  ['Average finish', stats.avgFinish?.toFixed(1) ?? '-', 'classified races'],
                  ['Average grid', stats.avgGrid?.toFixed(1) ?? '-', ''],
                  ['Positions gained', `${stats.gained > 0 ? '+' : ''}${stats.gained}`, 'grid to flag, total'],
                  ['DNFs', stats.dnfRounds.length, stats.dnfRounds.length ? stats.dnfRounds.map((r) => `R${r}`).join(', ') : ''],
                  ['Sprint points', stats.sprintPoints, `${stats.sprints} sprint${stats.sprints === 1 ? '' : 's'}`],
                  ['Points per race', stats.races ? (Number(me.points) / stats.races).toFixed(1) : '-', 'incl. sprints'],
                ].map(([l, v, n]) => (
                  <div className="inset tile" key={String(l)}>
                    <div className="l">{l}</div>
                    <div className="v">{v}</div>
                    {n ? <div className="n">{n}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="row">
            <section className="card w3" aria-labelledby="gvf">
              <div className="card-head">
                <h2 className="h2" id="gvf">Grid vs finish, every round</h2>
                <div className="legend">
                  <span><i style={{ width: 14, height: 3, background: colour, display: 'inline-block' }} />Finish</span>
                  <span><i style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #A9B1BC', display: 'inline-block' }} />Grid</span>
                  <span><i style={{ width: 8, height: 8, background: '#F87171', transform: 'rotate(45deg)', display: 'inline-block' }} />DNF</span>
                </div>
              </div>
              {gpRows.length ? <GridFinishChart rows={gpRows} colour={colour} /> : <Empty>No races yet.</Empty>}
            </section>
            <div className="col w2">
              <Compare code={code} standings={list} races={races} quali={q} colour={colour} />
              <TitleMaths me={me} list={list} schedule={schedule.data ?? []} doneRound={doneRound} sprintsDone={new Set(sprints.filter((s) => s.SprintResults?.length).map((s) => s.round))} />
            </div>
          </div>

          <div className="row">
            <Career driverId={me.Driver.driverId} />
            <CircuitHistory driverId={me.Driver.driverId} schedule={schedule.data ?? []} />
          </div>

          <RaceByRace gp={gpRows} sprint={sprintRows} quali={q} code={code} />
        </>
      )}

      {!inLive && <ThisWeekend code={code} />}
      <Footer />
    </>
  );
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}% of races` : '');

export function GridFinishChart({ rows, colour }: { rows: RoundRow[]; colour: string }) {
  const maxPos = Math.max(20, ...rows.map((r) => Math.max(r.grid ?? 0, r.finish ?? 0)));
  const maxRound = Math.max(...rows.map((r) => r.round));
  const W = 640, H = 250, L = 40, R = 620, T = 20, B = 218;
  const x = (rd: number) => L + ((rd - 1) / Math.max(1, maxRound - 1)) * (R - L);
  const y = (p: number) => T + ((p - 1) / (maxPos - 1)) * (B - T);
  const finished = rows.filter((r) => r.finish != null);
  return (
    <svg role="img" aria-label="Grid and finishing position for each round" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <g fontFamily="JetBrains Mono, monospace" fontSize={10} fill="#7D8693">
        {[1, 5, 10, 15, maxPos].map((p) => (
          <g key={p}>
            <line x1={L} x2={R} y1={y(p)} y2={y(p)} stroke="#1F242C" />
            <text x={L - 6} y={y(p) + 3} textAnchor="end">P{p}</text>
          </g>
        ))}
        {[1, Math.ceil(maxRound / 2), maxRound].filter((v, i, a) => a.indexOf(v) === i).map((rd) => (
          <text key={rd} x={x(rd)} y={H - 6} textAnchor="middle">R{rd}</text>
        ))}
      </g>
      <polyline points={finished.map((r) => `${x(r.round).toFixed(1)},${y(r.finish!).toFixed(1)}`).join(' ')} fill="none" stroke={colour} strokeWidth={2.5} strokeLinejoin="round" />
      {rows.filter((r) => r.grid != null).map((r) => (
        <circle key={`g${r.round}`} cx={x(r.round)} cy={y(r.grid!)} r={3.5} fill="#14171C" stroke="#A9B1BC" strokeWidth={1.5}>
          <title>{`R${r.round} ${r.name}: grid P${r.grid}, ${r.finishText}`}</title>
        </circle>
      ))}
      {rows.filter((r) => r.finish == null).map((r) => (
        <rect key={`d${r.round}`} x={x(r.round) - 4.5} y={y(maxPos) - 4.5} width={9} height={9} fill="#F87171" transform={`rotate(45 ${x(r.round)} ${y(maxPos)})`}>
          <title>{`R${r.round} ${r.name}: ${r.finishText} (${r.status})`}</title>
        </rect>
      ))}
    </svg>
  );
}

export function Compare({ code, standings, races, quali, colour }: { code: string; standings: DriverStanding[]; races: Parameters<typeof headToHead>[0]; quali: Parameters<typeof headToHead>[1]; colour: string }) {
  const me = standings.find((s) => s.Driver.code === code);
  const myTeam = me?.Constructors[me.Constructors.length - 1]?.constructorId;
  const mate = standings.find((s) => s.Driver.code !== code && s.Constructors.some((c) => c.constructorId === myTeam));
  const [pick, setPick] = useState<string | null>(null);
  const other = standings.find((s) => s.Driver.code === (pick ?? mate?.Driver.code)) ?? standings.find((s) => s.Driver.code !== code);
  if (!me || !other) return null;
  const h = headToHead(races, quali, code, other.Driver.code!);
  const oColour = teamColour(other.Constructors[other.Constructors.length - 1]?.constructorId);
  const bColour = oColour === colour ? `color-mix(in srgb, ${colour} 40%, white)` : oColour;
  const rows: [string, number, number][] = [
    ['Points', Number(me.points), Number(other.points)],
    ['Ahead in races', h.racesA, h.racesB],
    ['Ahead in qualifying', h.qualiA, h.qualiB],
    ['Wins', h.winsA, h.winsB],
    ['Podiums', h.podiumsA, h.podiumsB],
  ];
  return (
    <section className="card tight" aria-labelledby="cmp">
      <div className="card-head" style={{ marginBottom: 14 }}>
        <h2 className="h2 sm" id="cmp">Compare</h2>
        <label className="field">
          vs
          <select className="select" value={other.Driver.code} onChange={(e) => setPick(e.target.value)}>
            {standings.filter((s) => s.Driver.code !== code).map((s) => (
              <option key={s.Driver.driverId} value={s.Driver.code}>
                {s.Driver.familyName}{s === mate ? ' (team-mate)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(([l, a, b]) => (
          <div key={l}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span className="mono">{a}</span>
              <span className="muted">{l}</span>
              <span className="mono">{b}</span>
            </div>
            <div className="h2h-bar">
              <div style={{ width: `${a + b ? (a / (a + b)) * 100 : 50}%`, background: colour }} />
              <div style={{ width: `${a + b ? (b / (a + b)) * 100 : 50}%`, background: bColour }} />
            </div>
          </div>
        ))}
      </div>
      <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
        <span>{code}</span>
        <span>{other.Driver.code}</span>
      </div>
    </section>
  );
}

function TitleMaths({ me, list, schedule, doneRound, sprintsDone }: { me: DriverStanding; list: DriverStanding[]; schedule: Parameters<typeof raceStart>[0][]; doneRound: number; sprintsDone: Set<string> }) {
  const remaining = schedule.filter((r) => Number(r.round) > doneRound);
  const sprints = remaining.filter((r) => r.Sprint && !sprintsDone.has(r.round)).length;
  const available = pointsAvailable(remaining.length, sprints);
  const myPts = Number(me.points);
  const leaderPts = Number(list[0]?.points ?? 0);
  const isLeader = list[0] === me;
  const second = Number(list[1]?.points ?? 0);
  let verdict: string;
  let tone: string;
  if (remaining.length === 0) {
    verdict = isLeader ? 'Season finished: champion.' : `Season finished: P${me.position ?? me.positionText} in the championship.`;
    tone = isLeader ? 'tone-green' : 'tone-grey';
  } else if (isLeader) {
    const lead = myPts - second;
    verdict = lead > available ? 'Champion: the lead can no longer be overcome.' : `Leads by ${lead}. Clinches the title once the lead is more than the points left.`;
    tone = 'tone-green';
  } else if (leaderPts - myPts > available) {
    verdict = 'Can no longer win the title.';
    tone = 'tone-grey';
  } else {
    verdict = `Can still win: ${leaderPts - myPts} behind with ${available} points left.`;
    tone = 'tone-amber';
  }
  return (
    <section className="card tight" aria-labelledby="maths">
      <h2 className="h2 sm" id="maths" style={{ marginBottom: 10 }}>Title maths</h2>
      <span className={`pill ${tone}`} style={{ fontSize: 13, whiteSpace: 'normal' }}>{verdict}</span>
      <div className="muted" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
        {remaining.length} {remaining.length === 1 ? 'Grand Prix' : 'Grands Prix'} and {sprints} sprint{sprints === 1 ? '' : 's'} left: up to <span className="mono">{available}</span> points.
      </div>
      <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
        Assumes 25 points for a Grand Prix win and 8 for a sprint win, with no fastest-lap point. Ties are decided by countback, which this does not model.
      </div>
    </section>
  );
}

function Career({ driverId }: { driverId: string }) {
  const year = new Date().getFullYear();
  const counts = useQuery({ queryKey: ['career-counts', driverId], queryFn: () => getCareerCounts(driverId), staleTime: 60 * 60_000 });
  // Titles and points need one request per season, so they load after the counts.
  const titles = useQuery({ queryKey: ['career-titles', driverId], enabled: !!counts.data, queryFn: () => getCareerTitles(driverId, year), staleTime: 60 * 60_000 });
  const c = counts.data;
  const t = titles.data;
  const pending = titles.isLoading || (!t && !titles.error);
  const tiles: [string, string | number][] = c
    ? [
        ['Starts', c.starts],
        ['Wins', c.wins],
        ['Podiums', c.podiums],
        ['Poles', c.poles],
        ['Fastest laps', c.fastestLaps],
        ['Titles', t ? t.titles : pending ? '…' : '-'],
        ['Career points', t ? Math.round(t.points) : pending ? '…' : '-'],
      ]
    : [];
  return (
    <section className="card w2" aria-labelledby="career">
      <h2 className="h2" id="career" style={{ marginBottom: 4 }}>Career</h2>
      <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
        {t ? `${t.seasons} season${t.seasons === 1 ? '' : 's'}, all results` : pending && c ? 'Adding up titles and points season by season…' : 'All seasons, all results'}
      </div>
      {counts.error ? <ErrorBox error={counts.error} what="career stats" /> : !c ? <Loading rows={3} /> : (
        <div className="stat-grid three">
          {tiles.map(([l, v]) => (
            <div className="inset stat" key={l}>
              <div className="l">{l}</div>
              <div className="v" style={{ fontSize: 20 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {t && t.missing.length > 0 && (
        <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>
          Titles and points leave out {t.missing.join(', ')}: those seasons could not be loaded. Refresh to try again.
        </div>
      )}
      {titles.error ? <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>Titles and career points could not be loaded. Refresh to try again.</div> : null}
    </section>
  );
}

function CircuitHistory({ driverId, schedule }: { driverId: string; schedule: Parameters<typeof raceStart>[0][] }) {
  const now = useNow(60_000);
  const next = schedule.find((r) => (raceStart(r)?.getTime() ?? 0) + 3 * 3_600_000 > now) ?? schedule[schedule.length - 1];
  const cid = next?.Circuit.circuitId;
  const hist = useQuery({ queryKey: ['circuit-hist', cid, driverId], enabled: !!cid, queryFn: () => getCircuitHistory(cid!, driverId), staleTime: 60 * 60_000 });
  const rows = (hist.data ?? []).filter((r) => r.Results?.length).reverse();
  return (
    <section className="card w2" aria-labelledby="track-hist">
      <h2 className="h2" id="track-hist" style={{ marginBottom: 4 }}>History at {next?.Circuit.Location.locality ?? 'this track'}</h2>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{next ? `${next.Circuit.circuitName}, ${next.raceName}` : ''}</div>
      {hist.error ? <ErrorBox error={hist.error} what="circuit history" /> : hist.isLoading ? <Loading rows={3} /> : rows.length === 0 ? (
        <Empty>No previous races at this circuit.</Empty>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>Season</th><th className="r">Grid</th><th className="r">Finish</th><th className="r">Points</th><th>Team</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const res = r.Results![0];
              return (
                <tr key={r.season}>
                  <td className="mono">{r.season}</td>
                  <td className="r mono">{Number(res.grid) > 0 ? `P${res.grid}` : 'Pit lane'}</td>
                  <td className="r mono" style={{ fontWeight: 600 }}>{/^\d+$/.test(res.positionText) ? `P${res.positionText}` : 'DNF'}</td>
                  <td className="r mono">{res.points}</td>
                  <td className="muted">{res.Constructor.name}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function RaceByRace({ gp, sprint, quali, code }: { gp: RoundRow[]; sprint: RoundRow[]; quali: Parameters<typeof headToHead>[1]; code: string }) {
  const [tab, setTab] = useState<'gp' | 'sprint' | 'quali'>('gp');
  const [all, setAll] = useState(false);
  const qRows = quali
    .map((r) => ({ round: Number(r.round), name: r.raceName.replace(/ Grand Prix$/, ''), q: r.QualifyingResults?.find((x) => x.Driver.code === code) }))
    .filter((r) => r.q)
    .reverse();
  const rows = (tab === 'gp' ? gp : sprint).slice().reverse();
  const count = tab === 'quali' ? qRows.length : rows.length;
  const limit = all ? Infinity : 8;
  return (
    <section className="card" aria-labelledby="rbr">
      <div className="card-head">
        <h2 className="h2" id="rbr">Race by race</h2>
        <div className="tabs" role="tablist" aria-label="Results type" style={{ marginBottom: 0 }}>
          {([['gp', 'Grands Prix'], ['sprint', 'Sprints'], ['quali', 'Qualifying']] as const).map(([k, l]) => (
            <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      {count === 0 ? <Empty>No results yet.</Empty> : (
        <div className="scroll-x">
          {tab === 'quali' ? (
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead><tr><th>Rd</th><th>Grand Prix</th><th className="r">Position</th><th className="r">Q1</th><th className="r">Q2</th><th className="r">Q3</th></tr></thead>
              <tbody>
                {qRows.slice(0, limit).map((r) => (
                  <tr key={r.round}>
                    <td className="mono muted">{r.round}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="r mono" style={{ fontWeight: 600 }}>P{r.q!.position}</td>
                    <td className="r mono">{r.q!.Q1 || '-'}</td>
                    <td className="r mono">{r.q!.Q2 || '-'}</td>
                    <td className="r mono">{r.q!.Q3 || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="tbl" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Rd</th><th>{tab === 'gp' ? 'Grand Prix' : 'Sprint'}</th>
                  {tab === 'gp' && <th className="r">Qualified</th>}
                  <th className="r">Grid</th><th className="r">Finish</th><th className="r">+/-</th><th className="r">Points</th>
                  {tab === 'gp' && <th>Fastest lap</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r) => (
                  <tr key={r.round}>
                    <td className="mono muted">{r.round}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    {tab === 'gp' && <td className="r mono">{r.qualified ? `P${r.qualified}` : '-'}</td>}
                    <td className="r mono">{r.grid ? `P${r.grid}` : 'Pit lane'}</td>
                    <td className="r mono" style={{ fontWeight: 600 }}>{r.finishText}</td>
                    <td className={`r mono ${r.delta == null ? 'faint' : r.delta > 0 ? 'delta-up' : r.delta < 0 ? 'delta-down' : 'muted'}`}>
                      {r.delta == null ? '-' : r.delta > 0 ? `+${r.delta}` : r.delta}
                    </td>
                    <td className="r mono">{r.points}</td>
                    {tab === 'gp' && <td className={`mono ${r.fastestRank === 1 ? 'tone-overall' : ''}`}>{r.fastestLap ? `${r.fastestLap}${r.fastestRank === 1 ? ' (fastest)' : ''}` : '-'}</td>}
                    <td className="muted">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {count > 8 && (
        <button className="btn" style={{ marginTop: 12 }} onClick={() => setAll(!all)}>
          {all ? 'Show recent 8' : `Show all ${count} rounds`}
        </button>
      )}
    </section>
  );
}

/** Results from this race weekend's finished sessions, plus the latest team radio. */
function ThisWeekend({ code }: { code: string }) {
  const sessions = useLatestSessions();
  const now = useNow(60_000);
  const done: Session[] = (sessions.data ?? []).filter((s) => Date.parse(s.date_end) < now);
  const drivers = useQuery({ queryKey: ['of1-drivers-latest'], queryFn: () => openf1<OF1Driver>('drivers', { session_key: 'latest' }), staleTime: 30 * 60_000 });
  const num = drivers.data?.find((d) => d.name_acronym === code)?.driver_number;
  const keys = done.map((s) => s.session_key).join(',');
  const res = useQuery({
    queryKey: ['weekend-res', keys, num],
    enabled: !!num && done.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const out: { s: Session; r: SessionResult | undefined }[] = [];
      for (const s of done) out.push({ s, r: (await openf1<SessionResult>('session_result', { session_key: s.session_key, driver_number: num })).at(0) });
      return out;
    },
  });
  const last = done[done.length - 1];
  const radio = useQuery({
    queryKey: ['radio-last', last?.session_key, num],
    enabled: !!num && !!last,
    staleTime: 10 * 60_000,
    queryFn: () => openf1<TeamRadio>('team_radio', { session_key: last!.session_key, driver_number: num }),
  });
  if (!done.length || !num) return null;
  return (
    <div className="row">
      <section className="card w3" aria-labelledby="weekend">
        <div className="card-head">
          <h2 className="h2" id="weekend">This weekend: {done[0].location}</h2>
          <a className="link" href={href('live')}>Live Timing →</a>
        </div>
        {res.isLoading ? <Loading rows={3} /> : (
          <table className="tbl">
            <thead><tr><th>Session</th><th className="r">Position</th><th className="r">Laps</th><th className="r">Time / gap</th></tr></thead>
            <tbody>
              {(res.data ?? []).map(({ s, r }) => (
                <tr key={s.session_key}>
                  <td style={{ fontWeight: 600 }}>{s.session_name}</td>
                  <td className="r mono" style={{ fontWeight: 600 }}>{r?.dsq ? 'DSQ' : r?.dns ? 'DNS' : r?.dnf ? 'DNF' : r?.position ? `P${r.position}` : '-'}</td>
                  <td className="r mono">{r?.number_of_laps ?? '-'}</td>
                  <td className="r mono">{sessionTime(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card w2" aria-labelledby="radio-last">
        <h2 className="h2" id="radio-last" style={{ marginBottom: 4 }}>Team radio</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{last.session_name}</div>
        {radio.isLoading ? <Loading rows={2} /> : <RadioList clips={radio.data ?? []} />}
      </section>
    </div>
  );
}

/** Session results give a duration (or one per qualifying part) and a gap. */
function sessionTime(r: SessionResult | undefined): string {
  if (!r) return '-';
  const pick = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? ([...v].reverse().find((x) => x != null) ?? null) : v);
  const gap = pick(r.gap_to_leader);
  if (r.position === 1 || gap === 0) {
    const d = pick(r.duration);
    return typeof d === 'number' ? (d > 600 ? new Date(d * 1000).toISOString().slice(11, 19) : fmtLap(d)) : '-';
  }
  return typeof gap === 'number' ? `+${gap.toFixed(3)}` : gap ? String(gap) : '-';
}
