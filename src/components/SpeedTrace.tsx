import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { openf1, type CarData, type CarLocation, type Lap, type OF1Driver, type Session } from '../api/openf1';
import { fmtLap } from '../lib/format';
import { getLayout } from '../lib/sectorLines';
import { at, gapAlong, lapTrace, scaleTo, segmentWinners, type TracePoint } from '../lib/telemetry';
import { geometry } from '../lib/trackGeometry';

const L = 52, R = 14;
/** Panels stacked in one drawing, so one crosshair runs through all of them. */
const PANELS = [
  { key: 'speed', label: 'Speed (km/h)', h: 200 },
  { key: 'gap', label: 'Gap (s)', h: 110 },
  { key: 'throttle', label: 'Throttle (%)', h: 80 },
  { key: 'brake', label: 'Brake', h: 44 },
] as const;
const GAP_Y = 22, AXIS = 26;

const fastestLap = (laps: Lap[], driver: number) =>
  laps.filter((l) => l.driver_number === driver && l.date_start && l.lap_duration && !l.is_pit_out_lap).sort((x, y) => x.lap_duration! - y.lap_duration!)[0];

/**
 * Two drivers' fastest laps in one session, point by point (OpenF1 car data, 2023 onward): speed, the gap between
 * them, throttle and brake along the lap, and a track map coloured by who was quicker in each part of it.
 */
export function SpeedTrace({ session, laps, a, b, colours }: { session: Session; laps: Lap[]; a: OF1Driver; b: OF1Driver; colours: [string, string] }) {
  const la = fastestLap(laps, a.driver_number);
  const lb = fastestLap(laps, b.driver_number);
  const data = useQuery({
    queryKey: ['telemetry', session.session_key, a.driver_number, la?.lap_number, b.driver_number, lb?.lap_number],
    enabled: !!la && !!lb,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const window = (l: Lap) => {
        const s = Date.parse(l.date_start!);
        return { 'date>': new Date(s).toISOString(), 'date<': new Date(s + l.lap_duration! * 1000).toISOString() };
      };
      const [ca, cb, loc] = await Promise.all([
        openf1<CarData>('car_data', { session_key: session.session_key, driver_number: a.driver_number, ...window(la!) }, signal),
        openf1<CarData>('car_data', { session_key: session.session_key, driver_number: b.driver_number, ...window(lb!) }, signal),
        openf1<CarLocation>('location', { session_key: session.session_key, driver_number: a.driver_number, ...window(la!) }, signal),
      ]);
      return { ca, cb, loc };
    },
  });
  const layout = useQuery({
    queryKey: ['circuit', session.circuit_key, session.year],
    staleTime: Infinity,
    queryFn: ({ signal }) => getLayout(session.circuit_key, session.year, session.meeting_key, signal),
  });

  const model = useMemo(() => {
    if (!data.data || !la || !lb || data.data.ca.length < 20 || data.data.cb.length < 20) return null;
    const ta = lapTrace(data.data.ca, Date.parse(la.date_start!), la.lap_duration!);
    const tb = lapTrace(data.data.cb, Date.parse(lb.date_start!), lb.lap_duration!);
    const length = (ta.length + tb.length) / 2;
    const pa = scaleTo(ta.points, ta.length, length);
    const pb = scaleTo(tb.points, tb.length, length);
    return { pa, pb, length, gap: gapAlong(pa, pb, length), segments: segmentWinners(pa, pb, length) };
  }, [data.data, la, lb]);

  if (!la || !lb) return <div className="empty">Both drivers need a timed lap in this session.</div>;
  if (data.isLoading) return <div className="empty">Loading car data…</div>;
  if (data.error) return <div className="empty">Car data is not available for this session right now.</div>;
  if (!model) return <div className="empty">Car data is not available for these laps.</div>;

  const faster = la.lap_duration! <= lb.lap_duration! ? a : b;
  const diff = Math.abs(la.lap_duration! - lb.lap_duration!);
  const quickerParts = { a: model.segments.filter((s) => s.faster === 'a').length, b: model.segments.filter((s) => s.faster === 'b').length };
  return (
    <div>
      <p className="lapcmp-gap">
        Fastest laps: <b>{a.name_acronym}</b> {fmtLap(la.lap_duration)} (lap {la.lap_number}) and <b>{b.name_acronym}</b> {fmtLap(lb.lap_duration)} (lap {lb.lap_number}).{' '}
        {diff < 0.0005 ? 'Exactly level.' : <><b>{faster.name_acronym}</b> <b className="mono">{diff.toFixed(3)} s</b> quicker.</>}
      </p>
      <div className="trace-grid">
        <TraceMap layout={layout.data} loc={data.data!.loc} lapStart={Date.parse(la.date_start!)} pa={model.pa} segments={model.segments} colours={colours} names={[a.name_acronym, b.name_acronym]} counts={quickerParts} />
        <TraceCharts model={model} colours={colours} names={[a.name_acronym, b.name_acronym]} />
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        Car data from OpenF1, about 4 readings a second, so short braking points and gear changes can fall between readings. Distance is worked out from speed and both laps are scaled to the same length. The gap matches the official lap times at the line; in between it is an estimate and can be off by about a tenth of a second. {b.name_acronym}'s lines are dashed. Gap above zero: {a.name_acronym} ahead at that point.
      </p>
    </div>
  );
}

