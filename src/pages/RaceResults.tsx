import { ProvisionalNote } from '../components/ProvisionalNote';
import { provisionalSoon, type ProvisionalTag } from '../hooks/useSeason';
import { provisionalWeekends } from '../api/provisional';
import { AddToCalendar } from '../components/AddToCalendar';
import { RaceTyreStrategy } from '../components/TyreStrategy';
import { RaceStory } from '../components/RaceStory';
import { LapCompare } from '../components/LapCompare';
import { RacePace } from '../components/RacePace';
import { RacePitStops } from '../components/PitStops';
import { SpoilerCover } from '../components/SpoilerCover';
import { useSpoilers } from '../hooks/useSpoilers';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRound, SESSION_FIELDS, type Race, type Result, type RoundData } from '../api/jolpica';
import { CircuitOverview } from '../components/CircuitOverview';
import { PositionChart } from '../components/PositionChart';
import { WeekendWeather } from '../components/WeekendWeather';
import { Footer } from '../components/Shell';
import { Empty, ErrorBox, Loading } from '../components/States';
import { useFavourite, useFavouriteTeam } from '../hooks/useFavourite';
import { useNow } from '../hooks/usePoll';
import { useSchedule } from '../hooks/useSeason';
import { isClassified } from '../lib/driverStats';
import { fmtWeekdayDate, fmtDayMonth, fmtShortClock, raceStart, timeZoneLabel, toDate } from '../lib/format';
import { driverHref, href, raceHref, teamHref, useRouteParam } from '../lib/router';
import { rowProps } from '../lib/rowStyle';
import { useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';

type Tab = 'race' | 'sprint' | 'quali';

/** Results of one round: race, sprint and qualifying, for the season in the season picker. */
export function RaceResults() {
  const param = useRouteParam();
  const { season: picked } = useSettings();
  // A season in the address (from history tables) wins over the season picker.
  const [fixedSeason, round] = param.includes('/') ? param.split('/') : ['', param];
  const season = fixedSeason || picked;
  const schedule = useSchedule(season);
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ['round', season, round],
    enabled: !!round,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [d, p] = await Promise.all([getRound(season, round), provisionalSoon(season, () => qc.invalidateQueries({ queryKey: ['round', season, round] }))]);
      // The latest weekend, before Jolpica has it: the official classification from OpenF1, marked provisional.
      const w = p ? provisionalWeekends(p).find((x) => String(x.round) === round) : undefined;
      if (!w) return d as RoundData & ProvisionalTag;
      return {
        ...d,
        race: d.race?.Results?.length ? d.race : (w.race ?? d.race),
        sprint: d.sprint?.SprintResults?.length ? d.sprint : (w.sprint ?? d.sprint),
        provisional: { raceName: w.raceName, sessions: w.sessions },
      } as RoundData & ProvisionalTag;
    },
  });
  const now = useNow(60_000);
  const spoilers = useSpoilers();
  // Spoiler-free mode: this weekend's results stay covered (current season only).
  const hidden = !fixedSeason && picked === 'current' && spoilers.on && spoilers.weekend?.round === round;
  const [tab, setTab] = useState<Tab>('race');

  const races = schedule.data ?? [];
  const idx = races.findIndex((r) => r.round === round);
  const info: Race | undefined = races[idx] ?? data.data?.race;
  const prev = idx > 0 ? races[idx - 1] : undefined;
  const next = idx >= 0 && idx < races.length - 1 ? races[idx + 1] : undefined;

  if (!round) return <Empty>Pick a race from the Calendar.</Empty>;
  if (schedule.error) return <ErrorBox error={schedule.error} what="the calendar" />;
  if (schedule.isLoading) return <Loading rows={8} />;
  if (!info) {
    return (
      <section className="card">
        <Empty>There is no round {round} in this season. <a className="link" href={href('calendar')}>Back to the Calendar</a></Empty>
      </section>
    );
  }

  const results = data.data?.race?.Results ?? [];
  const sprint = data.data?.sprint?.SprintResults ?? [];
  const quali = data.data?.quali?.QualifyingResults ?? [];
  const start = raceStart(info);
  const finished = results.length > 0;
  const upcoming = !finished && (!start || start.getTime() > now);
  const tabs: [Tab, string, number][] = [
    ['race', 'Race', results.length],
    ['sprint', 'Sprint', sprint.length],
    ['quali', 'Qualifying', quali.length],
  ];
  const shownTab: Tab = tab === 'sprint' && !sprint.length ? 'race' : tab;
  // The weekend has started once its first session has (practice lap times can be compared from then on).
  const firstSession = Math.min(...[...SESSION_FIELDS.map((f) => toDate(info[f.key] as Race['FirstPractice'])), start].filter((d): d is Date => !!d).map((d) => d.getTime()));
  const weekendStarted = finished || firstSession < now;

  return (
    <>
      <nav aria-label="Races" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <a className="link" href={href('calendar')}>← Calendar</a>
        <span style={{ display: 'flex', gap: 16 }}>
          {prev && <a className="link" href={raceHref(prev.round, fixedSeason)}>‹ R{prev.round} {prev.raceName.replace(/ Grand Prix$/, '')}</a>}
          {next && <a className="link" href={raceHref(next.round, fixedSeason)}>R{next.round} {next.raceName.replace(/ Grand Prix$/, '')} ›</a>}
        </span>
      </nav>

      <section className="card" aria-labelledby="race-title">
        <p className="kicker">
          Round {info.round} of {races.length} · {info.season}
        </p>
        <h1 className="race-title" id="race-title" style={{ marginTop: 6 }}>{info.raceName}</h1>
        <div className="muted" style={{ marginTop: 6 }}>
          {info.Circuit.circuitName} · {info.Circuit.Location.locality}, {info.Circuit.Location.country}
          {start ? ` · ${fmtDayMonth(start)}` : ''}
        </div>
        {finished && !hidden && <Podium results={results} />}
        {/* Only for races still to come (not while a past race's results are loading). */}
        {!finished && !!start && start.getTime() > now && <div style={{ marginTop: 12 }}><AddToCalendar races={[info]} /></div>}
      </section>

      <CircuitOverview race={info} />
      <WeekendWeather race={info} now={now} />

      {upcoming ? (
        <section className="card" aria-labelledby="sched">
          <div className="card-head">
            <h2 className="h2" id="sched">Weekend schedule</h2>
            <span className="muted" style={{ fontSize: 12 }}>Times in {timeZoneLabel()}</span>
          </div>
          <div className="sessions">
            {[...SESSION_FIELDS.map((f) => ({ label: f.label, d: toDate(info[f.key] as Race['FirstPractice']) })), { label: 'Race', d: start }]
              .filter((s) => s.d)
              .sort((a, b) => a.d!.getTime() - b.d!.getTime())
              .map((s) => (
                <div className="item" key={s.label}>
                  <div className="name">{s.label}</div>
                  <div className="when">
                    <span className="when-date">{fmtWeekdayDate(s.d!)}</span>
                    <span className="when-time">{fmtShortClock(s.d!)}</span>
                  </div>
                </div>
              ))}
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>Results appear here after each session. During the weekend, <a className="link" style={{ display: 'inline' }} href={href('live')}>Live Timing</a> has the live data.</p>
        </section>
      ) : (
        <section className="card" aria-labelledby="res">
          <div className="card-head">
            <h2 className="h2" id="res">Results</h2>
            <ProvisionalNote data={data.data} />
            <div className="tabs" role="tablist" aria-label="Session" style={{ marginBottom: 0 }}>
              {tabs.filter(([k, , n]) => k !== 'sprint' || n > 0).map(([k, label]) => (
                <button key={k} role="tab" className="tab" aria-selected={shownTab === k} onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>
          </div>
          {hidden ? <SpoilerCover what="Results" /> : data.error ? <ErrorBox error={data.error} what="the results" /> : data.isLoading ? <Loading rows={12} /> : shownTab === 'quali' ? (
            <QualiTable rows={quali} />
          ) : (
            <ResultsTable rows={shownTab === 'sprint' ? sprint : results} showFastest={shownTab === 'race'} />
          )}
        </section>
      )}
      {finished && !hidden && Number(info.season) >= 2023 && shownTab !== 'quali' && (
        <section className="card" aria-labelledby="story">
          <div className="card-head">
            <h2 className="h2" id="story">Race story{shownTab === 'sprint' ? ': sprint' : ''}</h2>
          </div>
          <RaceStory key={shownTab} race={info} results={shownTab === 'sprint' ? sprint : results} sprint={shownTab === 'sprint'} />
        </section>
      )}
      {finished && !hidden && Number(info.season) >= 2023 && shownTab !== 'quali' && (
        <section className="card" aria-labelledby="positions">
          <div className="card-head">
            <h2 className="h2" id="positions">Positions lap by lap{shownTab === 'sprint' ? ': sprint' : ''}</h2>
          </div>
          <PositionChart key={shownTab} race={info} results={shownTab === 'sprint' ? sprint : results} sprint={shownTab === 'sprint'} />
        </section>
      )}
      {finished && !hidden && Number(info.season) >= 2023 && shownTab !== 'quali' && (
        <section className="card" aria-labelledby="strategy">
          <div className="card-head">
            <h2 className="h2" id="strategy">Tyre strategy{shownTab === 'sprint' ? ': sprint' : ''}</h2>
          </div>
          <RaceTyreStrategy key={shownTab} race={info} results={shownTab === 'sprint' ? sprint : results} sprint={shownTab === 'sprint'} />
        </section>
      )}
      {finished && !hidden && Number(info.season) >= 2023 && shownTab !== 'quali' && (
        <section className="card" aria-labelledby="pace">
          <div className="card-head">
            <h2 className="h2" id="pace">Race pace and tyre wear{shownTab === 'sprint' ? ': sprint' : ''}</h2>
          </div>
          <RacePace key={shownTab} race={info} results={shownTab === 'sprint' ? sprint : results} sprint={shownTab === 'sprint'} />
        </section>
      )}
      {finished && !hidden && Number(info.season) >= 2023 && shownTab !== 'quali' && (
        <section className="card" aria-labelledby="pits">
          <div className="card-head">
            <h2 className="h2" id="pits">Pit stops{shownTab === 'sprint' ? ': sprint' : ''}</h2>
          </div>
          <RacePitStops key={shownTab} race={info} results={shownTab === 'sprint' ? sprint : results} sprint={shownTab === 'sprint'} />
        </section>
      )}
      {weekendStarted && !hidden && Number(info.season) >= 2023 && (
        <section className="card" aria-labelledby="lapcmp">
          <div className="card-head">
            <h2 className="h2" id="lapcmp">Lap time comparison</h2>
          </div>
          <LapCompare race={info} now={now} />
        </section>
      )}
      <Footer />
    </>
  );
}

function Podium({ results }: { results: Result[] }) {
  return (
    <div className="row" style={{ marginTop: 16 }}>
      {results.slice(0, 3).map((r) => (
        <div key={r.Driver.driverId} className="podium inset w1" style={{ borderTop: `3px solid ${teamColour(r.Constructor.constructorId)}` }}>
          <div className="p">P{r.position}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {r.Driver.code ? (
              <a className="name-link" href={driverHref(r.Driver.code)}>{r.Driver.givenName} {r.Driver.familyName}</a>
            ) : (
              <span style={{ fontWeight: 600 }}>{r.Driver.givenName} {r.Driver.familyName}</span>
            )}
            <div className="muted" style={{ fontSize: 12 }}><a className="name-link" style={{ fontWeight: 400, padding: '2px 0' }} href={teamHref(r.Constructor.constructorId)}>{r.Constructor.name}</a></div>
          </div>
          <div className="mono" style={{ fontSize: 13 }}>{r.Time?.time ?? r.status}</div>
        </div>
      ))}
    </div>
  );
}

function DriverCell({ r }: { r: { Driver: Result['Driver']; Constructor: Result['Constructor'] } }) {
  const fav = useFavourite();
  return (
    <div className="who">
      <span className="team-bar" style={{ background: teamColour(r.Constructor.constructorId) }} />
      {r.Driver.code ? (
        <a className="name-link" href={driverHref(r.Driver.code)}>{r.Driver.givenName} {r.Driver.familyName}</a>
      ) : (
        <span style={{ fontWeight: 600 }}>{r.Driver.givenName} {r.Driver.familyName}</span>
      )}
      {fav?.code === r.Driver.code && <span className="fav-star" role="img" aria-label="Favourite">★</span>}
    </div>
  );
}

function ResultsTable({ rows, showFastest }: { rows: Result[]; showFastest: boolean }) {
  const fav = useFavourite();
  const team = useFavouriteTeam();
  if (!rows.length) return <Empty>No results for this session.</Empty>;
  return (
    <div className="scroll-x">
      <table className="tbl" style={{ minWidth: 820 }}>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th className="r">Grid</th>
            <th className="r">+/-</th>
            <th className="r">Laps</th>
            <th className="r">Time / status</th>
            {showFastest && <th>Fastest lap</th>}
            <th className="r">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const grid = Number(r.grid);
            const pos = isClassified(r) ? Number(r.positionText) : null;
            const delta = grid > 0 && pos ? grid - pos : null;
            const fastest = r.FastestLap?.rank === '1';
            return (
              <tr key={r.Driver.driverId} {...rowProps(r.Driver.code, fav?.code, team)}>
                <td className="mono muted">{pos ?? r.positionText}</td>
                <td><DriverCell r={r} /></td>
                <td><a className="name-link" style={{ fontWeight: 400, color: 'var(--muted)' }} href={teamHref(r.Constructor.constructorId)}>{r.Constructor.name}</a></td>
                <td className="r mono">{r.grid == null ? '-' : grid > 0 ? grid : 'Pit lane'}</td>
                <td className={`r mono ${delta == null ? 'faint' : delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'muted'}`}>{delta == null ? '-' : delta > 0 ? `+${delta}` : delta}</td>
                <td className="r mono">{r.laps ?? '-'}</td>
                <td className="r mono">{r.Time?.time ?? r.status}</td>
                {showFastest && <td className={`mono ${fastest ? 'tone-overall' : ''}`}>{r.FastestLap?.Time?.time ? `${r.FastestLap.Time.time}${fastest ? ' (fastest)' : ''}` : '-'}</td>}
                <td className="r mono" style={{ fontWeight: 600 }}>{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QualiTable({ rows }: { rows: { position: string; Driver: Result['Driver']; Constructor: Result['Constructor']; Q1?: string; Q2?: string; Q3?: string }[] }) {
  const fav = useFavourite();
  const team = useFavouriteTeam();
  if (!rows.length) return <Empty>No qualifying results for this race.</Empty>;
  return (
    <div className="scroll-x">
      <table className="tbl" style={{ minWidth: 640 }}>
        <thead>
          <tr><th>Pos</th><th>Driver</th><th>Team</th><th className="r">Q1</th><th className="r">Q2</th><th className="r">Q3</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.Driver.driverId} {...rowProps(r.Driver.code, fav?.code, team)}>
              <td className="mono muted">{r.position}</td>
              <td><DriverCell r={r} /></td>
              <td><a className="name-link" style={{ fontWeight: 400, color: 'var(--muted)' }} href={teamHref(r.Constructor.constructorId)}>{r.Constructor.name}</a></td>
              <td className="r mono">{r.Q1 || '-'}</td>
              <td className="r mono">{r.Q2 || '-'}</td>
              <td className="r mono">{r.Q3 || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
