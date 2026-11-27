import type { ConstructorStanding, DriverStanding, Race, Result } from '../api/jolpica';
import { Overnight } from './CalendarMonth';
import { AddToCalendar } from './AddToCalendar';
import { countdown, nextRaceIndex, seasonWrap, weekendSessions, isOvernight } from '../lib/calendarBoard';
import { fmtDateRange, fmtWeekdayDayTime, raceStart } from '../lib/format';
import { driverHref, href, raceHref, teamHref } from '../lib/router';
import { teamColour } from '../lib/teams';
import { useSettings } from '../lib/settings';
import { MyFinish } from './MyFinish';

export interface BoardProps {
  races: Race[];
  /** Race results by round, for the season shown. */
  results: Map<string, Result[]>;
  /** Spoiler-free mode: results of this race are covered. */
  hidden: (r: Race) => boolean;
  now: number;
  /** Results are still loading. */
  loading?: boolean;
  /** The final standings leaders, once the season is over (for the wrap-up). */
  champions?: { driver?: DriverStanding; team?: ConstructorStanding };
}

const place = (r: Race) => `${r.Circuit.circuitName} · ${r.Circuit.Location.locality}, ${r.Circuit.Location.country}`;
const short = (name: string) => name.replace(' Grand Prix', ' GP');

/**
 * The top of the Calendar page: the last race with its podium, the next weekend with a countdown and its sessions,
 * the weekend after that, and a strip with one block per round coloured by the winning team.
 */
