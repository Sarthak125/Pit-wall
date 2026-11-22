import { useEffect, useRef, useState } from 'react';
import type { ProgressSeries } from '../hooks/useSeason';

/**
 * Cumulative championship points after each round. Drawn at the card's real width (not a stretched picture), so text
 * stays the same size on any screen. Team-mates share their team colour with the second car dashed, each line ends
 * in a direct label with its points, and hovering (or tapping) a round shows everyone's points and the gap to the
 * leader.
 */
export function PointsChart({ series, roundNames = [], favCode }: { series: ProgressSeries[]; roundNames?: string[]; favCode?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rounds = Math.max(1, ...series.map((s) => s.points.length - 1));
  const maxPts = Math.max(10, ...series.flatMap((s) => s.points));
  const step = niceStep(maxPts / 4);
  const top = Math.ceil(maxPts / step) * step;
  const narrow = width < 520;
  const H = narrow ? 240 : 300;
  const L = 40, R = narrow ? 64 : 84, T = 12, B = 30;
  const x = (i: number) => L + (i / rounds) * (width - L - R);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // Round labels every round, every 2 or every 5 depending on the space, always including the first and last.
  const perRound = (width - L - R) / rounds;
  const every = perRound > 44 ? 1 : perRound > 22 ? 2 : 5;
  const roundTicks = Array.from({ length: rounds }, (_, i) => i + 1).filter((r) => r === 1 || r % every === 0 || r === rounds);

  // End labels, nudged apart so they never overlap.
  const ends = series.map((s) => ({ s, v: s.points[s.points.length - 1] ?? 0 })).sort((a, b) => b.v - a.v);
  const labelY = new Map<string, number>();
  let last = -Infinity;
  for (const e of ends) {
    const want = Math.max(y(e.v), last + 14);
    labelY.set(e.s.driverId, want);
    last = want;
  }

  const tip = hover != null
    ? series.map((s) => ({ s, v: s.points[Math.min(hover, s.points.length - 1)] ?? 0 })).sort((a, b) => b.v - a.v)
    : [];
  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * width;
    setHover(Math.max(1, Math.min(rounds, Math.round(((px - L) / (width - L - R)) * rounds))));
  };

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Championship points after each round: ${ends.map((e) => `${e.s.code} ${e.v}`).join(', ')}`}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        // A tap leaves the tooltip open; only a mouse moving away closes it.
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
      >
        <g className="pc-axis">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={width - R} y1={y(t)} y2={y(t)} className={t === 0 ? 'pc-base' : 'pc-grid'} />
              <text x={L - 8} y={y(t)} textAnchor="end" dominantBaseline="central">{t}</text>
            </g>
          ))}
          {roundTicks.map((r) => (
            <text key={r} x={x(r)} y={H - 8} textAnchor="middle">R{r}</text>
          ))}
        </g>
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="pc-cross" />}
        {[...series].reverse().map((s) => (
          <polyline
            key={s.driverId}
            points={s.points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={s.colour}
            strokeWidth={s.code === favCode ? 3.5 : 2}
            strokeDasharray={s.dashed ? '7 5' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {hover != null &&
          series.map((s) => {
            const v = s.points[Math.min(hover, s.points.length - 1)];
            return v == null ? null : <circle key={s.driverId} cx={x(hover)} cy={y(v)} r={4} fill={s.colour} stroke="var(--card)" strokeWidth={2} />;
          })}
        {ends.map(({ s, v }) => (
          <g key={s.driverId}>
            <circle cx={x(s.points.length - 1)} cy={y(v)} r={3.5} fill={s.colour} stroke="var(--card)" strokeWidth={2} />
            <text x={x(s.points.length - 1) + 8} y={labelY.get(s.driverId)} dominantBaseline="central" className="pc-label">
              {s.code} <tspan className="pc-label-v">{v}</tspan>
            </text>
          </g>
        ))}
      </svg>
      {hover != null && tip.length > 0 && (
        <div className="pos-tip" style={{ top: 8, left: x(hover), transform: hover > rounds / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            After R{hover}{roundNames[hover - 1] ? ` · ${roundNames[hover - 1]}` : ''}
          </div>
          {tip.map(({ s, v }, i) => (
            <div key={s.driverId} className="pc-tip-row">
              <i style={{ background: s.colour }} />
              <span>{s.code}</span>
              <span className="mono">{v}</span>
              <span className="mono muted">{i === 0 ? 'Leader' : `-${tip[0].v - v}`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}
