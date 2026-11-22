import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { findMeeting } from '../api/openf1';
import type { Race, Result } from '../api/jolpica';
import { useFavourite } from '../hooks/useFavourite';
import { getRacePositions, type PositionTrace } from '../lib/sectorLines';
import { teamColour } from '../lib/teams';

const W = 1000, H = 440, L = 40, R = 64, T = 14, B = 30;

/** Lap-by-lap race positions (OpenF1, 2023 onward), one line per driver in team colours. */
export function PositionChart({ race, results, sprint }: { race: Race; results: Result[]; sprint: boolean }) {
  const meeting = useQuery({
    queryKey: ['meeting-year', race.season, race.round],
    staleTime: Infinity,
    queryFn: ({ signal }) => findMeeting([race.date], signal),
  });
  const data = useQuery({
    queryKey: ['race-positions', meeting.data?.meeting_key, sprint],
    enabled: !!meeting.data,
    staleTime: Infinity,
    queryFn: ({ signal }) => getRacePositions(meeting.data!.meeting_key, sprint, signal),
  });

  // Driver identity from the classification: code, team colour, and a dashed line for the second car of a team.
  const info = useMemo(() => {
    const seen = new Set<string>();
    return new Map(
      results.map((r) => {
        const team = r.Constructor.constructorId;
        const second = seen.has(team);
        seen.add(team);
        return [Number(r.number), { code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(), colour: teamColour(team), dashed: second, finish: Number(r.position) }];
      }),
    );
  }, [results]);

  if (meeting.isLoading || data.isLoading) return <div className="empty">Loading positions…</div>;
  if (!data.data) return <div className="empty">Lap-by-lap positions are not available for this {sprint ? 'sprint' : 'race'}.</div>;
  return (
    <PositionLines
      laps={data.data.laps}
      traces={data.data.traces}
      info={info}
      note="Position at the end of each lap, from OpenF1. Team-mates share a colour; the second car's line is dashed. Lines that stop early are retirements. These are positions on track, so post-race penalties and disqualifications are not reflected; the results table above has the official classification."
    />
  );
}

export interface LineInfo {
  code: string;
  colour: string;
  dashed: boolean;
  /** Finishing (or current) position, for the order and the top 10 filter. */
  finish: number;
}

/**
 * The chart itself: one line per driver from the start (index 0, the grid) to the end of each lap. `distance` stretches
 * the lap axis to the full race distance, so a live race fills in from the left.
 */
export function PositionLines({ laps: done, traces, info, note, distance }: { laps: number; traces: PositionTrace[]; info: Map<number, LineInfo>; note: string; distance?: number | null }) {
  const fav = useFavourite();
  const [all, setAll] = useState(false);
  const [hoverLap, setHoverLap] = useState<number | null>(null);
  const laps = Math.max(done, distance ?? 0, 1);
  const shown = traces
    .filter((t) => info.has(t.driver))
    .sort((a, b) => info.get(a.driver)!.finish - info.get(b.driver)!.finish)
    .filter((t) => all || info.get(t.driver)!.finish <= 10);
  const maxPos = Math.max(20, ...traces.flatMap((t) => t.positions.filter((p): p is number => p != null)));
  const x = (lap: number) => L + (lap / laps) * (W - L - R);
  const y = (p: number) => T + ((p - 1) / (maxPos - 1)) * (H - T - B);
  const pathFor = (ps: (number | null)[]) => {
    let d = '';
    let pen = false;
    ps.forEach((p, i) => {
      if (p == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const lastPoint = (ps: (number | null)[]) => {
    for (let i = ps.length - 1; i >= 0; i--) if (ps[i] != null) return { i, p: ps[i]! };
    return null;
  };
  const tip = hoverLap != null
    ? shown
        .map((t) => ({ t, p: t.positions[hoverLap] }))
        .filter((r): r is { t: typeof r.t; p: number } => r.p != null)
        .sort((a, b) => a.p - b.p)
    : [];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div className="legend" style={{ flexWrap: 'wrap' }}>
          {shown.map((t) => {
            const d = info.get(t.driver)!;
            return (
              <span key={t.driver}>
                <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={d.colour} strokeWidth="2" strokeDasharray={d.dashed ? '4 3' : undefined} /></svg>
                {d.code}
              </span>
            );
          })}
        </div>
        <button className="tab" aria-pressed={all} onClick={() => setAll(!all)}>{all ? 'Top 10 only' : 'Show all drivers'}</button>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="pos-chart" role="img" aria-label={`Positions lap by lap, ${all ? 'all drivers' : 'top 10 finishers'}`}
          onMouseMove={(e) => {
            const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - box.left) / box.width) * W;
            setHoverLap(Math.max(0, Math.min(done, Math.round(((px - L) / (W - L - R)) * laps))));
          }}
          onMouseLeave={() => setHoverLap(null)}
        >
          {[1, 5, 10, 15, 20].filter((p) => p <= maxPos).map((p) => (
            <g key={p}>
              <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} className="pos-grid" />
              <text x={L - 8} y={y(p)} className="pos-axis" textAnchor="end" dominantBaseline="central">P{p}</text>
            </g>
          ))}
          {Array.from({ length: Math.floor(laps / 10) + 1 }, (_, k) => k * 10).map((lap) => (
            <text key={lap} x={x(lap)} y={H - 8} className="pos-axis" textAnchor="middle">{lap === 0 ? 'Start' : `Lap ${lap}`}</text>
          ))}
          {hoverLap != null && <line x1={x(hoverLap)} x2={x(hoverLap)} y1={T} y2={H - B} className="pos-cross" />}
          {[...shown].reverse().map((t) => {
            const d = info.get(t.driver)!;
            const isFav = fav?.code === d.code;
            return (
              <path key={t.driver} d={pathFor(t.positions)} fill="none" stroke={d.colour} strokeWidth={isFav ? 3.5 : 2} strokeDasharray={d.dashed ? '6 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
            );
          })}
          {shown.map((t) => {
            const d = info.get(t.driver)!;
            const end = lastPoint(t.positions);
            if (!end) return null;
            return (
              <g key={t.driver}>
                <circle cx={x(end.i)} cy={y(end.p)} r={3.5} fill={d.colour} stroke="var(--card)" strokeWidth={2} />
                <text x={x(end.i) + 8} y={y(end.p)} className="pos-label" dominantBaseline="central">{d.code}</text>
              </g>
            );
          })}
        </svg>
        {hoverLap != null && tip.length > 0 && (
          <div className="pos-tip" style={{ left: `${(x(hoverLap) / W) * 100}%`, transform: hoverLap > laps / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{hoverLap === 0 ? 'Start' : `Lap ${hoverLap}`}</div>
            {tip.slice(0, 12).map(({ t, p }) => {
              const d = info.get(t.driver)!;
              return (
                <div key={t.driver} className="pos-tip-row">
                  <span className="mono muted">P{p}</span>
                  <i style={{ background: d.colour }} />
                  <span>{d.code}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>{note}</div>
    </div>
  );
}