export function CalendarBoard({ races, results, hidden, now, loading, champions }: BoardProps) {
  const { favoriteDriver } = useSettings();
  if (!races.length) return null;
  const ni = nextRaceIndex(races, now);
  const next = ni >= 0 ? races[ni] : null;
  const then = ni >= 0 ? races[ni + 1] : undefined;
  // The last race is the one before the next weekend, or the final race once the season is over.
  const last = (ni >= 0 ? races[ni - 1] : races[races.length - 1]) ?? null;
  // The season wrap-up takes the next race's place once the season is over.
  const panels = [last, next, then].filter(Boolean).length + (!next && last ? 1 : 0);
  const start = next ? raceStart(next)?.getTime() : undefined;
  const sessions = next ? weekendSessions(next) : [];
  const underWay = !!next && sessions.length > 0 && sessions[0].at.getTime() <= now;
  const left = start != null ? countdown(start - now) : null;

  return (
    <div className="cb-wrap">
      <div className={`cb cb-n${panels}`}>
        {last && (
          <section className="cb-pan" aria-label="Last race">
            <div className="cb-kick">Last race · Round {last.round}</div>
            <h2 className="cb-title"><a href={raceHref(last.round, last.season)}>{short(last.raceName)}</a></h2>
            <div className="cb-sub">{last.Circuit.circuitName}</div>
            {hidden(last) ? (
              <p className="cb-note">The result is hidden in spoiler-free mode. Open the race page to reveal it.</p>
            ) : loading ? (
              <p className="cb-note">Loading the result…</p>
            ) : (results.get(last.round)?.length ?? 0) > 0 ? (
              <ol className="cb-pod">
                {results.get(last.round)!.slice(0, 3).map((x, i) => (
                  <li key={x.Driver.driverId} className={[i === 0 ? 'p1' : '', favoriteDriver && x.Driver.code === favoriteDriver ? 'me' : ''].join(' ').trim() || undefined}>
                    <b>P{i + 1}</b>
                    <span className="cb-dot" style={{ background: teamColour(x.Constructor.constructorId) }} aria-hidden="true" />
                    <span>{x.Driver.givenName} {x.Driver.familyName}</span>
                    {favoriteDriver && x.Driver.code === favoriteDriver && <span className="my-star" title="Your driver">★<span className="sr-only"> Your driver</span></span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cb-note">The result is not in yet.</p>
            )}
            {!hidden(last) && !loading && (() => {
              const mine = favoriteDriver ? results.get(last.round)?.find((x) => x.Driver.code === favoriteDriver) : undefined;
              return mine && results.get(last.round)!.indexOf(mine) >= 3 ? <MyFinish result={mine} /> : null;
            })()}
            <a className="link cb-more" href={raceHref(last.round, last.season)}>{hidden(last) ? 'Open the race page' : 'Full results'} <span aria-hidden="true">→</span></a>
          </section>
        )}
        {next && (
          <section className="cb-pan next" aria-label="Next race">
            <div className="cb-kick">{underWay ? 'This weekend' : 'Next race'} · Round {next.round}</div>
            <h2 className="cb-title big"><a href={raceHref(next.round, next.season)}>{next.raceName}</a></h2>
            <div className="cb-sub">{place(next)} · {fmtDateRange(sessions[0]?.at ?? new Date(start ?? now), new Date(start ?? now))}</div>
            {left && !underWay && (
              <div className="cb-count" role="timer" aria-label={`${left.days} days, ${left.hours} hours and ${left.minutes} minutes to the race`}>
                <div><b>{left.days}</b><span>days</span></div>
                <div><b>{String(left.hours).padStart(2, '0')}</b><span>hours</span></div>
                <div><b>{String(left.minutes).padStart(2, '0')}</b><span>min</span></div>
                <small>to the race</small>
              </div>
            )}
            <ul className="cb-sess">
              {sessions.map((s) => (
                <li key={s.label} className={`${s.label === 'Race' ? 'race' : ''}${s.at.getTime() < now ? ' done' : ''}`}>
                  <span>{s.label}</span>
                  <span className="cb-when">{isOvernight(s.at) && <Overnight />}<span className="mono">{fmtWeekdayDayTime(s.at)}</span></span>
                </li>
              ))}
            </ul>
            <div className="cb-acts">
              <a className="btn primary" href={raceHref(next.round, next.season)}>Open race page</a>
              <AddToCalendar races={[next]} label="Add this weekend to calendar" />
            </div>
          </section>
        )}
        {then && (
          <section className="cb-pan" aria-label="The race after">
            <div className="cb-kick">Then · Round {then.round}{ni + 1 === races.length - 1 ? ' · Season finale' : ''}</div>
            <h2 className="cb-title"><a href={raceHref(then.round, then.season)}>{short(then.raceName)}</a></h2>
            <div className="cb-sub">{then.Circuit.circuitName} · {fmtDateRange(weekendSessions(then)[0]?.at ?? new Date(then.date), raceStart(then) ?? new Date(then.date))}</div>
            <ul className="cb-sess">
              {weekendSessions(then).map((s) => (
                <li key={s.label} className={s.label === 'Race' ? 'race' : undefined}><span>{s.label}</span><span className="cb-when">{isOvernight(s.at) && <Overnight />}<span className="mono">{fmtWeekdayDayTime(s.at)}</span></span></li>
              ))}
            </ul>
          </section>
        )}
        {!next && last && (
          <section className="cb-pan cb-wrapup" aria-label="Season over">
            <div className="cb-kick">Season complete · {races[0].season}</div>
            {races.some(hidden) ? (
              <>
                <h2 className="cb-title">That was the finale</h2>
                <p className="cb-note">The season summary is hidden in spoiler-free mode until you reveal the final race.</p>
              </>
            ) : (
              <WrapUp races={races} results={results} champions={champions} loading={loading} />
            )}
          </section>
        )}
      </div>
      <nav aria-label="Season strip">
        <ol className="cb-strip" style={{ '--n': races.length } as React.CSSProperties}>
          {races.map((r, i) => {
            const winner = hidden(r) ? undefined : results.get(r.round)?.[0];
            const label = `Round ${r.round}: ${r.raceName}${winner ? `, won by ${winner.Driver.givenName} ${winner.Driver.familyName}` : ''}${i === ni ? ' (next)' : ''}`;
            return (
              <li key={r.round}>
                <a href={raceHref(r.round, r.season)} className={i === ni ? 'now' : undefined} style={winner ? ({ '--c': teamColour(winner.Constructor.constructorId) } as React.CSSProperties) : undefined} title={label} aria-label={label}>
                  <span aria-hidden="true">{r.round}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="faint cb-cap">One block per round, coloured by the winning team.{next ? ' The outlined block is the next race.' : ''}</div>
      </nav>
    </div>
  );
}

/** The season in a few facts, once the final race is over: the champions, how many drivers won, and wins per team. */
function WrapUp({ races, results, champions, loading }: Pick<BoardProps, 'races' | 'results' | 'champions' | 'loading'>) {
  const wrap = seasonWrap(races, results);
  const d = champions?.driver;
  const t = champions?.team;
  const most = wrap.teams[0]?.wins ?? 1;
  return (
    <>
      <h2 className="cb-title">{d ? <>{d.Driver.givenName} {d.Driver.familyName} is champion</> : 'That was the finale'}</h2>
      {d && (
        <p className="cb-sub">
          {d.points} points{t ? <> · Constructors' title: <a className="name-link" href={teamHref(t.Constructor.constructorId)}>{t.Constructor.name}</a></> : null}
        </p>
      )}
      {loading && !wrap.races ? (
        <p className="cb-note">Loading the season's results…</p>
      ) : (
        <>
          <p className="cb-wfacts">
            <span><b className="mono">{wrap.races}</b> races</span>
            <span><b className="mono">{wrap.winners.length}</b> different winners</span>
            <span><b className="mono">{wrap.teams.length}</b> winning teams</span>
          </p>
          <h3 className="cb-wh">Wins by team</h3>
          <ul className="cb-wbars">
            {wrap.teams.map((x) => (
              <li key={x.id}>
                <span className="cb-wname">{x.name}</span>
                <span className="cb-wbar" aria-hidden="true"><i style={{ width: `${(x.wins / most) * 100}%`, background: teamColour(x.id) }} /></span>
                <b className="mono">{x.wins}</b>
              </li>
            ))}
          </ul>
          <h3 className="cb-wh">Most wins</h3>
          <ol className="cb-wlist">
            {wrap.winners.slice(0, 5).map((x) => (
              <li key={x.name}>
                <span className="cb-dot" style={{ background: teamColour(x.teamId) }} aria-hidden="true" />
                {x.code ? <a className="name-link" href={driverHref(x.code)}>{x.name}</a> : x.name}
                <b className="mono">{x.wins}</b>
              </li>
            ))}
          </ol>
        </>
      )}
      <a className="link cb-more" href={href('review')}>Season review <span aria-hidden="true">→</span></a>
    </>
  );
}
