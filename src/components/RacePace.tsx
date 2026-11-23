import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Race, Result } from '../api/jolpica';
import { findMeeting, meetingSessions, openf1, type Stint } from '../api/openf1';
import { useFavourite } from '../hooks/useFavourite';
import { fmtLap } from '../lib/format';
import { racePace } from '../lib/racePace';
import { getRacePositions } from '../lib/sectorLines';
import { teamColour, tyre } from '../lib/teams';

/** Drivers with fewer laps that count than this are listed after the others, unranked. */
const MIN_LAPS = 10;

/**
 * Race pace and tyre wear (OpenF1, 2023 onward): each driver's typical lap at race pace, ranked, and per stint the
 * tyre and time lost per lap. Uses the same lap and tyre data as the position and strategy charts on the page.
 */
export function RacePace({ race, results, sprint }: { race: Race; results: Result[]; sprint: boolean }) {
  const fav = useFavourite();
  const [all, setAll] = useState(false);
  const meeting = useQuery({ queryKey: ['meeting-year', race.season, race.round], staleTime: Infinity, queryFn: ({ signal }) => findMeeting([race.date], signal) });
  const mk = meeting.data?.meeting_key;
  const positions = useQuery({ queryKey: ['race-positions', mk, sprint], enabled: !!mk, staleTime: Infinity, queryFn: ({ signal }) => getRacePositions(mk!, sprint, signal) });
  // Same query as the tyre strategy chart, so it is shared.
  const stints = useQuery({
    queryKey: ['race-stints', race.season, race.round, sprint],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const m = await findMeeting([race.date], signal);
      if (!m) return null;
      const sessions = await meetingSessions(m.meeting_key, signal);
      const s = sessions.find((x) => (sprint ? x.session_name === 'Sprint' : x.session_name === 'Race'));
      if (!s) return null;
      return openf1<Stint>('stints', { session_key: s.session_key }, signal);
    },
  });

  const rows = useMemo(() => {
    if (!positions.data || !stints.data?.length) return null;
    const byNum = new Map(results.map((r) => [Number(r.number), r]));
    const pace = racePace(positions.data.lapRows, stints.data).filter((p) => byNum.has(p.driver));
    const ranked = pace.filter((p) => p.typical != null && p.laps >= MIN_LAPS).sort((a, b) => a.typical! - b.typical!);
    const rest = pace.filter((p) => !ranked.includes(p)).sort((a, b) => Number(byNum.get(a.driver)!.position) - Number(byNum.get(b.driver)!.position));
    const best = ranked[0]?.typical ?? null;
    return [...ranked, ...rest].map((p, i) => ({ ...p, rank: i < ranked.length ? i + 1 : null, gap: best != null && p.typical != null && i < ranked.length ? p.typical - best : null, r: byNum.get(p.driver)! }));
  }, [positions.data, stints.data, results]);

  if (meeting.isLoading || positions.isLoading || stints.isLoading) return <div className="empty">Loading race pace…</div>;
  if (!rows?.length) return <div className="empty">Race pace is not available for this {sprint ? 'sprint' : 'race'}.</div>;
  const shown = all ? rows : rows.filter((r, i) => i < 10 || r.r.Driver.code === fav?.code);

  return (
    <>
      <div className="scroll-x">
        <table className="tbl" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th title="Rank by typical race-pace lap">Pace</th>
              <th>Driver</th>
              <th className="r">Finish</th>
              <th className="r">Typical lap</th>
              <th className="r">Gap</th>
              <th className="r">Laps</th>
              <th>Stints: tyre, laps that count, time lost per lap</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.driver} className={p.r.Driver.code === fav?.code ? 'fav' : undefined}>
                <td className="mono muted">{p.rank ?? '-'}</td>
                <td>
                  <div className="who">
                    <span className="team-bar" style={{ background: teamColour(p.r.Constructor.constructorId) }} />
                    <span style={{ fontWeight: 600 }}>{p.r.Driver.code ?? p.r.Driver.familyName}</span>
                    {p.r.Driver.code === fav?.code && <span className="fav-star" aria-label="Favourite">★</span>}
                  </div>
                </td>
                <td className="r mono">{/^\d+$/.test(p.r.positionText) ? `P${p.r.positionText}` : p.r.status}</td>
                <td className="r mono">{p.rank ? fmtLap(p.typical) : '-'}</td>
                <td className="r mono muted">{p.gap == null ? (p.rank ? '' : 'too few laps') : p.gap < 0.0005 ? 'Best' : `+${p.gap.toFixed(3)}`}</td>
                <td className="r mono">{p.laps}</td>
                <td>
                  <div className="pace-stints">
                    {p.stints.map((s) => (
                      <span key={s.stint} className="chip" title={`Stint ${s.stint}: laps ${s.firstLap} to ${s.lastLap}${s.avg ? `, average ${fmtLap(s.avg)}` : ''}`}>
                        <i style={{ background: tyre(s.compound).colour }} />
                        {tyre(s.compound).letter} · {s.laps} {s.laps === 1 ? 'lap' : 'laps'}
                        {s.deg != null && <span className={`mono ${s.deg > 0.08 ? 'delta-down' : 'muted'}`}>{s.deg >= 0 ? '+' : ''}{s.deg.toFixed(2)} s</span>}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <button className="btn" style={{ marginTop: 8 }} onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Show top 10' : `Show all ${rows.length} drivers`}</button>
      )}
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        Typical lap: the middle lap time of all of a driver's laps at race pace, from OpenF1. Left out: the first lap, laps into and out of the pits, and laps more than 7% slower than their best on that set of tyres (safety car, virtual safety car and heavy traffic). Time lost per lap is a straight-line fit over a stint of 5 or more such laps; it includes fuel burning off, which makes cars faster, so it can be below zero. Drivers on different strategies run different tyres and fuel loads, and a leader managing the gap often shows a slower typical lap than the cars fighting behind, so treat small gaps with care.
      </p>
    </>
  );
}
