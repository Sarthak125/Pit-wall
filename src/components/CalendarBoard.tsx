import type { Race, Result } from '../api/jolpica';
import { AddToCalendar } from './AddToCalendar';
import { countdown, nextRaceIndex, weekendSessions } from '../lib/calendarBoard';
import { fmtDateRange, fmtWeekdayDayTime, raceStart } from '../lib/format';
import { raceHref } from '../lib/router';
import { teamColour } from '../lib/teams';

export interface BoardProps {
  races: Race[];
  /** Race results by round, for the season shown. */
  results: Map<string, Result[]>;
  /** Spoiler-free mode: results of this race are covered. */
  hidden: (r: Race) => boolean;
  now: number;
  /** Results are still loading. */
  loading?: boolean;
}

const place = (r: Race) => `${r.Circuit.circuitName} · ${r.Circuit.Location.locality}, ${r.Circuit.Location.country}`;
const short = (name: string) => name.replace(' Grand Prix', ' GP');

/**
 * The top of the Calendar page: the last race with its podium, the next weekend with a countdown and its sessions,
 * the weekend after that, and a strip with one block per round coloured by the winning team.
 */
export function CalendarBoard({ races, results, hidden, now, loading }: BoardProps) {
  if (!races.length) return null;
  const ni = nextRaceIndex(races, now);
  const next = ni >= 0 ? races[ni] : null;
  const then = ni >= 0 ? races[ni + 1] : undefined;
  // The last race is the one before the next weekend, or the final race once the season is over.
  const last = (ni >= 0 ? races[ni - 1] : races[races.length - 1]) ?? null;
  const panels = [last, next, then].filter(Boolean).length;
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
                  <li key={x.Driver.driverId} className={i === 0 ? 'p1' : undefined}>
                    <b>P{i + 1}</b>
                    <span className="cb-dot" style={{ background: teamColour(x.Constructor.constructorId) }} aria-hidden="true" />
                    <span>{x.Driver.givenName} {x.Driver.familyName}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cb-note">The result is not in yet.</p>
            )}
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
                  <span className="mono">{fmtWeekdayDayTime(s.at)}</span>
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
                <li key={s.label} className={s.label === 'Race' ? 'race' : undefined}><span>{s.label}</span><span className="mono">{fmtWeekdayDayTime(s.at)}</span></li>
              ))}
            </ul>
          </section>
        )}
        {!next && last && (
          <section className="cb-pan" aria-label="Season over">
            <div className="cb-kick">Season complete</div>
            <h2 className="cb-title">That was the finale</h2>
            <p className="cb-note">All {races.length} races have been run. The full season is below.</p>
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
        <div className="faint cb-cap">One block per round, coloured by the winning team. The outlined block is the next race.</div>
      </nav>
    </div>
  );
}
