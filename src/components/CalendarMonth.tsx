import { useMemo, useState } from 'react';
import type { BoardProps } from './CalendarBoard';
import { dayKey, monthGrid, nextRaceIndex, sessionsByDay, type DaySession, type SessionKind } from '../lib/calendarBoard';
import { fmtShortClock } from '../lib/format';
import { driverHref, raceHref } from '../lib/router';
import { teamColour } from '../lib/teams';

const KINDS: { kind: SessionKind; label: string }[] = [
  { kind: 'practice', label: 'Practice' },
  { kind: 'quali', label: 'Qualifying' },
  { kind: 'sprint', label: 'Sprint' },
  { kind: 'race', label: 'Race' },
];
type Filter = 'all' | SessionKind;

const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const dow = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));

/** A month grid with a dot per session, and the picked day's sessions beside it. */
export function CalendarMonth({ races, results, hidden, now }: BoardProps) {
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
                      <span className="mono">{fmtShortClock(s.at)}</span>
                    </li>
                  ))}
                </ul>
                {raceDay && (w ? (
                  <div className="cm-win">Won by {w.Driver.code ? <a className="name-link" href={driverHref(w.Driver.code)}>{w.Driver.givenName} {w.Driver.familyName}</a> : `${w.Driver.givenName} ${w.Driver.familyName}`} <span className="muted">({w.Constructor.name})</span></div>
                ) : hidden(race) ? <div className="cm-win faint" title="Spoiler-free mode: reveal it on the race page or Dashboard">Winner hidden</div> : null)}
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
        <section className="cm-cal" aria-label="Month">
          <div className="cm-mnav">
            <button className="btn" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
            <b>{monthName.format(new Date(y, m - 1, 1))}</b>
            <button className="btn" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
          </div>
          <div className="cm-grid" role="grid">
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
          <div className="cm-leg">{KINDS.map((k) => <span key={k.kind}><i className={`cm-dot k-${k.kind}`} />{k.label}</span>)}</div>
          {ym !== today.slice(0, 7) && <button className="btn cm-today" onClick={() => pick(today)}>Go to today</button>}
        </section>
      </div>
    </div>
  );
}
