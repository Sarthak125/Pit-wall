import type React from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQualifying, getTeamCircuitHistory, type ConstructorStanding, type Race, type RaceWithResults, type Result } from '../api/jolpica';
import { openf1, type OF1Driver, type Session, type SessionResult, type TeamRadio } from '../api/openf1';
import { FavTabs } from '../components/FavTabs';
import { FlagIcon } from '../components/Icons';
import { LiveTeam } from '../components/LiveTeam';
import { RadioList, type DriverLabel } from '../components/RadioList';
import { Footer } from '../components/Shell';
import { Empty, ErrorBox, Loading } from '../components/States';
import { useFavouriteTeam, useLiveSession, type FavouriteTeam } from '../hooks/useFavourite';
import { useNow } from '../hooks/usePoll';
import { useConstructorStandings, useDriverStandings, useLatestSessions, useResults, useSchedule } from '../hooks/useSeason';
import { isClassified } from '../lib/driverStats';
import { raceStart } from '../lib/format';
import { href } from '../lib/router';
import { setFavoriteTeam, useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';
import { Compare } from './MyDriver';

const lighter = (c: string) => `color-mix(in srgb, ${c} 45%, white)`;

export function MyTeam() {
  const team = useFavouriteTeam();
  const { season } = useSettings();
  const teams = useConstructorStandings(season);
  if (!team) {
    return (
      <>
        <FavTabs active="team" />
        <section className="card">
          <h1 className="h2" style={{ marginBottom: 6 }}>My Team</h1>
          <p className="muted" style={{ marginTop: 0 }}>Pick a favourite team to see its stats here, including both cars live during sessions.</p>
          {teams.isLoading ? <Loading rows={6} /> : (
            <div className="driver-grid">
              {(teams.data?.standings ?? []).map((t) => (
                <button
                  key={t.Constructor.constructorId}
                  className="inset driver-card"
                  style={{ borderTopColor: teamColour(t.Constructor.constructorId), cursor: 'pointer', textAlign: 'left', color: 'inherit', '--team': teamColour(t.Constructor.constructorId) } as React.CSSProperties}
                  onClick={() => setFavoriteTeam(t.Constructor.constructorId, t.Constructor.name)}
                >
                  <span className="team-flag"><FlagIcon /></span>
                  <span>
                    <span style={{ fontWeight: 600, display: 'block' }}>{t.Constructor.name}</span>
                    <span className="muted" style={{ fontSize: 12 }}>P{t.position ?? t.positionText} · {t.points} pts</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        <Footer />
      </>
    );
  }
  return <TeamProfile team={team} season={season} />;
}

interface RoundTeam {
  round: number;
  name: string;
  results: Result[];
  sprint: Result[];
  points: number;
}

function TeamProfile({ team, season }: { team: FavouriteTeam; season: string }) {
  const teams = useConstructorStandings(season);
  const drivers = useDriverStandings(season);
  const results = useResults(season);
  const schedule = useSchedule(season);
  const quali = useQuery({ queryKey: ['quali-all', season], queryFn: () => getQualifying(season), staleTime: 15 * 60_000 });
  const liveSession = useLiveSession();
  const liveDrivers = useQuery({
    queryKey: ['drv', liveSession?.session_key],
    enabled: !!liveSession,
    queryFn: () => openf1<OF1Driver>('drivers', { session_key: liveSession!.session_key }),
    staleTime: 10 * 60_000,
  });
  const inLive = !!liveSession && !!liveDrivers.data?.some((d) => team.codes.has(d.name_acronym));

  const list = teams.data?.standings ?? [];
  const idx = list.findIndex((t) => t.Constructor.constructorId === team.id);
  const me = list[idx];
  const races = useMemo(() => results.data?.races ?? [], [results.data]);
  const sprints = useMemo(() => results.data?.sprints ?? [], [results.data]);
  const mine = (r: Result) => r.Constructor.constructorId === team.id;

  const rounds: RoundTeam[] = useMemo(
    () =>
      races
        .filter((r) => r.Results?.some(mine))
        .map((r) => {
          const res = (r.Results ?? []).filter(mine);
          const sp = (sprints.find((s) => s.round === r.round)?.SprintResults ?? []).filter(mine);
          return { round: Number(r.round), name: r.raceName.replace(/ Grand Prix$/, ''), results: res, sprint: sp, points: [...res, ...sp].reduce((a, x) => a + (Number(x.points) || 0), 0) };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [races, sprints, team.id],
  );

  // The two drivers with the most points for the team this season.
  const pair = useMemo(() => {
    const pts = new Map<string, number>();
    for (const r of rounds) for (const x of [...r.results, ...r.sprint]) pts.set(x.Driver.code ?? '', (pts.get(x.Driver.code ?? '') ?? 0) + Number(x.points));
    return [...pts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).filter(Boolean).slice(0, 2);
  }, [rounds]);
  const colours = [team.colour, lighter(team.colour)];

  const all = rounds.flatMap((r) => r.results);
  const classified = all.filter(isClassified).map((x) => Number(x.positionText));
  const best = classified.length ? Math.min(...classified) : null;
  const doneRound = races.reduce((m, r) => (r.Results?.length ? Math.max(m, Number(r.round)) : m), 0);
  const stats: [string, string | number, string][] = [
    ['Wins', classified.filter((p) => p === 1).length, ''],
    ['Podiums', classified.filter((p) => p <= 3).length, ''],
    ['One-two finishes', rounds.filter((r) => r.results.filter(isClassified).map((x) => Number(x.positionText)).sort((a, b) => a - b).join() === '1,2').length, ''],
    ['Double points', `${rounds.filter((r) => r.results.length >= 2 && r.results.every((x) => Number(x.points) > 0)).length} / ${rounds.length}`, 'both cars scored'],
    ['Poles', (quali.data ?? []).filter((q) => q.QualifyingResults?.find((x) => x.position === '1')?.Constructor.constructorId === team.id).length, ''],
    ['Front-row starts', all.filter((x) => Number(x.grid) > 0 && Number(x.grid) <= 2).length, 'cars'],
    ['Fastest laps', all.filter((x) => x.FastestLap?.rank === '1').length, ''],
    ['DNFs', all.filter((x) => !isClassified(x)).length, 'both cars'],
    ['Best result', best ? `P${best}` : '-', best ? `${classified.filter((p) => p === best).length} time${classified.filter((p) => p === best).length === 1 ? '' : 's'}` : ''],
    ['Average finish', classified.length ? (classified.reduce((a, b) => a + b, 0) / classified.length).toFixed(1) : '-', 'classified cars'],
    ['Points per race', rounds.length && me ? (Number(me.points) / rounds.length).toFixed(1) : '-', 'incl. sprints'],
    ['Sprint points', rounds.reduce((a, r) => a + r.sprint.reduce((b, x) => b + Number(x.points), 0), 0), ''],
  ];
  const seasonLabel = schedule.data?.[0]?.season ?? (season === 'current' ? String(new Date().getFullYear()) : season);

  if (teams.error) return <ErrorBox error={teams.error} what="constructor standings" />;
  if (teams.isLoading) return <Loading rows={10} />;

  return (
    <>
      <FavTabs active="team" />
      <section className="card profile-head" style={{ borderLeftColor: team.colour, '--team': team.colour } as React.CSSProperties}>
        <span className="team-flag" style={{ width: 72, height: 72, borderRadius: 16, background: `color-mix(in srgb, ${team.colour} 18%, black)`, justifyContent: 'center', alignItems: 'center', flex: 'none' }}>
          <FlagIcon filled size={34} />
        </span>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div className="kicker">Your team</div>
          <h1>{me?.Constructor.name ?? team.name}</h1>
          <div className="muted" style={{ marginTop: 6 }}>{pair.join(' · ')}{me?.Constructor.nationality ? ` · ${me.Constructor.nationality}` : ''}</div>
        </div>
        {me && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div className="inset big-tile"><div className="kicker" style={{ fontSize: 11 }}>Constructors</div><div className="v">P{me.position ?? me.positionText}</div></div>
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
        <button className="flag-btn" style={{ width: 44, height: 44 }} aria-pressed="true" aria-label={`Remove ${team.name} as your team`} onClick={() => setFavoriteTeam(team.id, team.name)}>
          <FlagIcon filled />
        </button>
      </section>

      {inLive && liveSession && <LiveTeam session={liveSession} team={team} />}

      {!me ? (
        <section className="card"><Empty>{team.name} has no results in the {seasonLabel} season.</Empty></section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <h2 className="h2">{seasonLabel} season</h2>
              <span className="muted" style={{ fontSize: 12 }}>After round {doneRound}{schedule.data ? ` of ${schedule.data.length}` : ''}</span>
            </div>
            {results.isLoading || quali.isLoading ? <Loading rows={3} /> : (
              <div className="tile-grid">
                {stats.map(([l, v, n]) => (
                  <div className="inset tile" key={l}>
                    <div className="l">{l}</div>
                    <div className="v">{v}</div>
                    {n ? <div className="n">{n}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="row">
            <section className="card w3" aria-labelledby="ppr">
              <div className="card-head">
                <h2 className="h2" id="ppr">Points per round</h2>
                <div className="legend">
                  {pair.map((c, i) => (
                    <span key={c}><i className="sw" style={{ background: colours[i] }} />{c}</span>
                  ))}
                </div>
              </div>
              {rounds.length ? <PointsBars rounds={rounds} pair={pair} colours={colours} /> : <Empty>No races yet.</Empty>}
            </section>
            <div className="col w2">
              {pair.length === 2 && (
                <Compare code={pair[0]} standings={drivers.data?.standings ?? []} races={races} quali={quali.data ?? []} colour={team.colour} />
              )}
              <TeamTitleMaths me={me} list={list} schedule={schedule.data ?? []} doneRound={doneRound} sprintsDone={new Set(sprints.filter((s) => s.SprintResults?.length).map((s) => s.round))} />
            </div>
          </div>

          <div className="row">
            <TeamCircuitHistory team={team} schedule={schedule.data ?? []} />
          </div>

          <TeamRaceByRace rounds={rounds} pair={pair} />
        </>
      )}

      {!inLive && <TeamWeekend team={team} colours={colours} />}
      <Footer />
    </>
  );
}

function PointsBars({ rounds, pair, colours }: { rounds: RoundTeam[]; pair: string[]; colours: string[] }) {
  const max = Math.max(1, ...rounds.map((r) => r.points));
  const per = (r: RoundTeam, code: string) => [...r.results, ...r.sprint].filter((x) => x.Driver.code === code).reduce((a, x) => a + Number(x.points), 0);
  return (
    <>
      <div className="stack-bars" role="img" aria-label="Team points per round, split by driver">
        {rounds.map((r) => (
          <div key={r.round} title={`R${r.round} ${r.name}: ${r.points} pts (${pair.map((c) => `${c} ${per(r, c)}`).join(', ')})`}>
            {[...pair].reverse().map((c) => {
              const i = pair.indexOf(c);
              return <div key={c} style={{ height: `${(per(r, c) / max) * 140}px`, background: colours[i], borderRadius: i === 1 ? '2px 2px 0 0' : undefined }} />;
            })}
          </div>
        ))}
      </div>
      <div className="mono faint" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 6 }}>
        <span>R{rounds[0].round}</span>
        <span>Most: {max} pts</span>
        <span>R{rounds[rounds.length - 1].round}</span>
      </div>
    </>
  );
}

function TeamTitleMaths({ me, list, schedule, doneRound, sprintsDone }: { me: ConstructorStanding; list: ConstructorStanding[]; schedule: Race[]; doneRound: number; sprintsDone: Set<string> }) {
  const remaining = schedule.filter((r) => Number(r.round) > doneRound);
  const sprints = remaining.filter((r) => r.Sprint && !sprintsDone.has(r.round)).length;
  // A team can score at most a one-two: 25 + 18 per Grand Prix and 8 + 7 per sprint.
  const available = remaining.length * 43 + sprints * 15;
  const pts = Number(me.points);
  const leader = Number(list[0]?.points ?? 0);
  const isLeader = list[0] === me;
  const second = Number(list[1]?.points ?? 0);
  let verdict: string, tone: string;
  if (remaining.length === 0) {
    verdict = isLeader ? 'Season finished: constructors’ champions.' : `Season finished: P${me.position ?? me.positionText}.`;
    tone = isLeader ? 'tone-green' : 'tone-grey';
  } else if (isLeader) {
    verdict = pts - second > available ? 'Champions: the lead can no longer be overcome.' : `Leads by ${pts - second}.`;
    tone = 'tone-green';
  } else if (leader - pts > available) {
    verdict = 'Can no longer win the constructors’ title.';
    tone = 'tone-grey';
  } else {
    verdict = `Can still win: ${leader - pts} behind with ${available} points left.`;
    tone = 'tone-amber';
  }
  return (
    <section className="card tight" aria-labelledby="team-maths">
      <h2 className="h2 sm" id="team-maths" style={{ marginBottom: 10 }}>Title maths</h2>
      <span className={`pill ${tone}`} style={{ fontSize: 13, whiteSpace: 'normal' }}>{verdict}</span>
      <div className="muted" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
        {remaining.length} {remaining.length === 1 ? 'Grand Prix' : 'Grands Prix'} and {sprints} sprint{sprints === 1 ? '' : 's'} left: up to <span className="mono">{available}</span> points for one team.
      </div>
      <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>Assumes a one-two at every remaining event (25 + 18, sprints 8 + 7), with no fastest-lap point.</div>
    </section>
  );
}

function TeamCircuitHistory({ team, schedule }: { team: FavouriteTeam; schedule: Race[] }) {
  const now = useNow(60_000);
  const next = schedule.find((r) => (raceStart(r)?.getTime() ?? 0) + 3 * 3_600_000 > now) ?? schedule[schedule.length - 1];
  const cid = next?.Circuit.circuitId;
  const hist = useQuery({ queryKey: ['team-circuit', cid, team.id], enabled: !!cid, queryFn: () => getTeamCircuitHistory(cid!, team.id), staleTime: 60 * 60_000 });
  const rows = (hist.data ?? []).filter((r) => r.Results?.length).reverse().slice(0, 10);
  return (
    <section className="card" style={{ flex: 1, minWidth: 0 }} aria-labelledby="team-hist">
      <h2 className="h2" id="team-hist" style={{ marginBottom: 4 }}>{team.name} at {next?.Circuit.Location.locality ?? 'this track'}</h2>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{next ? `${next.Circuit.circuitName}, last ${rows.length || ''} visits` : ''}</div>
      {hist.isLoading ? <Loading rows={3} /> : rows.length === 0 ? <Empty>No previous races at this circuit.</Empty> : (
        <div className="scroll-x">
          <table className="tbl" style={{ minWidth: 420 }}>
            <thead><tr><th>Season</th><th>Results</th><th className="r">Points</th></tr></thead>
            <tbody>
              {rows.map((r: RaceWithResults) => (
                <tr key={r.season}>
                  <td className="mono">{r.season}</td>
                  <td>
                    {(r.Results ?? []).map((x) => `${x.Driver.code ?? x.Driver.familyName} ${isClassified(x) ? `P${x.positionText}` : 'DNF'}`).join(' · ')}
                  </td>
                  <td className="r mono">{(r.Results ?? []).reduce((a, x) => a + Number(x.points), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TeamRaceByRace({ rounds, pair }: { rounds: RoundTeam[]; pair: string[] }) {
  const [all, setAll] = useState(false);
  const list = [...rounds].reverse();
  const shown = all ? list : list.slice(0, 8);
  const cell = (r: RoundTeam, code: string) => {
    const x = r.results.find((y) => y.Driver.code === code);
    if (!x) return { text: '-', grid: '' };
    return { text: isClassified(x) ? `P${x.positionText}` : 'DNF', grid: Number(x.grid) > 0 ? `from P${x.grid}` : 'from pit lane' };
  };
  return (
    <section className="card" aria-labelledby="team-rbr">
      <h2 className="h2" id="team-rbr" style={{ marginBottom: 12 }}>Race by race</h2>
      {rounds.length === 0 ? <Empty>No results yet.</Empty> : (
        <div className="scroll-x">
          <table className="tbl" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Rd</th><th>Grand Prix</th>
                {pair.map((c) => <th key={c} className="r">{c}</th>)}
                <th className="r">Team points</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.round}>
                  <td className="mono muted">{r.round}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  {pair.map((c) => {
                    const v = cell(r, c);
                    return (
                      <td key={c} className="r">
                        <span className="mono" style={{ fontWeight: 600 }}>{v.text}</span> <span className="faint" style={{ fontSize: 12 }}>{v.grid}</span>
                      </td>
                    );
                  })}
                  <td className="r mono" style={{ fontWeight: 600 }}>{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length > 8 && <button className="btn" style={{ marginTop: 12 }} onClick={() => setAll(!all)}>{all ? 'Show recent 8' : `Show all ${list.length} rounds`}</button>}
    </section>
  );
}

/** This weekend's finished sessions for both cars, plus the latest team radio. */
function TeamWeekend({ team, colours }: { team: FavouriteTeam; colours: string[] }) {
  const sessions = useLatestSessions();
  const now = useNow(60_000);
  const done: Session[] = (sessions.data ?? []).filter((s) => Date.parse(s.date_end) < now);
  const drivers = useQuery({ queryKey: ['of1-drivers-latest'], queryFn: () => openf1<OF1Driver>('drivers', { session_key: 'latest' }), staleTime: 30 * 60_000 });
  // Same order as the standings (most points first), so colours match across the page.
  const order = [...team.codes];
  const mine = (drivers.data ?? []).filter((d) => team.codes.has(d.name_acronym)).sort((a, b) => order.indexOf(a.name_acronym) - order.indexOf(b.name_acronym));
  const nums = mine.map((d) => d.driver_number);
  const keys = done.map((s) => s.session_key).join(',');
  const res = useQuery({
    queryKey: ['team-weekend', keys, nums.join(',')],
    enabled: nums.length > 0 && done.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const out: { s: Session; rows: SessionResult[] }[] = [];
      for (const s of done) out.push({ s, rows: (await openf1<SessionResult>('session_result', { session_key: s.session_key })).filter((r) => nums.includes(r.driver_number)) });
      return out;
    },
  });
  const last = done[done.length - 1];
  const radio = useQuery({
    queryKey: ['team-radio-last', last?.session_key, nums.join(',')],
    enabled: nums.length > 0 && !!last,
    staleTime: 10 * 60_000,
    queryFn: async () => (await Promise.all(nums.map((n) => openf1<TeamRadio>('team_radio', { session_key: last!.session_key, driver_number: n })))).flat(),
  });
  if (!done.length || !nums.length) return null;
  const labels = new Map<number, DriverLabel>(mine.map((d, i) => [d.driver_number, { code: d.name_acronym, colour: colours[i] ?? colours[0] }]));
  const show = (r?: SessionResult) => (!r ? '-' : r.dsq ? 'DSQ' : r.dns ? 'DNS' : r.dnf ? 'DNF' : r.position ? `P${r.position}` : '-');
  return (
    <div className="row">
      <section className="card w3" aria-labelledby="team-weekend">
        <div className="card-head">
          <h2 className="h2" id="team-weekend">This weekend: {done[0].location}</h2>
          <a className="link" href={href('live')}>Live Timing →</a>
        </div>
        {res.isLoading ? <Loading rows={3} /> : (
          <table className="tbl">
            <thead>
              <tr><th>Session</th>{mine.map((d) => <th key={d.driver_number} className="r">{d.name_acronym}</th>)}</tr>
            </thead>
            <tbody>
              {(res.data ?? []).map(({ s, rows }) => (
                <tr key={s.session_key}>
                  <td style={{ fontWeight: 600 }}>{s.session_name}</td>
                  {mine.map((d) => <td key={d.driver_number} className="r mono" style={{ fontWeight: 600 }}>{show(rows.find((r) => r.driver_number === d.driver_number))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card w2" aria-labelledby="team-radio">
        <h2 className="h2" id="team-radio" style={{ marginBottom: 4 }}>Team radio</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{last.session_name}</div>
        {radio.isLoading ? <Loading rows={2} /> : <RadioList clips={radio.data ?? []} labels={labels} />}
      </section>
    </div>
  );
}
