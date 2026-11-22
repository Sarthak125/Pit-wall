import { AddToCalendar } from '../components/AddToCalendar';
import { useSpoilers } from '../hooks/useSpoilers';
import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { useResults, useSchedule } from '../hooks/useSeason';
import { fmtDayMonth, fmtDayTime, raceStart, timeZoneLabel, toDate } from '../lib/format';
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
        {schedule.error ? <ErrorBox error={schedule.error} what="the calendar" /> : schedule.isLoading ? <Loading rows={12} /> : !schedule.data?.length ? <Empty>No races published for this season.</Empty> : (
          <div className="scroll-x">
            <table className="tbl cal-tbl">
              <thead>
                <tr>
                  <th>Rd</th>
                  <th>Grand Prix</th>
                  <th>Date</th>
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
                      <td className="mono">{start ? fmtDayMonth(start) : r.date}</td>
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

function Sessions({ race }: { race: Race }) {
  const list = SESSION_FIELDS.map((f) => ({ label: f.label, d: toDate(race[f.key] as Race['FirstPractice']) })).filter((s) => s.d);
  const start = raceStart(race);
  if (start) list.push({ label: 'Race', d: start });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12 }}>
      {list.map((s) => (
        <span key={s.label}>
          <span className="muted">{s.label}</span> <span className="mono">{fmtDayTime(s.d!)}</span>
        </span>
      ))}
    </div>
  );
}
