import { useMemo, useState } from 'react';
import type { BoardProps } from './CalendarBoard';
import { dayKey, isOvernight, monthGrid, nextRaceIndex, sessionsByDay, weekStart, type DaySession, type SessionKind } from '../lib/calendarBoard';
import { fmtDateRange, fmtShortClock } from '../lib/format';
import { driverHref, raceHref } from '../lib/router';
import { teamColour } from '../lib/teams';
import { useSettings } from '../lib/settings';
import { MyFinish } from './MyFinish';
import { RemindButton } from './RemindButton';

const KINDS: { kind: SessionKind; label: string }[] = [
  { kind: 'practice', label: 'Practice' },
  { kind: 'quali', label: 'Qualifying' },
  { kind: 'sprint', label: 'Sprint' },
  { kind: 'race', label: 'Race' },
];
type Filter = 'all' | SessionKind;
type Mode = 'month' | 'week' | 'upcoming';
const UPCOMING_FIRST = 12;

/** A small tag for a session between midnight and 6 am where you are. */
export function Overnight() {
  return <span className="night" title="Between midnight and 6 am in your time zone">☾ Overnight</span>;
}

const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dow = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));

/** A month grid with a dot per session, and the picked day's sessions beside it. */
export function CalendarMonth({ races, results, hidden, now }: BoardProps) {
  const { favoriteDriver } = useSettings();
  const byDay = useMemo(() => sessionsByDay(races), [races]);
  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const today = dayKey(new Date(now));
  // Start on today during the season, else on the next race's day (or the last race once it is over).
  const initial = useMemo(() => {
    if (days.length && today >= days[0] && today <= days[days.length - 1]) return today;
    const ni = nextRaceIndex(races, now);
    const r = races[ni < 0 ? races.length - 1 : ni];
    return [...byDay.entries()].find(([, l]) => l.some((s) => s.kind === 'race' && s.race === r))?.[0] ?? days[0] ?? today;
  }, [byDay, days, races, now, today]);
  const [sel, setSel] = useState(initial);
  const [ym, setYm] = useState(() => sel.slice(0, 7));
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<Mode>('month');
  const [allUpcoming, setAllUpcoming] = useState(false);

  const show = (l: DaySession[] | undefined) => (l ?? []).filter((s) => filter === 'all' || s.kind === filter);
  const pick = (k: string) => { setSel(k); setYm(k.slice(0, 7)); };
  const step = (n: number) => { const [y, m, d] = sel.split('-').map(Number); pick(dayKey(new Date(y, m - 1, d + n))); };
  const nextDayWith = (from: string) => days.find((k) => k > from && show(byDay.get(k)).length);
  const prevDayWith = (from: string) => [...days].reverse().find((k) => k < from && show(byDay.get(k)).length);

  const [y, m] = ym.split('-').map(Number);
  const grid = monthGrid(y, m - 1);
  const moveMonth = (n: number) => { const d = new Date(y, m - 1 + n, 1); setYm(dayKey(d).slice(0, 7)); };
  const selDate = new Date(`${sel}T12:00:00`);
  const list = show(byDay.get(sel));
  const rounds = [...new Set(list.map((s) => s.race))];
  const count = (k: Filter) => [...byDay.values()].flat().filter((s) => k === 'all' || s.kind === k).length;
  const up = nextDayWith(sel);

  return (
    <div className="cm">
      <div className="cm-filters" role="group" aria-label="Show sessions">
        {(['all', ...KINDS.map((k) => k.kind)] as Filter[]).map((k) => (
          <button key={k} className="cm-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === 'all' ? 'All sessions' : KINDS.find((x) => x.kind === k)!.label}<em>{count(k)}</em>
          </button>
        ))}
      </div>
      <div className="cm-wrap">
        <section className="cm-day" aria-label="Picked day" aria-live="polite">
          <div className="cm-dayhead">
            <div>
              <h2 className="cm-date">{longDay.format(selDate)}</h2>
              <span className="muted">{list.length ? `${list.length} session${list.length === 1 ? '' : 's'}` : 'No sessions'}{sel === today ? ' · Today' : ''}</span>
            </div>
            <div className="cm-btns">
              <button className="btn" onClick={() => step(-1)} aria-label="Previous day">‹ Prev day</button>
              <button className="btn" onClick={() => step(1)} aria-label="Next day">Next day ›</button>
            </div>
          </div>
          {rounds.map((race) => {
            const day = list.filter((s) => s.race === race);
            const w = hidden(race) ? undefined : results.get(race.round)?.[0];
            const raceDay = day.some((s) => s.kind === 'race');
            return (
              <article key={race.round} className="cm-ev" style={w && raceDay ? ({ '--c': teamColour(w.Constructor.constructorId) } as React.CSSProperties) : undefined}>
                <div className="cm-kicker">Round {race.round}{race.Sprint ? ' · Sprint weekend' : ''}</div>
                <h3 className="cm-name"><a className="name-link" href={raceHref(race.round, race.season)}>{race.raceName}</a></h3>
                <div className="muted cm-loc">{race.Circuit.circuitName} · {race.Circuit.Location.locality}, {race.Circuit.Location.country}</div>
                <ul className="cm-sess">
                  {day.map((s) => (
                    <li key={s.label} className={s.at.getTime() < now ? 'done' : undefined}>
                      <span><i className={`cm-dot k-${s.kind}`} aria-hidden="true" />{s.label}</span>
                      <span className="cm-time">{isOvernight(s.at) && <Overnight />}<span className="mono">{fmtShortClock(s.at)}</span><RemindButton race={race} session={s.label} at={s.at} now={now} /></span>
                    </li>
                  ))}
                </ul>
                {raceDay && (w ? (
                  <div className="cm-win">Won by {w.Driver.code ? <a className="name-link" href={driverHref(w.Driver.code)}>{w.Driver.givenName} {w.Driver.familyName}</a> : `${w.Driver.givenName} ${w.Driver.familyName}`} <span className="muted">({w.Constructor.name})</span></div>
                ) : hidden(race) ? <div className="cm-win faint" title="Spoiler-free mode: reveal it on the race page or Dashboard">Winner hidden</div> : null)}
                {raceDay && w && (() => {
                  const mine = favoriteDriver ? results.get(race.round)?.find((x) => x.Driver.code === favoriteDriver) : undefined;
                  return mine ? <MyFinish result={mine} /> : null;
                })()}
              </article>
            );
          })}
          {!rounds.length && (
            <div className="cm-empty">
              <p className="muted">Nothing on track this day.</p>
              <div className="cm-btns">
                {prevDayWith(sel) && <button className="btn" onClick={() => pick(prevDayWith(sel)!)}>‹ Previous session day</button>}
                {up && <button className="btn" onClick={() => pick(up)}>Next up: {shortDay.format(new Date(`${up}T12:00:00`))}, {byDay.get(up)![0].race.raceName.replace(' Grand Prix', ' GP')} ›</button>}
              </div>
            </div>
          )}
        </section>
        <section className="cm-cal" aria-label="Calendar view">
          <div className="cm-modes" role="tablist" aria-label="Calendar view">
            {(['month', 'week', 'upcoming'] as Mode[]).map((k) => (
              <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}>{k === 'month' ? 'Month' : k === 'week' ? 'Week' : 'Upcoming'}</button>
            ))}
          </div>
          {mode === 'month' && (
            <>
              <div className="cm-mnav">
                <button className="btn" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
                <b>{monthName.format(new Date(y, m - 1, 1))}</b>
                <button className="btn" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
              </div>
              <div className="cm-grid">
                {dow.map((d) => <div key={d} className="cm-dow" aria-hidden="true">{d}</div>)}
                {grid.map((d, i) => {
                  if (!d) return <div key={`x${i}`} />;
                  const k = dayKey(d);
                  const l = show(byDay.get(k));
                  const kinds = KINDS.filter((x) => l.some((s) => s.kind === x.kind));
                  const label = `${shortDay.format(d)}${l.length ? `: ${l.map((s) => s.label).join(', ')}` : ''}`;
                  return (
                    <button key={k} className={`cm-cell${l.some((s) => s.kind === 'race') ? ' race' : ''}${k === today ? ' today' : ''}`} aria-pressed={k === sel} aria-label={label} title={label} onClick={() => setSel(k)}>
                      <b>{d.getDate()}</b>
                      <span className="cm-dots">{kinds.map((x) => <i key={x.kind} className={`cm-dot k-${x.kind}`} />)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {mode === 'week' && (() => {
            const start = weekStart(sel);
            const week = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
            return (
              <>
                <div className="cm-mnav">
                  <button className="btn" onClick={() => step(-7)} aria-label="Previous week">‹</button>
                  <b>{fmtDateRange(week[0], week[6])}</b>
                  <button className="btn" onClick={() => step(7)} aria-label="Next week">›</button>
                </div>
                <ol className="cm-week">
                  {week.map((d) => {
                    const k = dayKey(d);
                    const l = show(byDay.get(k));
                    return (
                      <li key={k}>
                        <button className={`cm-wday${k === today ? ' today' : ''}${l.some((s) => s.kind === 'race') ? ' race' : ''}`} aria-pressed={k === sel} onClick={() => setSel(k)}>
                          <span className="cm-wdate"><b>{weekday.format(d)}</b> {d.getDate()}</span>
                          <span className="cm-wlist">
                            {l.length ? l.map((s) => (
                              <span key={s.race.round + s.label} className="cm-wses">
                                <i className={`cm-dot k-${s.kind}`} aria-hidden="true" />
                                <span className="cm-wlabel">{s.label}</span>
                                <span className="mono muted">{fmtShortClock(s.at)}</span>
                                {isOvernight(s.at) && <span className="night" title="Between midnight and 6 am in your time zone">☾</span>}
                              </span>
                            )) : <span className="faint">-</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </>
            );
          })()}
          {mode === 'upcoming' && (() => {
            const left = [...byDay.values()].flat().filter((s) => s.at.getTime() > now && (filter === 'all' || s.kind === filter)).sort((p, q) => p.at.getTime() - q.at.getTime());
            const shown = allUpcoming ? left : left.slice(0, UPCOMING_FIRST);
            const groups: { race: DaySession['race']; list: DaySession[] }[] = [];
            for (const s of shown) {
              const g = groups[groups.length - 1];
              if (g && g.race === s.race) g.list.push(s); else groups.push({ race: s.race, list: [s] });
            }
            if (!left.length) return <p className="muted cm-up-empty">No sessions left this season.</p>;
            return (
              <div className="cm-up">
                {groups.map((g) => (
                  <div key={g.race.round} className="cm-up-g">
                    <div className="cm-kicker">Round {g.race.round} · {g.race.raceName.replace(' Grand Prix', ' GP')}</div>
                    <ul>
                      {g.list.map((s) => (
                        <li key={s.label} className="cm-up-li">
                          <button className="cm-up-row" aria-pressed={dayKey(s.at) === sel} onClick={() => pick(dayKey(s.at))}>
                            <span><i className={`cm-dot k-${s.kind}`} aria-hidden="true" />{s.label}</span>
                            <span className="cm-time">{isOvernight(s.at) && <Overnight />}<span className="mono muted">{shortDay.format(s.at)} · {fmtShortClock(s.at)}</span></span>
                          </button>
                          <RemindButton race={g.race} session={s.label} at={s.at} now={now} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {left.length > UPCOMING_FIRST && (
                  <button className="btn cm-today" onClick={() => setAllUpcoming(!allUpcoming)}>{allUpcoming ? 'Show fewer' : `Show all ${left.length} sessions`}</button>
                )}
              </div>
            );
          })()}
          {mode !== 'upcoming' && <div className="cm-leg">{KINDS.map((k) => <span key={k.kind}><i className={`cm-dot k-${k.kind}`} />{k.label}</span>)}{mode === 'week' && <span><span className="night">☾</span> Midnight to 6 am</span>}</div>}
          {mode === 'month' && ym !== today.slice(0, 7) && <button className="btn cm-today" onClick={() => pick(today)}>Go to today</button>}
          {mode === 'week' && dayKey(weekStart(sel)) !== dayKey(weekStart(today)) && <button className="btn cm-today" onClick={() => pick(today)}>Go to today</button>}
        </section>
      </div>
    </div>
  );
}
