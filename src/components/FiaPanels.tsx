import { useState } from 'react';
import type { OF1Driver } from '../api/openf1';
import { friendly, type ClassifiedMsg, type LimitsSummary, type PenaltySummary } from '../lib/raceControl';
import { fmtClock } from '../lib/format';
import { driverHref } from '../lib/router';
import { teamColour } from '../lib/teams';

type Drivers = Map<number, OF1Driver>;

function DriverTag({ n, drivers }: { n: number; drivers: Drivers }) {
  const d = drivers.get(n);
  const code = d?.name_acronym ?? `#${n}`;
  return (
    <span className="who" style={{ gap: 8 }}>
      <span className="team-bar" style={{ height: 18, background: teamColour(d?.team_name, d?.team_colour) }} />
      {d ? <a className="code name-link" style={{ fontSize: 15 }} href={driverHref(code)} title={`${code}: full stats`}>{code}</a> : <span className="code">{code}</span>}
    </span>
  );
}

/**
 * Lap times deleted for track limits, per driver. The bar fills amber and then red as deletions add up; the black
 * and white flag and any track limits penalty come from the actual FIA messages, so they show only when issued.
 */
export function TrackLimitsPanel({ limits, penalties, drivers, isRace, favNum }: { limits: LimitsSummary[]; penalties: PenaltySummary[]; drivers: Drivers; isRace: boolean; favNum: number | null }) {
  const [all, setAll] = useState(false);
  const total = limits.reduce((a, l) => a + l.deleted, 0);
  const turns = new Map<number, number>();
  for (const l of limits) for (const [t, n] of l.turns) turns.set(t, (turns.get(t) ?? 0) + n);
  const worst = [...turns.entries()].sort((a, b) => b[1] - a[1])[0];
  const shown = all ? limits : limits.slice(0, 8);
  const cells = Math.max(4, ...limits.map((l) => l.deleted));
  const tone = (k: number, l: LimitsSummary) => {
    if (k >= l.deleted) return 'var(--line-soft)';
    if (!isRace) return '#8B93A1';
    // In races, repeated offences lead to a warning flag and then a penalty, so the bar warms up as they add up.
    return l.deleted >= 4 ? '#F87171' : l.deleted === 3 ? 'var(--amber)' : '#8B93A1';
  };
  return (
    <section className="card tight" aria-labelledby="limits">
      <h2 className="h2 sm" id="limits" style={{ marginBottom: 4 }}>Track limits</h2>
      {limits.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>No lap times deleted this session.</div>
      ) : (
        <>
          <div className="limits-summary">
            <div><b className="mono">{total}</b><span>lap time{total === 1 ? '' : 's'} deleted</span></div>
            <div><b className="mono">{limits.length}</b><span>driver{limits.length === 1 ? '' : 's'}</span></div>
            {worst && <div><b className="mono">T{worst[0]}</b><span>most deletions ({worst[1]})</span></div>}
          </div>
          <div className="limits-list">
            {shown.map((l) => {
              const pen = penalties.find((p) => p.car === l.car && /track limits/i.test(p.reason));
              const top = [...l.turns.entries()].sort((a, b) => b[1] - a[1])[0];
              return (
                <div className={`limits-row${l.car === favNum ? ' fav' : ''}`} key={l.car}>
                  <DriverTag n={l.car} drivers={drivers} />
                  <div className="limits-bar" aria-label={`${l.deleted} deleted`}>
                    {Array.from({ length: cells }, (_, k) => <i key={k} style={{ background: tone(k, l) }} />)}
                  </div>
                  <div className="limits-meta">
                    <span className="mono limits-n">{l.deleted}</span>
                    <span className="faint limits-t" title={top ? `Most at turn ${top[0]}${l.turns.size > 1 ? `, also ${l.turns.size - 1} other corner${l.turns.size > 2 ? 's' : ''}` : ''}` : undefined}>{top ? `T${top[0]}${l.turns.size > 1 ? '+' : ''}` : ''}</span>
                    <span className="limits-b">
                      {pen ? (
                        <span className="limits-badge pen" title={`Track limits penalty: ${pen.penalty}`}>{pen.penalty}</span>
                      ) : l.blackAndWhite ? (
                        <span className="limits-badge bw" title="Black and white flag: final warning"><i aria-hidden="true" />B/W</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {limits.length > 8 && <button className="link-btn" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${limits.length} drivers`}</button>}
          <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>
            Number = lap times deleted; T = the corner where most happened. B/W = black and white flag shown{isRace ? '; bars turn amber at 3 and red from 4' : ''}.
          </div>
        </>
      )}
    </section>
  );
}

/** Incidents the stewards are looking at, in plain English, with who is involved and when it happened. */
export function InvestigationsPanel({ open, drivers }: { open: ClassifiedMsg[]; drivers: Drivers }) {
  return (
    <section className="card tight" aria-labelledby="investigations">
      <div className="card-head" style={{ marginBottom: open.length ? 10 : 0 }}>
        <h2 className="h2 sm" id="investigations">Under investigation</h2>
        <span className={`pill ${open.length ? 'tone-amber' : 'tone-grey'}`}>{open.length || 'None'}</span>
      </div>
      {open.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>No incidents waiting for a decision.</div>
      ) : (
        <div className="inv-list">
          {open.map((m) => {
            const f = friendly(m);
            const after = /AFTER THE (RACE|SESSION)/i.exec(m.message);
            return (
              <div className="inv-item" key={m.id}>
                <div className="inv-when mono">{m.lap_number ? `Lap ${m.lap_number} · ` : ''}{fmtClock(new Date(m.date))}</div>
                <div className="inv-title">{f.title.replace(/ · .*$/, '')}</div>
                {f.detail && <div className="muted" style={{ fontSize: 12 }}>{f.detail}</div>}
                <div className="inv-foot">
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{m.cars.map((c) => <DriverTag key={c} n={c} drivers={drivers} />)}</span>
                  <span className={`pill ${after ? 'tone-grey' : 'tone-amber'}`} style={{ fontSize: 11 }}>{after ? `After the ${after[1].toLowerCase()}` : 'Decision pending'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