function TraceMap({ layout, loc, lapStart, pa, segments, colours, names, counts }: {
  layout?: Parameters<typeof geometry>[0];
  loc: CarLocation[];
  lapStart: number;
  pa: TracePoint[];
  segments: ReturnType<typeof segmentWinners>;
  colours: [string, string];
  names: [string, string];
  counts: { a: number; b: number };
}) {
  const geo = useMemo(() => (layout ? geometry(layout) : null), [layout]);
  const paths = useMemo(() => {
    if (!geo) return [];
    // Where car A was at each location reading, as a distance along the lap (from its trace's time).
    const pts = loc
      .filter((r) => r.x || r.y)
      .map((r) => {
        const t = (Date.parse(r.date) - lapStart) / 1000;
        let d = pa[pa.length - 1].d;
        for (let i = 1; i < pa.length; i++) {
          if (pa[i].t >= t) {
            const p = pa[i - 1], q = pa[i];
            d = p.d + (q.d - p.d) * (q.t === p.t ? 0 : (t - p.t) / (q.t - p.t));
            break;
          }
        }
        return { ...geo.project(r.x, r.y), d };
      });
    return segments.map((s) => {
      const inSeg = pts.filter((p) => p.d >= s.from - 1 && p.d <= s.to + 1);
      return { faster: s.faster, d: inSeg.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' ') };
    });
  }, [geo, loc, lapStart, pa, segments]);
  if (!geo) return <div className="empty">Loading the track…</div>;
  const sw = geo.size / 70;
  const label = names.map((n, i) => `${n} quicker in ${i ? counts.b : counts.a} of ${segments.length} parts`).join(', ');
  return (
    <div>
      <svg viewBox={geo.viewBox} className="tmap-svg static" role="img" aria-label={`Track map coloured by who was quicker: ${label}`}>
        <path d={geo.path} className="tmap-edge" style={{ strokeWidth: sw * 2.2 }} />
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={p.faster === 'a' ? colours[0] : colours[1]} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {geo.finish && (
          <g transform={`translate(${geo.finish.x} ${geo.finish.y}) rotate(${geo.finish.angle})`}>
            <rect x={-sw * 2.4} y={-sw * 1.2} width={sw * 4.8} height={sw * 2.4} fill="#fff" stroke="#0b0b0d" strokeWidth={sw * 0.25} />
          </g>
        )}
      </svg>
      <div className="legend" style={{ marginTop: 6 }}>
        <span><i className="sw" style={{ background: colours[0] }} />{names[0]} quicker ({counts.a} of {segments.length})</span>
        <span><i className="sw" style={{ background: colours[1] }} />{names[1]} quicker ({counts.b} of {segments.length})</span>
      </div>
    </div>
  );
}

