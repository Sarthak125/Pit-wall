import { useState } from 'react';
import { AddToCalendar } from '../components/AddToCalendar';
import { CalendarBoard } from '../components/CalendarBoard';
import { CalendarTimeline } from '../components/CalendarTimeline';
import { CalendarMonth } from '../components/CalendarMonth';
import { isOvernight } from '../lib/calendarBoard';
import { useSpoilers } from '../hooks/useSpoilers';
import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { useConstructorStandings, useDriverStandings, useResults, useSchedule } from '../hooks/useSeason';
import { fmtDateRange, fmtWeekdayDayTime, raceStart, timeZoneLabel, toDate } from '../lib/format';
import { useSettings } from '../lib/settings';
import { useNow } from '../hooks/usePoll';
import { teamColour } from '../lib/teams';
import { driverHref, raceHref, teamHref } from '../lib/router';

export function Calendar() {
  const { season } = useSettings();
  const schedule = useSchedule(season);
  const spoilers = useSpoilers();
  const results = useResults(season);
  const winners = new Map((results.data?.races ?? []).map((r) => [r.round, r.Results?.[0]]));
  // Full results by round, only for the season the calendar shows (between seasons Jolpica returns last year's).
  const shown = schedule.data?.[0]?.season;
  const resultsByRound = new Map((results.data?.races ?? []).filter((r) => r.Results?.length && (!shown || r.season === shown)).map((r) => [r.round, r.Results!]));
  const hidden = (r: { season: string; round: string }) => season === 'current' && spoilers.raceHidden(r.season, r.round);
  const dStand = useDriverStandings(season);
  const cStand = useConstructorStandings(season);
  // The champions, for the wrap-up after the final race: only from final standings of the season the calendar shows.
  const champions = shown && dStand.data && !dStand.data.offseason && dStand.data.season === shown
    ? { driver: dStand.data.standings[0], team: cStand.data && !cStand.data.offseason && cStand.data.season === shown ? cStand.data.standings[0] : undefined }
    : undefined;
  const [view, setView] = useState<'timeline' | 'month' | 'table'>('timeline');
  const now = useNow(60_000);
  const nextIdx = (schedule.data ?? []).findIndex((r) => (raceStart(r)?.getTime() ?? 0) + 3 * 3_600_000 > now);

  return (
    <>
      <section className="card" aria-labelledby="cal">
        <div className="card-head">
          <h1 className="h2" id="cal">{schedule.data?.[0]?.season ?? ''} Calendar</h1>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="muted">Times in {timeZoneLabel()}</span>
            {(() => {
              // The races still to come (whose race has not started), as one calendar file.
              const left = (schedule.data ?? []).filter((r) => (raceStart(r)?.getTime() ?? 0) > Date.now());
              return left.length ? <AddToCalendar races={left} label={left.length === schedule.data!.length ? 'Add season to calendar' : `Add remaining ${left.length} race${left.length === 1 ? '' : 's'} to calendar`} name={`F1 ${left[0].season}`} filename={`f1-${left[0].season}-calendar.ics`} /> : null;
            })()}
          </span>
        </div>
        {schedule.data?.length ? <CalendarBoard races={schedule.data} results={resultsByRound} hidden={hidden} now={now} loading={results.isLoading} champions={champions} /> : null}
        {schedule.data?.length ? (
          <div className="tabs" role="tablist" aria-label="Season view">
            <button role="tab" className="tab" aria-selected={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</button>
            <button role="tab" className="tab" aria-selected={view === 'month'} onClick={() => setView('month')}>Month</button>
            <button role="tab" className="tab" aria-selected={view === 'table'} onClick={() => setView('table')}>Table</button>
          </div>
        ) : null}
        {schedule.data?.length && view === 'timeline' ? <CalendarTimeline races={schedule.data} results={resultsByRound} hidden={hidden} now={now} /> : schedule.data?.length && view === 'month' ? <CalendarMonth races={schedule.data} results={resultsByRound} hidden={hidden} now={now} /> : schedule.error ? <ErrorBox error={schedule.error} what="the calendar" /> : schedule.isLoading ? <Loading rows={12} /> : !schedule.data?.length ? <Empty>{season === 'current' ? 'The new season\'s calendar has not been published yet. Pick an earlier season above to see past calendars.' : 'No races published for this season.'}</Empty> : (
          <div className="scroll-x">
            <table className="tbl cal-tbl">
              <thead>
                <tr>
                  <th>Rd</th>
                  <th>Grand Prix</th>
                  <th title="From the first session to the race, in your time zone">Weekend</th>
                  <th className="hide-sm">Sessions</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {schedule.data.map((r, i) => {
                  const start = raceStart(r);
                  // Spoiler-free mode: no winner for the weekend still hidden.
                  const w = season === 'current' && spoilers.raceHidden(r.season, r.round) ? undefined : winners.get(r.round);
                  return (
                    <tr key={r.round} className={i === nextIdx ? 'me' : undefined}>
                      <td className="mono muted">{r.round}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 150 }}>
                        <a className="name-link" href={raceHref(r.round)}>{r.raceName}</a>
                        <div className="muted hide-sm" style={{ fontSize: 12 }}>{r.Circuit.circuitName} · {r.Circuit.Location.locality}, {r.Circuit.Location.country}</div>
                      </td>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{start ? fmtDateRange(firstSession(r) ?? start, start) : r.date}</td>
                      <td className="hide-sm" style={{ whiteSpace: 'normal', minWidth: 200 }}>
                        <Sessions race={r} />
                      </td>
                      <td>
                        {w ? (
                          <div className="who">
                            <span className="team-bar" style={{ background: teamColour(w.Constructor.constructorId) }} />
                            {w.Driver.code ? (
                              <a className="name-link" style={{ fontWeight: 400 }} href={driverHref(w.Driver.code)}>
                                {w.Driver.givenName} {w.Driver.familyName}
                              </a>
                            ) : (
                              <span>{w.Driver.givenName} {w.Driver.familyName}</span>
                            )}
                          </div>
                        ) : null}
                        {w ? (
                          <div style={{ fontSize: 12, paddingLeft: 14 }}>
                            <a className="name-link" style={{ fontWeight: 400, color: 'var(--muted)', padding: '2px 0' }} href={teamHref(w.Constructor.constructorId)}>
                              {w.Constructor.name}
                            </a>
                          </div>
                        ) : season === 'current' && spoilers.raceHidden(r.season, r.round) ? (
                          <span className="faint" title="Spoiler-free mode: reveal it on the race page or Dashboard">Hidden</span>
                        ) : i === nextIdx ? (
                          <span className="pill tone-red">Next</span>
                        ) : (
                          <span className="faint">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}

/** The weekend's first session (practice or sprint), for the date range. */
function firstSession(race: Race): Date | null {
  const times = SESSION_FIELDS.map((f) => toDate(race[f.key] as Race['FirstPractice'])).filter((d): d is Date => !!d);
  return times.length ? new Date(Math.min(...times.map((d) => d.getTime()))) : null;
}

function Sessions({ race }: { race: Race }) {
  const list = SESSION_FIELDS.map((f) => ({ label: f.label, d: toDate(race[f.key] as Race['FirstPractice']) })).filter((s) => s.d);
  const start = raceStart(race);
  if (start) list.push({ label: 'Race', d: start });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12 }}>
      {list.map((s) => (
        <span key={s.label}>
          <span className="muted">{s.label}</span> <span className="mono">{fmtWeekdayDayTime(s.d!)}</span>{isOvernight(s.d!) && <span className="night" title="Between midnight and 6 am in your time zone"> ☾</span>}
        </span>
      ))}
    </div>
  );
}
