import type { Circuit } from '../api/circuit';

/* ---------- geometry ---------- */

function rotate(x: number, y: number, deg: number, cx: number, cy: number) {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return { x: dx * Math.cos(a) - dy * Math.sin(a) + cx, y: dx * Math.sin(a) + dy * Math.cos(a) + cy };
}

export function geometry(c: Circuit) {
  const cx = (Math.min(...c.x) + Math.max(...c.x)) / 2;
  const cy = (Math.min(...c.y) + Math.max(...c.y)) / 2;
  // The layout's rotation matches the F1 TV orientation; y is flipped because SVG y grows downwards.
  const deg = c.rotation + 180;
  const project = (x: number, y: number) => {
    const p = rotate(x, y, deg, cx, cy);
    return { x: p.x, y: -p.y };
  };
  const pts = c.x.map((x, i) => project(x, c.y[i]));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY);
  const pad = size * 0.07;
  const toPath = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(0)} ${q.y.toFixed(0)}`).join(' ');

  const nearest = (x: number, y: number) => {
    let best = 0, d = Infinity;
    c.x.forEach((px, i) => {
      const dd = (px - x) ** 2 + (c.y[i] - y) ** 2;
      if (dd < d) { d = dd; best = i; }
    });
    return best;
  };

  // Turn numbers sit just off the track, on the side the layout says.
  const offset = size * 0.045;
  const corners = c.corners.map((k) => {
    const a = (k.angle * Math.PI) / 180;
    return { number: k.number, ...project(k.trackPosition.x + Math.cos(a) * offset, k.trackPosition.y + Math.sin(a) * offset) };
  });

  // Each marshal sector runs from its marker to the next one along the outline.
  const marks = c.marshalSectors.map((m) => ({ number: m.number, i: nearest(m.trackPosition.x, m.trackPosition.y) })).sort((a, b) => a.i - b.i);
  const sectors = marks.map((m, k) => {
    const next = marks[(k + 1) % marks.length].i;
    const idx = next > m.i ? range(m.i, next) : [...range(m.i, pts.length - 1), ...range(0, next)];
    // Name the sector after the closest turn, which is easier to picture than a marshal sector number.
    const mid = idx[Math.floor(idx.length / 2)];
    let turn = 0, best = Infinity;
    for (const k of c.corners) {
      const d = (k.trackPosition.x - c.x[mid]) ** 2 + (k.trackPosition.y - c.y[mid]) ** 2;
      if (d < best) { best = d; turn = k.number; }
    }
    return { number: m.number, path: toPath(idx.map((i) => pts[i])), turn };
  });

  // Start/finish line at the first marshal sector marker, drawn across the track.
  const s1 = c.marshalSectors.find((m) => m.number === 1);
  let finish: { x: number; y: number; angle: number } | null = null;
  if (s1) {
    const i = nearest(s1.trackPosition.x, s1.trackPosition.y);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    finish = { ...pts[i], angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90 };
  }

  // Split the outline into the three timing sectors at the start/finish line and the two sector lines.
  const fi = s1 ? nearest(s1.trackPosition.x, s1.trackPosition.y) : 0;
  const walk = (from: number, to: number) => (to >= from ? range(from, to) : [...range(from, pts.length - 1), ...range(0, to)]);
  const split = (lines: { x: number; y: number }[]) => {
    const [a, b] = lines.map((l) => nearest(l.x, l.y));
    const along = (i: number) => (i - fi + pts.length) % pts.length;
    // Keep them in driving order even if the outline runs the other way.
    const [i1, i2] = along(a) <= along(b) ? [a, b] : [b, a];
    return [walk(fi, i1), walk(i1, i2), walk(i2, fi)].map((idx) => {
      const mid = pts[idx[Math.floor(idx.length / 2)]];
      return { path: toPath(idx.map((i) => pts[i])), label: mid };
    });
  };

  return {
    project,
    split,
    pts,
    startIndex: fi,
    size,
    viewBox: `${(minX - pad).toFixed(0)} ${(minY - pad).toFixed(0)} ${(maxX - minX + pad * 2).toFixed(0)} ${(maxY - minY + pad * 2).toFixed(0)}`,
    path: toPath(pts) + ' Z',
    corners,
    sectors,
    finish,
  };
}

export function range(a: number, b: number) {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}


/** Approximate lap length in km, measured along the recorded outline (coordinates are in tenths of a metre). */
export function lapLengthKm(c: Circuit): number {
  let d = 0;
  for (let i = 1; i < c.x.length; i++) d += Math.hypot(c.x[i] - c.x[i - 1], c.y[i] - c.y[i - 1]);
  d += Math.hypot(c.x[0] - c.x[c.x.length - 1], c.y[0] - c.y[c.y.length - 1]);
  return d / 10_000;
}
