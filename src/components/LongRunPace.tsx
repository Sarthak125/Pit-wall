import { useMemo, useState } from 'react';
import type { Lap, OF1Driver, Stint } from '../api/openf1';
import { fmtLap } from '../lib/format';
import { longRuns } from '../lib/longRuns';
import { teamColour, tyre } from '../lib/teams';

/** Practice: each driver's long run (average, laps, tyre, degradation), fastest average first, grouped by tyre if asked. */
export function LongRunPace({ laps, stints, drivers, favNum, live }: { laps: Lap[]; stints: Stint[]; drivers: Map<number, OF1Driver>; favNum: number | null; live: boolean }) {
  const runs = useMemo(() => longRuns(laps, stints), [laps, stints]);
  const compounds = [...new Set(runs.map((r) => (r.compound ?? '').toUpperCase()).filter(Boolean))];
  const [only, setOnly] = useState<string>('');
  const shown = only ? runs.filter((r) => (r.compound ?? '').toUpperCase() === only) : runs;
  if (!laps.length || !stints.length) return <div className="empty">{live ? 'Long runs appear here once drivers have done 5 or more representative laps on one set of tyres.' : 'Loading laps…'}</div>;
  if (!runs.length) {
    return <div className="empty">{live ? 'Long runs appear here once drivers have done 5 or more representative laps on one set of tyres.' : 'No long runs in this session (5 or more representative laps on one set).'}</div>;
  }
  const fastest = Math.min(...shown.map((r) => r.avg));
  const maxGap = Math.max(0.5, ...shown.map((r) => r.avg - fastest));
  return (
    <div>
      {compounds.length > 1 && (
        <div className="tabs" role="tablist" aria-label="Tyre" style={{ marginBottom: 10 }}>
          <button role="tab" className="tab" aria-selected={!only} onClick={() => setOnly('')}>All tyres</button>
          {compounds.map((c) => (
            <button key={c} role="tab" className="tab" aria-selected={only === c} onClick={() => setOnly(c)}>
              <i className="sw" style={{ background: tyre(c).colour, marginRight: 6 }} />
              {tyre(c).name}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-x">
        <table className="tbl longruns">
          <thead>
            <tr>
              <th>#</th>
              <th>Driver</th>
              <th>Tyre</th>
              <th className="r" title="Representative laps in the run (out-lap, in-lap and slow laps left out)">Laps</th>
              <th className="r">Average</th>
              <th style={{ minWidth: 160 }}>Gap</th>
              <th className="r" title="Time lost per lap over the run (tyre wear, offset by fuel burning off)">Per lap</th>
              <th className="r">Best in run</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const d = drivers.get(r.driver);
              const c = teamColour(d?.team_name, d?.team_colour);
              const t = tyre(r.compound);
              const gap = r.avg - fastest;
              return (
                <tr key={r.driver} className={r.driver === favNum ? 'fav' : undefined}>
                  <td className="mono muted">{i + 1}</td>
                  <td>
                    <div className="who">
                      <span className="team-bar" style={{ background: c }} />
                      <span className="code">{d?.name_acronym ?? r.driver}</span>
                    </div>
                  </td>
                  <td>
                    <span className="tyre" style={{ borderColor: t.colour, color: t.colour }} title={`${t.name}${r.tyreAgeAtStart ? `, used (${r.tyreAgeAtStart} laps old)` : ', new'}`}>{t.letter}</span>
                  </td>
                  <td className="r mono">{r.laps}</td>
                  <td className="r mono" style={{ fontWeight: 600 }}>{fmtLap(r.avg)}</td>
                  <td>
                    <div className="lr-gap">
                      <i style={{ width: `${Math.max(2, (gap / maxGap) * 100)}%`, background: c }} />
                      <span className="mono muted">{gap === 0 ? 'Fastest' : `+${gap.toFixed(3)}`}</span>
                    </div>
                  </td>
                  <td className={`r mono ${r.deg > 0.15 ? 'tone-slower' : 'muted'}`}>{`${r.deg >= 0 ? '+' : ''}${r.deg.toFixed(2)} s`}</td>
                  <td className="r mono muted">{fmtLap(r.best)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
        Each driver's longest run of representative laps on one set (out-lap, in-lap and laps over 107% of the run's best left out). Teams run different fuel loads and engine modes, so treat gaps as a guide. Per lap: how much slower each lap got over the run; a minus means laps got faster (fuel burning off, or a drying or rubbering-in track).
      </div>
    </div>
  );
}
