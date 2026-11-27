import { OffseasonNote } from '../components/OffseasonNote';
import { ChampionsBanner } from '../components/Champions';
import { ProvisionalNote } from '../components/ProvisionalNote';
import { RainWatch } from '../components/RainWatch';
import { RemindButton } from '../components/RemindButton';
import { AddToCalendar } from '../components/AddToCalendar';
import { SpoilerCover } from '../components/SpoilerCover';
import { useSpoilers } from '../hooks/useSpoilers';
import type React from 'react';
import { useLiveFeedSession } from '../hooks/useLiveFeed';
import { feedMessages, feedWeather } from '../lib/f1adapter';
import { useMemo } from 'react';
import { LiveNowBanner, NextRaceCircuit } from '../components/DashboardExtras';
import { WeekendWeather } from '../components/WeekendWeather';
import { useQuery } from '@tanstack/react-query';
import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { isSessionLive, openf1, type RaceControlMsg, type Session, type Weather } from '../api/openf1';
import { ErrorBox, Empty, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { PointsChart } from '../components/PointsChart';
import { FavouriteStrip } from '../components/FavouriteStrip';
import { StarIcon } from '../components/Icons';
import { useFavourite, useFavouriteTeam } from '../hooks/useFavourite';
import { TeamStrip } from '../components/TeamStrip';
import { rowProps } from '../lib/rowStyle';
import { FlagIcon } from '../components/Icons';
import { useNow } from '../hooks/usePoll';
import {
  pointsProgression,
  useConstructorStandings,
  useDriverStandings,
  useLatestSessions,
  useResults,
  useSchedule,
  type ProgressSeries,
} from '../hooks/useSeason';
import { fmtWeekdayDate, fmtDayMonth, fmtShortClock, pad2, raceStart, splitCountdown, timeZoneLabel, toDate } from '../lib/format';
import { trackStatus } from '../lib/raceControl';
import { driverHref, href, raceHref, teamHref } from '../lib/router';
import { useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';

/** Approximate session lengths, used only to show Done / Live / Next labels. */
const SESSION_MINUTES: Record<string, number> = { Race: 120, Sprint: 60 };

interface WeekendSession {
  label: string;
  start: Date;
}

function weekendSessions(r: Race): WeekendSession[] {
  const list: WeekendSession[] = [];
  for (const f of SESSION_FIELDS) {
    const d = toDate(r[f.key] as Race['FirstPractice']);
    if (d) list.push({ label: f.label, start: d });
  }
  const race = raceStart(r);
  if (race) list.push({ label: 'Race', start: race });
  return list.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function Dashboard() {
  const { season } = useSettings();
  const schedule = useSchedule(season);
  const drivers = useDriverStandings(season);
  const teams = useConstructorStandings(season);
  const results = useResults(season);
  // Spoiler-free mode only applies to the current season.
  const spoilerState = useSpoilers();
  const spoilers = season === 'current' ? spoilerState : { ...spoilerState, standingsHidden: false, raceHidden: () => false };
  const fav = useFavourite();
  const favTeam = useFavouriteTeam();

  const races = useMemo(() => schedule.data ?? [], [schedule.data]);
  const nowMinute = Math.floor(useNow(60_000) / 60_000);
  const nextIdx = useMemo(
    () => races.findIndex((r) => (raceStart(r)?.getTime() ?? 0) + 3 * 3_600_000 > nowMinute * 60_000),
    [races, nowMinute],
  );
  // After the season's last race, the next season's opener once its calendar is published.
  const seasonYear = races[0]?.season ?? '';
  const following = useSchedule(String(Number(seasonYear) + 1), season === 'current' && !!seasonYear && nextIdx < 0);
  const nextRace = nextIdx >= 0 ? races[nextIdx] : following.data?.[0];
  const nextTotal = nextIdx >= 0 ? races.length : (following.data?.length ?? 0);
  // Before a new season's first race, standings and results are last season's (see useSeason).
  const shownSeason = results.data?.offseason?.shown;
  const champSchedule = useSchedule(shownSeason ?? season);
  const doneRounds = new Set((results.data?.races ?? []).filter((r) => r.Results?.length).map((r) => r.round));
  const lastRace = [...(results.data?.races ?? [])].reverse().find((r) => r.Results?.length);

  const series: ProgressSeries[] = useMemo(() => {
    const all = drivers.data?.standings ?? [];
    const top = all.slice(0, 4);
    // Always include the favourite's line, even outside the top 4.
    const favRow = fav ? all.find((d) => d.Driver.code === fav.code) : undefined;
    if (favRow && !top.includes(favRow)) top.push(favRow);
    if (!results.data || !top.length) return [];
    const prog = pointsProgression(results.data.races, results.data.sprints, top.map((d) => d.Driver.driverId));
    const used = new Set<string>();
    return top.map((d) => {
      const colour = teamColour(d.Constructors[0]?.constructorId ?? d.Constructors[0]?.name);
      // Team-mates share their team colour; the second car's line is dashed, as in the other charts.
      const dashed = used.has(colour);
      used.add(colour);
      return { driverId: d.Driver.driverId, code: d.Driver.code ?? d.Driver.familyName.slice(0, 3).toUpperCase(), colour, dashed, points: prog.get(d.Driver.driverId) ?? [] };
    });
  }, [drivers.data, results.data, fav]);

  // Short race names for the chart's tooltip, by round.
  const roundNames = useMemo(() => {
    const names: string[] = [];
    for (const r of results.data?.races ?? []) names[Number(r.round) - 1] = r.raceName.replace(/ Grand Prix$/, '');
    return names;
  }, [results.data]);

  const leaderPts = Number(drivers.data?.standings[0]?.points ?? 0);
  const topTeamPts = Number(teams.data?.standings[0]?.points ?? 0) || 1;

  // Last race podium: under the weekend forecast when there is a next race, otherwise beside the title fight chart.
  const lastRaceCard = (
    <section className={nextRace ? 'card' : 'card w2'} aria-labelledby="last-race" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {lastRace && spoilers.raceHidden(lastRace.season, lastRace.round) ? (
        <>
          <p className="kicker">Last race · Round {lastRace.round}</p>
          <SpoilerCover what="The podium" compact />
        </>
      ) : results.isLoading ? <Loading rows={4} /> : lastRace ? (
        <>
          <div>
            <p className="kicker">Last race · {shownSeason ? `${shownSeason} · ` : ''}Round {lastRace.round} {results.data?.provisional?.raceName === lastRace.raceName && <ProvisionalNote data={results.data} />}</p>
            <h2 className="h2" id="last-race" style={{ marginTop: 4 }}>
              <a className="name-link" style={{ fontWeight: 'inherit' }} href={raceHref(lastRace.round, shownSeason)}>{lastRace.raceName}</a>
            </h2>
          </div>
          {(lastRace.Results ?? []).slice(0, 3).map((r) => (
            <div className="podium inset" key={r.Driver.driverId}>
              <div className="p">P{r.position}</div>
              <span className="team-bar" style={{ height: 32, background: teamColour(r.Constructor.constructorId) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>
                  {r.Driver.code ? (
                    <a className="name-link" style={{ padding: '2px 0' }} href={driverHref(r.Driver.code)}>{r.Driver.givenName} {r.Driver.familyName}</a>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{r.Driver.givenName} {r.Driver.familyName}</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  <a className="name-link" style={{ fontWeight: 400, padding: '2px 0' }} href={teamHref(r.Constructor.constructorId)}>{r.Constructor.name}</a>
                </div>
              </div>
              <div className="mono" style={{ fontSize: 13 }}>
                {r.Time?.time ?? r.status}
              </div>
            </div>
          ))}
          <FastestLap results={lastRace.Results ?? []} />
        </>
      ) : (
        <>
          <h2 className="h2" id="last-race">Last race</h2>
          <Empty>No race results yet this season.</Empty>
        </>
      )}
    </section>
  );

  return (
    <>
      <LiveNowBanner />
      {champSchedule.data && results.data && !spoilers.standingsHidden && (
        <ChampionsBanner
          schedule={champSchedule.data}
          races={results.data.races}
          sprints={results.data.sprints}
          driverCode={(id) => drivers.data?.standings.find((s) => s.Driver.driverId === id)?.Driver.code}
        />
      )}
      <div className="row">
        <section className="card w2l" aria-labelledby="next-race">
          {schedule.error ? <ErrorBox error={schedule.error} what="the race calendar" /> : schedule.isLoading ? <Loading rows={6} /> : nextRace ? (
            <NextRace race={nextRace} total={nextTotal} />
          ) : (
            <SeasonComplete year={seasonYear} upcoming={drivers.data?.offseason?.upcoming ?? results.data?.offseason?.upcoming} />
          )}
        </section>
        <section className="card w1" aria-labelledby="conditions">
          <Conditions race={nextRace} />
        </section>
      </div>

      {nextRace && (
        <div className="row">
          <div className="w2" style={{ minWidth: 0, display: 'flex' }}><NextRaceCircuit race={nextRace} /></div>
          <div className="w3 col" style={{ minWidth: 0 }}>
            <WeekendWeather race={nextRace} now={nowMinute * 60_000} />
            {lastRaceCard}
          </div>
        </div>
      )}

      {!spoilers.standingsHidden && <FavouriteStrip standings={drivers.data?.standings ?? []} races={results.data?.races ?? []} season={season} />}
      <TeamStrip teams={teams.data?.standings ?? []} drivers={drivers.data?.standings ?? []} races={results.data?.races ?? []} />

      <div className="row">
        <section className="card w3" aria-labelledby="wdc">
          <div className="card-head">
            <h2 className="h2" id="wdc">Drivers' Championship</h2>
            <OffseasonNote data={drivers.data} />
            {!spoilers.standingsHidden && <ProvisionalNote data={drivers.data} />}
            <a className="link" href={href('standings')}>View all →</a>
          </div>
          {spoilers.standingsHidden ? <SpoilerCover what="The standings" compact /> : drivers.error ? <ErrorBox error={drivers.error} what="driver standings" /> : drivers.isLoading ? <Loading rows={10} /> : !drivers.data?.standings.length ? (
            <Empty>No standings yet for this season.</Empty>
          ) : (
            <div className="scroll-x">
              <table className="tbl" style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>Pos</th>
                    <th>Driver</th>
                    <th>Team</th>
                    <th className="r">Wins</th>
                    <th className="r">Gap</th>
                    <th className="r">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.data.standings.filter((d, i) => i < 10 || d.Driver.code === fav?.code).map((d, i) => {
                    const team = d.Constructors[d.Constructors.length - 1];
                    return (
                      <tr key={d.Driver.driverId} {...rowProps(d.Driver.code, fav?.code, favTeam)}>
                        <td className="mono muted">{d.position ?? d.positionText}</td>
                        <td>
                          <div className="who">
                            <span className="team-bar" style={{ background: teamColour(team?.constructorId ?? team?.name) }} />
                            {d.Driver.code ? (
                              <a className="name-link" href={driverHref(d.Driver.code)}>
                                {d.Driver.givenName} {d.Driver.familyName}
                              </a>
                            ) : (
                              <span style={{ fontWeight: 600 }}>
                                {d.Driver.givenName} {d.Driver.familyName}
                              </span>
                            )}
                            {fav?.code === d.Driver.code && <span className="fav-star" role="img" aria-label="Favourite"><StarIcon filled size={14} /></span>}
                          </div>
                        </td>
                        <td className="muted">{team ? <a className="name-link" style={{ fontWeight: 400 }} href={teamHref(team.constructorId)}>{team.name}</a> : null}</td>
                        <td className="r mono">{d.wins}</td>
                        <td className="r mono muted">{i === 0 ? 'Leader' : `-${leaderPts - Number(d.points)}`}</td>
                        <td className="r mono" style={{ fontWeight: 600 }}>
                          {d.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card w2" aria-labelledby="wcc">
          <div className="card-head" style={{ marginBottom: 16 }}>
            <h2 className="h2" id="wcc">Constructors' Championship</h2>
            <OffseasonNote data={teams.data} />
            {!spoilers.standingsHidden && <ProvisionalNote data={teams.data} />}
          </div>
          {spoilers.standingsHidden ? <SpoilerCover what="The standings" compact /> : teams.error ? <ErrorBox error={teams.error} what="constructor standings" /> : teams.isLoading ? <Loading rows={8} /> : !teams.data?.standings.length ? (
            <Empty>No standings yet for this season.</Empty>
          ) : (
            <div className="bars">
              {teams.data.standings.map((t) => (
                <div className="bar-row" key={t.Constructor.constructorId}>
                  <div className="pos">{t.position ?? t.positionText}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={favTeam?.id === t.Constructor.constructorId ? { fontWeight: 700 } : undefined}>
                        <a className="name-link" style={{ fontWeight: 'inherit', padding: '4px 0' }} href={teamHref(t.Constructor.constructorId)}>{t.Constructor.name}</a>
                        {favTeam?.id === t.Constructor.constructorId && (
                          <span className="team-flag" style={{ marginLeft: 6, '--team': favTeam.colour } as React.CSSProperties} aria-label="Your team"><FlagIcon filled size={13} /></span>
                        )}
                      </span>
                      <span className="mono">{t.points}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${Math.max(1, (Number(t.points) / topTeamPts) * 100)}%`, background: teamColour(t.Constructor.constructorId) }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="row">
        <section className="card w3" aria-labelledby="fight">
          <div className="card-head">
            <h2 className="h2" id="fight">Title fight: points after each round</h2>
            <OffseasonNote data={results.data} what="season" />
            {!spoilers.standingsHidden && <ProvisionalNote data={results.data} />}
            <div className="legend" hidden={spoilers.standingsHidden}>
              {series.map((s) => (
                <span key={s.driverId}>
                  <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={s.colour} strokeWidth="2.5" strokeDasharray={s.dashed ? '4 3' : undefined} /></svg>
                  {s.code}
                </span>
              ))}
            </div>
          </div>
          {spoilers.standingsHidden ? <SpoilerCover what="The title fight chart" compact /> : results.error ? <ErrorBox error={results.error} what="race results" /> : results.isLoading || drivers.isLoading ? <Loading rows={6} /> : series.length ? (
            <PointsChart series={series} favCode={fav?.code} roundNames={roundNames} />
          ) : (
            <Empty>The chart appears after the first race.</Empty>
          )}
        </section>

        {!nextRace && lastRaceCard}
      </div>

      <section className="card" aria-labelledby="cal">
        <div className="card-head">
          <h2 className="h2" id="cal">
            {races[0]?.season ?? ''} Calendar
          </h2>
          <a className="link" href={href('calendar')}>
            {doneRounds.size} of {races.length} complete · Full calendar →
          </a>
        </div>
        {schedule.isLoading ? (
          <Loading rows={2} />
        ) : (
          <div className="strip">
            {races.map((r, i) => {
              const done = doneRounds.has(r.round) || (nextIdx === -1 ? true : i < nextIdx);
              const isNext = i === nextIdx;
              const d = raceStart(r);
              return (
                <a
                  key={r.round}
                  href={raceHref(r.round)}
                  className={`round ${isNext ? 'next' : done ? 'done' : ''}`}
                  aria-label={`Round ${r.round}, ${r.raceName}: ${isNext ? 'next race' : done ? 'results' : 'schedule'}`}
                >
                  <div className="mono faint" style={{ fontSize: 11 }}>
                    R{r.round} {d ? `· ${fmtDayMonth(d)}` : ''}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{r.Circuit.Location.country}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {isNext ? 'Next' : done ? 'Completed' : 'Upcoming'}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}

function NextRace({ race, total }: { race: Race; total: number }) {
  const now = useNow(1000);
  const start = raceStart(race);
  const sessions = weekendSessions(race);
  const msLeft = start ? start.getTime() - now : 0;
  const cd = splitCountdown(msLeft);
  const nextSessionIdx = sessions.findIndex((s) => s.start.getTime() > now);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="kicker">
          Round {race.round} of {total} · Next race
        </p>
        <div>
          <h1 className="race-title" id="next-race">
            {race.raceName}
          </h1>
          <div className="muted" style={{ marginTop: 6 }}>
            {race.Circuit.circuitName} · {race.Circuit.Location.locality}, {race.Circuit.Location.country}
          </div>
        </div>
        {msLeft > 0 ? (
          <div className="countdown" aria-label={`${cd.days} days ${cd.hours} hours ${cd.minutes} minutes until the race`}>
            {[
              [cd.days, 'DAYS'],
              [cd.hours, 'HRS'],
              [cd.minutes, 'MIN'],
              [cd.seconds, 'SEC'],
            ].map(([v, l]) => (
              <div className="inset" key={l}>
                <div className="v">{pad2(v as number)}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>
        ) : (
          <a className="btn primary" href={href('live')} style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start' }}>
            Race underway: open Live Timing
          </a>
        )}
        <div className="muted" style={{ fontSize: 12 }}>
          Until lights out · times in {timeZoneLabel()}
        </div>
        <div style={{ marginTop: 4 }}>
          <AddToCalendar races={[race]} />
        </div>
      </div>
      <div className="sessions" style={{ flex: '1 1 260px' }}>
        <p className="kicker" style={{ marginBottom: 8 }}>
          Weekend schedule
        </p>
        {sessions.map((s, i) => {
          const end = s.start.getTime() + (SESSION_MINUTES[s.label] ?? 60) * 60_000;
          const live = now >= s.start.getTime() && now <= end;
          const status = live ? 'Live' : now > end ? 'Done' : i === nextSessionIdx ? 'Next' : 'Upcoming';
          const tone = live ? 'tone-solid' : status === 'Done' ? 'tone-grey' : status === 'Next' ? 'tone-red' : 'tone-blue';
          return (
            <div className="item" key={s.label}>
              <div className="name">{s.label}</div>
              <div className="when">
                    <span className="when-date">{fmtWeekdayDate(s.start)}</span>
                    <span className="when-time">{fmtShortClock(s.start)}</span>
                  </div>
              <span className={`pill ${tone}`}>{status}</span>
              <RemindButton race={race} session={s.label} at={s.start} now={now} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** No race to count down to: the season is over and the next calendar is not out yet. */
function SeasonComplete({ year, upcoming }: { year: string; upcoming?: string }) {
  // "upcoming": Jolpica has moved on to the new season but has no calendar for it yet.
  const next = upcoming ?? (year ? String(Number(year) + 1) : '');
  const done = upcoming ? String(Number(upcoming) - 1) : year;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="kicker">{upcoming ? 'Off-season' : 'Season complete'}</p>
      <h1 className="race-title" id="next-race">
        {done ? `That's the ${done} season` : 'No upcoming races'}
      </h1>
      <div className="muted">
        {next ? `The ${next} calendar has not been published yet. The first race shows here with its countdown as soon as it is.` : 'The calendar has no more races.'}
      </div>
      {done && <a className="link" href={href('review')}>The {done} season review →</a>}
    </div>
  );
}

function FastestLap({ results }: { results: { FastestLap?: { rank?: string; Time?: { time: string } }; Driver: { code?: string; familyName: string } }[] }) {
  const f = results.find((r) => r.FastestLap?.rank === '1');
  if (!f?.FastestLap?.Time) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, fontSize: 13 }} className="muted">
      <span>Fastest lap</span>
      <span className="mono" style={{ color: 'var(--purple)' }}>
        {f.Driver.code ?? f.Driver.familyName} · {f.FastestLap.Time.time}
      </span>
    </div>
  );
}

/** Weather and track status from the most recent OpenF1 session. */
function Conditions({ race }: { race?: Race }) {
  const sessions = useLatestSessions();
  // While OpenF1 is paused for a live session, weather and flags come from F1's own feed.
  const { feed, session: feedSess } = useLiveFeedSession();
  const now = useNow(60_000);
  const current: Session | undefined = useMemo(() => {
    const list = sessions.data?.length ? sessions.data : feedSess ? [feedSess] : [];
    return list.find((s) => isSessionLive(s, now)) ?? [...list].reverse().find((s) => Date.parse(s.date_start) <= now);
  }, [sessions.data, feedSess, now]);
  const live = current ? isSessionLive(current, now) : false;
  const useFeed = !!feed && !!feedSess && feedSess.session_key === current?.session_key;
  const sk = useFeed ? undefined : current?.session_key;

  const weather = useQuery({
    queryKey: ['wx', sk],
    enabled: !!sk,
    queryFn: async () => {
      const rows = await openf1<Weather>('weather', { session_key: sk });
      return rows[rows.length - 1] ?? null;
    },
    refetchInterval: live ? 60_000 : false,
    staleTime: live ? 30_000 : 10 * 60_000,
  });
  const rc = useQuery({
    queryKey: ['rc-status', sk],
    enabled: !!sk && live,
    queryFn: () => openf1<RaceControlMsg>('race_control', { session_key: sk }),
    refetchInterval: 30_000,
  });
  const status = live ? trackStatus(useFeed ? feedMessages(feed!) : (rc.data ?? [])) : null;
  const w = useFeed ? feedWeather(feed!) ?? null : weather.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 className="kicker" id="conditions">
          Track conditions
        </h2>
        {live ? (
          <span className={`pill tone-${status?.tone ?? 'green'}`}>
            <span className="dot" />
            {status?.label ?? 'Session live'}
          </span>
        ) : (
          <span className="pill tone-grey">No session running</span>
        )}
      </div>
      {sessions.error && !useFeed ? (
        <ErrorBox error={sessions.error} what="session data" />
      ) : !useFeed && (sessions.isLoading || weather.isLoading) ? (
        <Loading rows={3} />
      ) : w ? (
        <div className="stat-grid">
          {[
            ['Air', `${w.air_temperature.toFixed(1)}°C`],
            ['Track', `${w.track_temperature.toFixed(1)}°C`],
            ['Humidity', `${Math.round(w.humidity)}%`],
            ['Wind', `${(w.wind_speed * 3.6).toFixed(1)} km/h ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((w.wind_direction % 360) + 360) % 360) / 45) % 8]}`],
            ['Pressure', `${Math.round(w.pressure)} hPa`],
            ['Rain', w.rainfall ? 'Yes' : 'None'],
          ].map(([l, v]) => (
            <div className="stat inset" key={l}>
              <div className="l">{l}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No weather readings yet.</Empty>
      )}
      {live && race?.Circuit.Location.lat && <RainWatch lat={race.Circuit.Location.lat} long={race.Circuit.Location.long} compact />}
      {current && (
        <div className="muted" style={{ fontSize: 12, marginTop: 'auto' }}>
          {live ? 'Live from' : 'Last reading from'} {current.session_name}, {current.location}
          {weather.dataUpdatedAt ? ` · ${fmtShortClock(new Date(weather.dataUpdatedAt))}` : ''}
          {live && (
            <>
              {' · '}
              <a href={href('live')} style={{ textDecoration: 'underline' }}>
                Open Live Timing
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
