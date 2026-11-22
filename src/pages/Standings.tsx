import { OffseasonNote } from '../components/OffseasonNote';
import { ChampionTag } from '../components/Champions';
import { titleDecisions } from '../lib/titles';
import { ProvisionalNote } from '../components/ProvisionalNote';
import { SpoilerCover } from '../components/SpoilerCover';
import { useSpoilers } from '../hooks/useSpoilers';
import type React from 'react';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { useConstructorStandings, useDriverStandings, useResults, useSchedule } from '../hooks/useSeason';
import { useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';
import { StarIcon } from '../components/Icons';
import { useFavourite, useFavouriteTeam } from '../hooks/useFavourite';
import { FlagIcon } from '../components/Icons';
import { rowProps } from '../lib/rowStyle';
import { setFavoriteTeam } from '../lib/settings';
import { driverHref, href, teamHref } from '../lib/router';

export function Standings() {
  const { season } = useSettings();
  const drivers = useDriverStandings(season);
  const spoilers = useSpoilers();
  const hidden = season === 'current' && spoilers.standingsHidden;
  const teams = useConstructorStandings(season);
  const fav = useFavourite();
  const favTeam = useFavouriteTeam();
  const results = useResults(season);
  // The calendar of the season the results are from (last season's before a new season's first race).
  const schedule = useSchedule(results.data?.offseason?.shown ?? season);
  const titles = schedule.data && results.data ? titleDecisions(schedule.data, results.data.races, results.data.sprints) : null;
  const doneRound = (results.data?.races ?? []).reduce((m, r) => (r.Results?.length ? Math.max(m, Number(r.round)) : m), 0);
  const leader = Number(drivers.data?.standings[0]?.points ?? 0);
  const teamLeader = Number(teams.data?.standings[0]?.points ?? 0);

  return (
    <>
      <div className="row top">
        <section className="card w3" aria-labelledby="d">
          <div className="card-head">
            <h1 className="h2" id="d">Drivers' Championship</h1>
            {!hidden && <ProvisionalNote data={drivers.data} />}
            <OffseasonNote data={drivers.data} />
            {results.data && <span className="muted">After round {doneRound}</span>}
            <a className="link" href={href('review')}>Season review →</a>
          </div>
          {hidden ? <SpoilerCover what="The standings" /> : drivers.error ? <ErrorBox error={drivers.error} what="driver standings" /> : drivers.isLoading ? <Loading rows={12} /> : !drivers.data?.standings.length ? <Empty>No standings yet.</Empty> : (
            <div className="scroll-x">
              <table className="tbl standings-drivers">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Driver</th>
                    <th className="hide-sm">Team</th>
                    <th className="r hide-sm">Wins</th>
                    <th className="r">Gap</th>
                    <th className="r">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.data.standings.map((d, i) => {
                    const team = d.Constructors[d.Constructors.length - 1];
                    return (
                      <tr key={d.Driver.driverId} {...rowProps(d.Driver.code, fav?.code, favTeam)}>
                        <td className="mono muted">{d.position ?? d.positionText}</td>
                        <td>
                          <div className="who">
                            <span className="team-bar" style={{ background: teamColour(team?.constructorId ?? team?.name) }} />
                            {d.Driver.code ? (
                              <a className="name-link" href={driverHref(d.Driver.code)}>{d.Driver.givenName} {d.Driver.familyName}</a>
                            ) : (
                              <span style={{ fontWeight: 600 }}>{d.Driver.givenName} {d.Driver.familyName}</span>
                            )}
                            {fav?.code === d.Driver.code && <span className="fav-star" aria-label="Favourite"><StarIcon filled size={14} /></span>}
                            {titles?.driver?.id === d.Driver.driverId && <ChampionTag decision={titles.driver} />}
                            <span className="faint mono hide-sm" style={{ fontSize: 12 }}>{d.Driver.permanentNumber}</span>
                          </div>
                        </td>
                        <td className="muted hide-sm">{d.Constructors.map((c) => c.name).join(' / ')}</td>
                        <td className="r mono hide-sm">{d.wins}</td>
                        <td className="r mono muted">{i === 0 ? 'Leader' : `-${leader - Number(d.points)}`}</td>
                        <td className="r mono" style={{ fontWeight: 600 }}>{d.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card w2" aria-labelledby="c">
          <div className="card-head">
            <h2 className="h2" id="c">Constructors' Championship</h2>
            {!hidden && <ProvisionalNote data={teams.data} />}
            <OffseasonNote data={teams.data} />
            <span className="muted" style={{ fontSize: 12 }}>Tap the flag to pick your team</span>
          </div>
          {hidden ? <SpoilerCover what="The standings" compact /> : teams.error ? <ErrorBox error={teams.error} what="constructor standings" /> : teams.isLoading ? <Loading rows={10} /> : !teams.data?.standings.length ? <Empty>No standings yet.</Empty> : (
            <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Team</th>
                  <th className="r">Wins</th>
                  <th className="r">Gap</th>
                  <th className="r">Points</th>
                  <th><span className="sr-only">Favourite</span></th>
                </tr>
              </thead>
              <tbody>
                {teams.data.standings.map((t, i) => (
                  <tr key={t.Constructor.constructorId} className={favTeam?.id === t.Constructor.constructorId ? 'team' : undefined} style={{ '--team': teamColour(t.Constructor.constructorId) } as React.CSSProperties}>
                    <td className="mono muted">{t.position ?? t.positionText}</td>
                    <td>
                      <div className="who">
                        <span className="team-bar" style={{ background: teamColour(t.Constructor.constructorId) }} />
                        <a className="name-link" href={teamHref(t.Constructor.constructorId)}>{t.Constructor.name}</a>
                        {titles?.team?.id === t.Constructor.constructorId && <ChampionTag decision={titles.team} />}
                      </div>
                    </td>
                    <td className="r mono">{t.wins}</td>
                    <td className="r mono muted">{i === 0 ? 'Leader' : `-${teamLeader - Number(t.points)}`}</td>
                    <td className="r mono" style={{ fontWeight: 600 }}>{t.points}</td>
                    <td style={{ padding: '4px 8px', width: 52 }}>
                      <button
                        className="flag-btn"
                        aria-pressed={favTeam?.id === t.Constructor.constructorId}
                        aria-label={favTeam?.id === t.Constructor.constructorId ? `Remove ${t.Constructor.name} as your team` : `Make ${t.Constructor.name} your team`}
                        onClick={() => setFavoriteTeam(t.Constructor.constructorId, t.Constructor.name)}
                      >
                        <FlagIcon filled={favTeam?.id === t.Constructor.constructorId} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
