import type { ProgressSeries } from '../hooks/useSeason';

/** Cumulative points line chart, plain SVG so it scales on any screen. */
export function PointsChart({ series }: { series: ProgressSeries[] }) {
  const rounds = Math.max(1, ...series.map((s) => s.points.length - 1));
  const maxPts = Math.max(10, ...series.flatMap((s) => s.points));
  const step = niceStep(maxPts / 4);
  const top = Math.ceil(maxPts / step) * step;
  const W = 620, H = 230, L = 44, R = 600, T = 16, B = 200;
  const x = (i: number) => L + (i / rounds) * (R - L);
  const y = (v: number) => B - (v / top) * (B - T);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const roundLabels = [1, Math.ceil(rounds / 2), rounds].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg role="img" aria-label="Line chart of cumulative championship points after each round" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <g fontFamily="JetBrains Mono, monospace" fontSize={10} fill="#7D8693">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={R} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#2A303A' : '#1F242C'} />
            <text x={L - 8} y={y(t) + 3} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {roundLabels.map((r) => (
          <text key={r} x={x(r)} y={H - 10} textAnchor="middle">
            R{r}
          </text>
        ))}
      </g>
      {series.map((s) => (
        <polyline
          key={s.driverId}
          points={s.points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={s.colour}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <title>{`${s.code}: ${s.points[s.points.length - 1]} pts`}</title>
        </polyline>
      ))}
    </svg>
  );
}

function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}
