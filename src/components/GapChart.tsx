import { useMemo, useState } from 'react';
import type { Lap, OF1Driver } from '../api/openf1';
import { driverHref } from '../lib/router';
import { teamColour } from '../lib/teams';

const W = 1000, H = 380, L = 52, R = 64, T = 14, B = 30;

interface Trace {
  driver: OF1Driver;
  colour: string;
  dashed: boolean;
  /** Gap to the leader in seconds at the end of each lap (index = lap number). */
  gaps: (number | null)[];
}

/**
 * Gap to the leader at the end of every lap, worked out from when each car crossed the line (its next lap's start).
 * Uses the lap data Live Timing already loads, so it costs no extra requests.
 */
export function GapChart({ laps, drivers, order, favNum }: { laps: Lap[]; drivers: Map<number, OF1Driver>; order: number[]; favNum: number | null }) {
  const [all, setAll] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const { traces, total } = useMemo(() => {
    // When each car finished each lap.
    const ends = new Map<number, Map<number, number>>();
    const byDriver = new Map<number, Lap[]>();
    for (const l of laps) byDriver.set(l.driver_number, [...(byDriver.get(l.driver_number) ?? []), l]);
    for (const [n, list] of byDriver) {
      const sorted = list.sort((a, b) => a.lap_number - b.lap_number);
      const m = new Map<number, number>();
      sorted.forEach((l, i) => {
        const next = sorted[i + 1];
        const end = next?.lap_number === l.lap_number + 1 && next.date_start ? Date.parse(next.date_start) : l.date_start && l.lap_duration ? Date.parse(l.date_start) + l.lap_duration * 1000 : null;
        if (end != null) m.set(l.lap_number, end);
      });
      ends.set(n, m);
    }
    const total = Math.max(0, ...[...ends.values()].flatMap((m) => [...m.keys()]));
    const leaderEnd = new Map<number, number>();
    for (let lap = 1; lap <= total; lap++) {
      const t = [...ends.values()].map((m) => m.get(lap)).filter((v): v is number => v != null);
      if (t.length) leaderEnd.set(lap, Math.min(...t));
    }
    const seenTeam = new Set<string>();
    const traces: Trace[] = order
      .filter((n) => ends.has(n) && drivers.has(n))
      .map((n) => {
        const d = drivers.get(n)!;
        const team = d.team_name ?? String(n);
        const dashed = seenTeam.has(team);
        seenTeam.add(team);
        const m = ends.get(n)!;
        const gaps: (number | null)[] = [0];
        for (let lap = 1; lap <= total; lap++) {
          const e = m.get(lap), lead = leaderEnd.get(lap);
          gaps.push(e != null && lead != null ? (e - lead) / 1000 : null);
        }
        return { driver: d, colour: teamColour(d.team_name, d.team_colour), dashed, gaps };
      });
    return { traces, total };
  }, [laps, drivers, order]);

  if (total < 2 || !traces.length) return <div className="empty">The gap chart appears after a couple of laps.</div>;
  const shown = all ? traces : traces.slice(0, 10);
  const maxGap = Math.max(5, ...shown.flatMap((t) => t.gaps.filter((g): g is number => g != null)));
  const top = Math.ceil(maxGap / 5) * 5;
  const x = (lap: number) => L + (lap / total) * (W - L - R);
  const y = (g: number) => T + (g / top) * (H - T - B);
  const step = top <= 20 ? 5 : top <= 60 ? 10 : top <= 120 ? 20 : 30;
  const path = (gs: (number | null)[]) => {
    let d = '', pen = false;
    gs.forEach((g, i) => {
      if (g == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(g).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const last = (gs: (number | null)[]) => {
    for (let i = gs.length - 1; i >= 0; i--) if (gs[i] != null) return { i, g: gs[i]! };
    return null;
  };
  const tip = hover != null ? shown.map((t) => ({ t, g: t.gaps[hover] })).filter((r): r is { t: Trace; g: number } => r.g != null).sort((a, b) => a.g - b.g) : [];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div className="legend" style={{ flexWrap: 'wrap' }}>
          {shown.map((t) => (
            <span key={t.driver.driver_number}>
              <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={t.colour} strokeWidth="2" strokeDasharray={t.dashed ? '4 3' : undefined} /></svg>
              <a className="name-link" style={{ fontWeight: 400, padding: 0 }} href={driverHref(t.driver.name_acronym)}>{t.driver.name_acronym}</a>
            </span>
          ))}
        </div>
        <button className="tab" aria-pressed={all} onClick={() => setAll(!all)}>{all ? 'Top 10 only' : 'Show all drivers'}</button>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="pos-chart" role="img" aria-label="Gap to the leader at the end of each lap"
          onMouseMove={(e) => {
            const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - box.left) / box.width) * W;
            setHover(Math.max(1, Math.min(total, Math.round(((px - L) / (W - L - R)) * total))));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: Math.floor(top / step) + 1 }, (_, k) => k * step).map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="pos-grid" />
              <text x={L - 8} y={y(g)} className="pos-axis" textAnchor="end" dominantBaseline="central">{g === 0 ? 'Leader' : `+${g}s`}</text>
            </g>
          ))}
          {Array.from({ length: Math.floor(total / 10) + 1 }, (_, k) => k * 10).filter((l) => l > 0).map((lap) => (
            <text key={lap} x={x(lap)} y={H - 8} className="pos-axis" textAnchor="middle">Lap {lap}</text>
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="pos-cross" />}
          {[...shown].reverse().map((t) => (
            <path key={t.driver.driver_number} d={path(t.gaps)} fill="none" stroke={t.colour} strokeWidth={t.driver.driver_number === favNum ? 3.5 : 2} strokeDasharray={t.dashed ? '6 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {(() => {
            // End labels, nudged apart so close finishers do not overlap.
            const ends = shown
              .map((t) => ({ t, e: last(t.gaps) }))
              .filter((r): r is { t: Trace; e: { i: number; g: number } } => !!r.e)
              .map((r) => ({ ...r, ly: y(r.e.g) }))
              .sort((a, b) => a.ly - b.ly);
            for (let k = 1; k < ends.length; k++) if (ends[k].ly - ends[k - 1].ly < 15) ends[k].ly = ends[k - 1].ly + 15;
            return ends.map(({ t, e, ly }) => (
              <g key={t.driver.driver_number}>
                <circle cx={x(e.i)} cy={y(e.g)} r={3.5} fill={t.colour} stroke="var(--card)" strokeWidth={2} />
                <text x={x(e.i) + 8} y={ly} className="pos-label" dominantBaseline="central">{t.driver.name_acronym}</text>
              </g>
            ));
          })()}
        </svg>
        {hover != null && tip.length > 0 && (
          <div className="pos-tip" style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > total / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>End of lap {hover}</div>
            {tip.slice(0, 12).map(({ t, g }) => (
              <div key={t.driver.driver_number} className="pos-tip-row" style={{ gridTemplateColumns: '54px 10px 1fr' }}>
                <span className="mono muted">{g === 0 ? 'Leader' : `+${g.toFixed(1)}`}</span>
                <i style={{ background: t.colour }} />
                <span>{t.driver.name_acronym}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
        Gap to the leader each time the car crosses the line. Pit stops show as a jump, safety cars bunch the field back up. Team-mates share a colour; the second car's line is dashed.
      </div>
    </div>
  );
}
