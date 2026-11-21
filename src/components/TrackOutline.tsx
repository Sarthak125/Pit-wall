import type { Circuit } from '../api/circuit';
import { geometry } from '../lib/trackGeometry';

/** Static circuit drawing: outline, numbered turns, start/finish line and the direction of travel. */
export function TrackOutline({ circuit, label }: { circuit: Circuit; label: string }) {
  const geo = geometry(circuit);
  const r = geo.size * 0.016;
  const sw = geo.size * 0.011;
  // Direction arrow a little after the start/finish line.
  const n = geo.pts.length;
  const a = geo.pts[(geo.startIndex + Math.round(n * 0.04)) % n];
  const b = geo.pts[(geo.startIndex + Math.round(n * 0.04) + 3) % n];
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <svg viewBox={geo.viewBox} className="tmap-svg static" role="img" aria-label={label}>
      <path d={geo.path} className="tmap-edge" style={{ strokeWidth: sw * 2.2 }} />
      <path d={geo.path} className="tmap-track" style={{ strokeWidth: sw }} />
      {geo.finish && (
        <g transform={`translate(${geo.finish.x} ${geo.finish.y}) rotate(${geo.finish.angle})`}>
          <rect x={-sw * 2.4} y={-sw * 1.2} width={sw * 4.8} height={sw * 2.4} fill="#fff" stroke="#0b0b0d" strokeWidth={sw * 0.25} />
          {[0, 1, 2, 3].map((i) => [0, 1].map((j) => <rect key={`${i}${j}`} x={-sw * 2.4 + i * sw * 1.2} y={-sw * 1.2 + j * sw * 1.2} width={sw * 1.2} height={sw * 1.2} fill={(i + j) % 2 ? '#111' : 'none'} />))}
        </g>
      )}
      <g transform={`translate(${a.x} ${a.y}) rotate(${angle})`} aria-hidden="true">
        <path d={`M ${-sw * 1.4} ${-sw * 1.3} L ${sw * 1.6} 0 L ${-sw * 1.4} ${sw * 1.3} Z`} fill="#e10600" stroke="#0b0b0d" strokeWidth={sw * 0.2} />
      </g>
      {geo.corners.map((c) => (
        <g key={c.number} className="tmap-corner">
          <circle cx={c.x} cy={c.y} r={r * 1.15} />
          <text x={c.x} y={c.y} style={{ fontSize: r * 1.15 }}>{c.number}</text>
        </g>
      ))}
    </svg>
  );
}
