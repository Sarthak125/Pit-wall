import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { useResults, useSchedule } from '../hooks/useSeason';
import { fmtDayMonth, fmtDayTime, raceStart, timeZoneLabel, toDate } from '../lib/format';
import { useSettings } from '../lib/settings';
import { useNow } from '../hooks/usePoll';
import { teamColour } from '../lib/teams';
import { driverHref } from '../lib/router';

export function Calendar() {
  const { season } = useSettings();
  const schedule = useSchedule(season);
  const results = useResults(season);
  const winners = new Map((results.data?.races ?? []).map((r) => [r.round, r.Results?.[0]]));
  const now = useNow(60_000);
  const nextIdx = (schedule.data ?? []).findIndex((r) => (raceStart(r)?.getTime() ?? 0) + 3 * 3_600_000 > now);

  return (
    <>
      <section className="card" aria-labelledby="cal">
        <div className="card-head">
          <h1 className="h2" id="cal">{schedule.data?.[0]?.season ?? ''} Calendar</h1>
          <span className="muted">Times in {timeZoneLabel()}</span>
        </div>
        {schedule.error ? <ErrorBox error={schedule.error} what="the calendar" /> : schedule.isLoading ? <Loading rows={12} /> : !schedule.data?.length ? <Empty>No races published for this season.</Empty> : (
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Rd</th>
                  <th>Grand Prix</th>
                  <th>Date</th>
                  <th>Sessions</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {schedule.data.map((r, i) => {
                  const start = raceStart(r);
                  const w = winners.get(r.round);
                  return (
                    <tr key={r.round} className={i === nextIdx ? 'me' : undefined}>
                      <td className="mono muted">{r.round}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.raceName}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{r.Circuit.circuitName} · {r.Circuit.Location.locality}, {r.Circuit.Location.country}</div>
                      </td>
                      <td className="mono">{start ? fmtDayMonth(start) : r.date}</td>
                      <td style={{ whiteSpace: 'normal' }}>
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
