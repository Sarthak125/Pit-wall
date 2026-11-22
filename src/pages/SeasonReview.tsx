import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getQualifying } from '../api/jolpica';
import { ChampionsBanner } from '../components/Champions';
import { OffseasonNote } from '../components/OffseasonNote';
import { Footer } from '../components/Shell';
import { SpoilerCover } from '../components/SpoilerCover';
import { Empty, ErrorBox, Loading } from '../components/States';
import { useFavourite } from '../hooks/useFavourite';
import { useConstructorStandings, useDriverStandings, useResults, useSchedule } from '../hooks/useSeason';
import { useSpoilers } from '../hooks/useSpoilers';
import { useSettings } from '../lib/settings';
import { driverHref, raceHref, teamHref } from '../lib/router';
import { seasonReview, type DriverSeason } from '../lib/seasonReview';
import { teamColour } from '../lib/teams';

/**
 * The season in numbers: champions, highlights, every driver's and team's record, and the team-mate battles. Follows
 * the season picker; for the season in progress it is the story so far.
 */
export function SeasonReview() {
  const { season } = useSettings();
  const results = useResults(season);
  const drivers = useDriverStandings(season);
  const teams = useConstructorStandings(season);
  // Before a new season's first race the data is last season's (see useSeason); everything follows that season.
  const dataSeason = results.data?.offseason?.shown ?? season;
  const schedule = useSchedule(dataSeason);
  const quali = useQuery({ queryKey: ['quali-season', dataSeason], queryFn: () => getQualifying(dataSeason), staleTime: 30 * 60_000, enabled: !!results.data });
  const spoilers = useSpoilers();
  const hidden = season === 'current' && spoilers.standingsHidden;
  const fav = useFavourite();

  const review = useMemo(
    () => (results.data && drivers.data && teams.data ? seasonReview(results.data.races, results.data.sprints, quali.data ?? [], drivers.data.standings, teams.data.standings) : null),
    [results.data, drivers.data, teams.data, quali.data],
  );
  const year = schedule.data?.[0]?.season ?? (season === 'current' ? '' : season);
  const total = schedule.data?.length ?? 0;
  const linkSeason = results.data?.offseason ? results.data.offseason.shown : season === 'current' ? undefined : season;

  const error = results.error ?? drivers.error ?? teams.error;
  return (
    <>
      <section className="card review-head" aria-labelledby="review">
        <div className="card-head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="h2" id="review">{year ? `${year} season review` : 'Season review'}</h1>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {review ? (review.rounds && total && review.rounds >= total ? `Complete · ${total} Grands Prix` : `The story so far · ${review.rounds} of ${total || '?'} Grands Prix`) : ' '}
            </p>
          </div>
          <OffseasonNote data={results.data} what="season" />
        </div>
      </section>

      {hidden ? (
        <section className="card"><SpoilerCover what="The season review" /></section>
      ) : error ? (
        <section className="card"><ErrorBox error={error} what="the season" /></section>
      ) : !review || !schedule.data ? (
        <section className="card"><Loading rows={10} /></section>
      ) : !review.rounds ? (
        <section className="card"><Empty>No Grands Prix have been run in this season yet.</Empty></section>
      ) : (
        <>
          <ChampionsBanner schedule={schedule.data} races={results.data!.races} sprints={results.data!.sprints} driverCode={(id) => review.drivers.find((d) => d.driverId === id)?.code} />

          <section className="card" aria-labelledby="highlights">
            <h2 className="h2 sm" id="highlights" style={{ marginBottom: 12 }}>Highlights</h2>
            <div className="review-tiles">
              {review.highlights.map((h) => (
                <div className="review-tile" key={h.key}>
                  <div className="review-tile-label">{h.label}</div>
                  <div className="review-tile-value">{h.value}</div>
                  <div className="review-tile-detail">
                    {h.driverCode ? <a className="name-link" href={driverHref(h.driverCode)}>{h.detail}</a> : h.teamId ? <a className="name-link" href={teamHref(h.teamId)}>{h.detail}</a> : h.round ? <a className="name-link" href={raceHref(h.round, linkSeason)}>{h.detail}</a> : h.detail}
                  </div>
                </div>
              ))}
            </div>
            {!quali.data && <p className="faint" style={{ fontSize: 12, margin: '10px 0 0' }}>Loading qualifying for poles…</p>}
          </section>

          <section className="card tight" aria-labelledby="review-drivers">
            <h2 className="h2 sm" id="review-drivers" style={{ marginBottom: 10 }}>Drivers</h2>
            <div className="scroll-x">
              <table className="tbl review-tbl">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Driver</th>
                    <th className="r">Points</th>
                    <th className="r">Wins</th>
                    <th className="r">Podiums</th>
                    <th className="r" title="Pole positions in Grand Prix qualifying">Poles</th>
                    <th className="r" title="Fastest laps in Grands Prix">FL</th>
                    <th className="r">Best</th>
                    <th className="r" title="Average finishing position when classified">Avg</th>
                    <th className="r" title="Grands Prix not classified (retired, did not start, disqualified)">DNF</th>
                    <th className="r" title="Places gained (or lost) from the grid over all classified Grands Prix">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {review.drivers.map((d) => (
                    <DriverRow key={d.driverId} d={d} fav={fav?.code === d.code} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" aria-labelledby="battles">
            <h2 className="h2 sm" id="battles" style={{ marginBottom: 4 }}>Team-mate battles</h2>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>Who finished ahead in Grands Prix they both started, and who qualified ahead.</p>
            <div className="review-battles">
              {review.battles.map((b) => (
                <div className="review-battle" key={b.teamId} style={{ '--team': teamColour(b.teamId) } as React.CSSProperties}>
                  <a className="name-link review-battle-team" href={teamHref(b.teamId)}>{b.teamName}</a>
                  {([['Races', b.races], ['Qualifying', b.quali], ['Points', [b.a.points, b.b.points]]] as const).map(([label, [x, y]]) => (
                    <div key={label} className="review-battle-row">
                      <div className="review-battle-nums">
                        <span className="mono">{x}</span>
                        <span className="muted">{label}</span>
                        <span className="mono">{y}</span>
                      </div>
                      <div className="h2h-bar" aria-hidden="true">
                        <div style={{ width: `${x + y ? (x / (x + y)) * 100 : 50}%`, background: 'var(--team)' }} />
                        <div style={{ flex: 1, background: 'color-mix(in srgb, var(--team) 40%, #555)' }} />
                      </div>
                    </div>
                  ))}
                  <div className="review-battle-names">
                    <a className="name-link" href={driverHref(b.a.code)}>{b.a.code}</a>
                    <a className="name-link" href={driverHref(b.b.code)}>{b.b.code}</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card tight" aria-labelledby="review-teams">
            <h2 className="h2 sm" id="review-teams" style={{ marginBottom: 10 }}>Teams</h2>
            <div className="scroll-x">
              <table className="tbl review-tbl">
                <thead>
                  <tr><th>Pos</th><th>Team</th><th className="r">Points</th><th className="r">Wins</th><th className="r">Podiums</th><th className="r" title="Races where the team's cars finished first and second">1-2s</th><th className="r">Best</th></tr>
                </thead>
                <tbody>
                  {review.teams.map((t) => (
                    <tr key={t.teamId}>
                      <td className="mono muted">{t.position}</td>
                      <td><div className="who"><span className="team-bar" style={{ background: teamColour(t.teamId) }} /><a className="name-link" href={teamHref(t.teamId)}>{t.name}</a></div></td>
                      <td className="r mono" style={{ fontWeight: 700 }}>{t.points}</td>
                      <td className="r mono">{t.wins}</td>
                      <td className="r mono">{t.podiums}</td>
                      <td className="r mono">{t.oneTwos}</td>
                      <td className="r mono">{t.bestFinish ? `P${t.bestFinish}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="faint" style={{ fontSize: 12, margin: 0 }}>From Jolpica's results, sprint results and qualifying. Grand Prix figures only, except points (which include sprints).</p>
        </>
      )}
      <Footer />
    </>
  );
}

function DriverRow({ d, fav }: { d: DriverSeason; fav: boolean }) {
  return (
    <tr className={fav ? 'fav' : undefined}>
      <td className="mono muted">{d.position}</td>
      <td>
        <div className="who">
          <span className="team-bar" style={{ background: teamColour(d.teamId) }} />
          <a className="name-link" href={driverHref(d.code)}>{d.name}</a>
        </div>
      </td>
      <td className="r mono" style={{ fontWeight: 700 }}>{d.points}</td>
      <td className="r mono">{d.wins}</td>
      <td className="r mono">{d.podiums}</td>
      <td className="r mono">{d.poles}</td>
      <td className="r mono">{d.fastestLaps}</td>
      <td className="r mono">{d.bestFinish ? `P${d.bestFinish}` : '-'}</td>
      <td className="r mono">{d.avgFinish != null ? d.avgFinish.toFixed(1) : '-'}</td>
      <td className="r mono">{d.dnfs}</td>
      <td className={`r mono ${d.gained > 0 ? 'delta-up' : d.gained < 0 ? 'delta-down' : 'muted'}`}>{d.gained > 0 ? `+${d.gained}` : d.gained}</td>
    </tr>
  );
}