function TraceCharts({ model, colours, names }: { model: { pa: TracePoint[]; pb: TracePoint[]; length: number; gap: { d: number; gap: number }[] }; colours: [string, string]; names: [string, string] }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(700);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { pa, pb, length, gap } = model;
  const x = (d: number) => L + (d / length) * (W - L - R);
  let top = 20;
  const panels = PANELS.map((p) => {
    const y0 = top;
    top += p.h + GAP_Y;
    return { ...p, y0 };
  });
  const H = top - GAP_Y + AXIS;
  const maxSpeed = Math.ceil(Math.max(...pa.map((p) => p.speed), ...pb.map((p) => p.speed)) / 50) * 50;
  const minSpeed = Math.max(0, Math.floor(Math.min(...pa.map((p) => p.speed), ...pb.map((p) => p.speed)) / 50) * 50);
  const gapMax = Math.max(0.1, ...gap.map((g) => Math.abs(g.gap)));
  const line = (pts: { d: number; v: number }[], y: (v: number) => number) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const panel = (k: (typeof PANELS)[number]['key']) => panels.find((p) => p.key === k)!;
  const sp = panel('speed'), gp = panel('gap'), th = panel('throttle'), br = panel('brake');
  const ySpeed = (v: number) => sp.y0 + sp.h - ((v - minSpeed) / (maxSpeed - minSpeed)) * sp.h;
  const yGap = (v: number) => gp.y0 + gp.h / 2 - (v / gapMax) * (gp.h / 2);
  const yThr = (v: number) => th.y0 + th.h - (v / 100) * th.h;
  const brakeBars = (pts: TracePoint[], row: number) => {
    const out: { from: number; to: number }[] = [];
    let start: number | null = null;
    pts.forEach((p, i) => {
      if (p.brake && start == null) start = p.d;
      if ((!p.brake || i === pts.length - 1) && start != null) {
        out.push({ from: start, to: p.d });
        start = null;
      }
    });
    return out.map((s, i) => <rect key={`${row}-${i}`} x={x(s.from)} y={br.y0 + row * (br.h / 2) + 3} width={Math.max(2, x(s.to) - x(s.from))} height={br.h / 2 - 6} rx={2} fill={colours[row]} opacity={row ? 0.75 : 1} />);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(length, ((vx - L) / (W - L - R)) * length)));
  };
  const speedTicks = Array.from({ length: (maxSpeed - minSpeed) / 50 + 1 }, (_, i) => minSpeed + i * 50).filter((_, i, all) => all.length <= 6 || i % 2 === 0);
  const km = Array.from({ length: Math.floor(length / 1000) + 1 }, (_, i) => i * 1000);

  return (
    <div className="lapcmp-chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Speed, gap, throttle and brake along the lap for ${names[0]} and ${names[1]}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
        {panels.map((p) => (
          <text key={p.key} x={L} y={p.y0 - 8} fontSize="11" fill="var(--faint)">{p.label}</text>
        ))}
        {speedTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={ySpeed(v)} y2={ySpeed(v)} stroke="var(--line-soft)" />
            <text x={L - 6} y={ySpeed(v) + 4} textAnchor="end" fontSize="11" fill="var(--faint)" className="mono">{v}</text>
          </g>
        ))}
        <path d={line(pa.map((p) => ({ d: p.d, v: p.speed })), ySpeed)} fill="none" stroke={colours[0]} strokeWidth="2" strokeLinejoin="round" />
        <path d={line(pb.map((p) => ({ d: p.d, v: p.speed })), ySpeed)} fill="none" stroke={colours[1]} strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 4" />

        <line x1={L} x2={W - R} y1={yGap(0)} y2={yGap(0)} stroke="var(--line-strong)" />
        <text x={L - 6} y={yGap(gapMax) + 8} textAnchor="end" fontSize="11" fill="var(--faint)" className="mono">+{gapMax.toFixed(2)}</text>
        <text x={L - 6} y={yGap(-gapMax)} textAnchor="end" fontSize="11" fill="var(--faint)" className="mono">-{gapMax.toFixed(2)}</text>
        <text x={W - R} y={gp.y0 + 10} textAnchor="end" fontSize="11" fill="var(--faint)">{names[0]} ahead</text>
        <text x={W - R} y={gp.y0 + gp.h - 2} textAnchor="end" fontSize="11" fill="var(--faint)">{names[1]} ahead</text>
        <path d={line(gap.map((g) => ({ d: g.d, v: g.gap })), yGap)} fill="none" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />

        <line x1={L} x2={W - R} y1={yThr(100)} y2={yThr(100)} stroke="var(--line-soft)" />
        <line x1={L} x2={W - R} y1={yThr(0)} y2={yThr(0)} stroke="var(--line-soft)" />
        <path d={line(pa.map((p) => ({ d: p.d, v: p.throttle })), yThr)} fill="none" stroke={colours[0]} strokeWidth="1.5" />
        <path d={line(pb.map((p) => ({ d: p.d, v: p.throttle })), yThr)} fill="none" stroke={colours[1]} strokeWidth="1.5" strokeDasharray="5 3" />

        <text x={L - 6} y={br.y0 + br.h / 4 + 4} textAnchor="end" fontSize="11" fill="var(--faint)">{names[0]}</text>
        <text x={L - 6} y={br.y0 + (br.h * 3) / 4 + 4} textAnchor="end" fontSize="11" fill="var(--faint)">{names[1]}</text>
        {brakeBars(pa, 0)}
        {brakeBars(pb, 1)}

        {km.map((d) => (
          <text key={d} x={x(d)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--faint)">{d / 1000} km</text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={20} y2={H - AXIS} stroke="var(--hover-line)" />}
      </svg>
      {hover != null && (
        <div className="lapcmp-tip" style={{ left: `clamp(95px, ${(x(hover) / W) * 100}%, calc(100% - 95px))` }} role="status">
          <div className="muted" style={{ fontSize: 11 }}>{(hover / 1000).toFixed(2)} km into the lap</div>
          {[pa, pb].map((pts, i) => (
            <div key={i} className="lapcmp-tip-row">
              <i className="sw" style={{ background: colours[i] }} />
              <b>{names[i]}</b>
              <span className="mono">{Math.round(at(pts, hover, 'speed'))} km/h</span>
              <span className="muted">gear {Math.round(at(pts, hover, 'gear'))}</span>
            </div>
          ))}
          {(() => {
            const g = at(pb, hover, 't') - at(pa, hover, 't');
            return <div className="muted" style={{ fontSize: 11 }}>{Math.abs(g) < 0.0005 ? 'Level here' : `${g > 0 ? names[0] : names[1]} ahead by ${Math.abs(g).toFixed(3)} s`}</div>;
          })()}
        </div>
      )}
    </div>
  );
}
