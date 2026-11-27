import type { Result } from '../api/jolpica';
import type { BoardProps } from './CalendarBoard';
import { hasSprint, isOvernight, nextRaceIndex, weekendSessions } from '../lib/calendarBoard';
import { Overnight } from './CalendarMonth';
import { fmtDayMonth, fmtDateRange, fmtWeekdayDayTime, raceStart } from '../lib/format';
import { driverHref, raceHref } from '../lib/router';
import { teamColour } from '../lib/teams';
import { useSettings } from '../lib/settings';
import { MyFinish } from './MyFinish';

/** The season as one vertical line, a dot per race weekend with its winner, and a marker for today. */
export function CalendarTimeline({ races, results, hidden, now }: BoardProps) {
  const ni = nextRaceIndex(races, now);
  const { favoriteDriver } = useSettings();
  return (
    <ol className="tl" aria-label="Season timeline">
      {races.map((r, i) => {
        const w = hidden(r) ? undefined : results.get(r.round)?.[0];
        const first = weekendSessions(r)[0]?.at;
        const start = raceStart(r);
        const cls = i === ni ? 'next' : w || i < ni || ni < 0 ? 'past' : 'up';
        return (
          <li key={r.round} className={`tl-item ${cls}`} style={w ? ({ '--c': teamColour(w.Constructor.constructorId) } as React.CSSProperties) : undefined}>
            {i === ni && i > 0 && <div className="tl-today" aria-label="Today"><span>Today · {fmtDayMonth(new Date(now))}</span></div>}
            <div className="tl-row">
              <div className="tl-date mono">{start ? fmtDateRange(first ?? start, start) : r.date}</div>
              <div className="tl-dotcol"><i /></div>
              <div className="tl-body">
                <span className="mono muted tl-rd">R{r.round}</span>
                <a className="name-link tl-name" href={raceHref(r.round, r.season)}>{r.raceName.replace(' Grand Prix', '')}</a>
                {hasSprint(r) && <span className="tl-sprint">Sprint</span>}
                <span className="muted tl-loc">{r.Circuit.Location.locality}, {r.Circuit.Location.country}</span>
                <span className="tl-win">{winnerOrWhen(w, hidden(r), start, now)}</span>
                {(() => {
                  const mine = w && favoriteDriver ? results.get(r.round)?.find((x) => x.Driver.code === favoriteDriver) : undefined;
                  return mine ? <MyFinish result={mine} compact /> : null;
                })()}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function winnerOrWhen(w: Result | undefined, isHidden: boolean, start: Date | null, now: number) {
  if (w) {
    const name = `${w.Driver.givenName} ${w.Driver.familyName}`;
    return (
      <>
        <i className="tl-wdot" aria-hidden="true" />
        {w.Driver.code ? <a className="name-link" style={{ fontWeight: 400 }} href={driverHref(w.Driver.code)}>{name}</a> : name}
      </>
    );
  }
  if (isHidden) return <span className="faint" title="Spoiler-free mode: reveal it on the race page or Dashboard">Hidden</span>;
  if (start && start.getTime() > now) return <span className="muted">Race {fmtWeekdayDayTime(start)}{isOvernight(start) && <> <Overnight /></>}</span>;
  return <span className="faint">-</span>;
}

