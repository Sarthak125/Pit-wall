import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCircuit } from '../api/circuit';
import { geometry } from '../lib/trackGeometry';
import { liveEvery, openf1, type CarLocation, type Lap, type OF1Driver, type Session } from '../api/openf1';
import { driverHref } from '../lib/router';
import type { ClassifiedMsg } from '../lib/raceControl';
import { teamColour } from '../lib/teams';
import { fmtClock } from '../lib/format';

/** How far behind the newest position the live map plays, so cars move smoothly between fetches. */
const LIVE_DELAY_MS = 15_000;
/** Live fetch interval. OpenF1 allows a limited number of requests a minute, shared with the rest of the page. */
const LIVE_POLL_MS = 12_000;
/** Replay fetches this much position data at a time. */
const CHUNK_MS = 60_000;
const SPEEDS = [1, 4, 8];

type Sample = { t: number; x: number; y: number };

interface Props {
  session: Session;
  live: boolean;
  drivers: OF1Driver[];
  messages: ClassifiedMsg[];
  laps: Lap[];
  favNum: number | null;
  teamNums: number[];
}

/** Whole-field track map: circuit outline with turn numbers, flagged sectors and every car moving. */
export function LiveTrackMap({ session, live, drivers, messages, laps, favNum, teamNums }: Props) {
  const [showSectors, setShowSectors] = useState(true);
  const circuit = useQuery({
    queryKey: ['circuit', session.circuit_key, session.year],
    enabled: !!session.circuit_key,
    staleTime: Infinity,
    queryFn: ({ signal }) => getCircuit(session.circuit_key, session.year, signal),
  });

  const start = Date.parse(session.date_start);
  const end = Date.parse(session.date_end);

  // Playback clock. Live it follows the newest data; for finished sessions it is a replay the viewer controls.
  const [playing, setPlaying] = useState(live);
  const [speed, setSpeed] = useState(1);
  const [head, setHead] = useState<number>(() => (live ? Date.now() - LIVE_DELAY_MS : end - 60_000));
  const headRef = useRef(head);
  const buffer = useRef(new Map<number, Sample[]>());
  const loadedFrom = useRef(0); // oldest time in the replay buffer
  const loadedTo = useRef(0); // newest time we have asked OpenF1 for
  const newest = useRef(0); // newest sample actually received
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New session: start again.
  useEffect(() => {
    buffer.current = new Map();
    loadedTo.current = 0;
    newest.current = 0;
    const h = live ? Date.now() - LIVE_DELAY_MS : end - 60_000;
    headRef.current = h;
    setHead(h);
    setPlaying(live);
  }, [session.session_key, live, end]);

  function add(rows: CarLocation[]) {
    for (const r of rows) {
      if (r.x === 0 && r.y === 0) continue;
      const t = Date.parse(r.date);
      const list = buffer.current.get(r.driver_number) ?? [];
      if (!list.length || list[list.length - 1].t < t) list.push({ t, x: r.x, y: r.y });
      buffer.current.set(r.driver_number, list);
      if (t > newest.current) newest.current = t;
    }
  }

  // Fetch position data ahead of the playback clock.
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const ctrl = new AbortController();
    const tick = async () => {
      if (busy || cancelled) return;
      const h = headRef.current;
      let from: number, to: number;
      if (live) {
        from = loadedTo.current || Date.now() - LIVE_DELAY_MS - 4_000;
        to = Date.now();
      } else {
        // Jumped outside what we have: start loading from the new position.
        if (h < loadedFrom.current || h > loadedTo.current + 5_000 || !loadedTo.current) {
          buffer.current = new Map();
          newest.current = 0;
          loadedTo.current = Math.max(start, h - 2_000);
          loadedFrom.current = loadedTo.current;
        }
        if (loadedTo.current - h > 20_000 * speed || loadedTo.current >= end) return;
        from = loadedTo.current;
        to = Math.min(end, from + CHUNK_MS);
      }
      busy = true;
      setLoading(true);
      try {
        const rows = await openf1<CarLocation>('location', { session_key: session.session_key, 'date>': new Date(from).toISOString(), 'date<=': new Date(to).toISOString() }, ctrl.signal);
        if (cancelled) return;
        rows.sort((a, b) => a.date.localeCompare(b.date));
        add(rows);
        loadedTo.current = live && rows.length ? Date.parse(rows[rows.length - 1].date) : to;
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load car positions');
      } finally {
        busy = false;
        if (!cancelled) setLoading(false);
      }
    };
    // Nothing to show before the session starts. Otherwise wait a moment, so the timing tower's requests go first
    // and quickly flicking through sessions does not spend the request budget on car positions.
    if (!live && Date.now() < start) return () => { cancelled = true; };
    let id: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      tick();
      id = setInterval(tick, live ? liveEvery(LIVE_POLL_MS) : 1_000);
    }, 1_500);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(first);
      clearInterval(id);
    };
  }, [session.session_key, live, start, end, speed]);

  // Advance the clock every animation frame.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      let h = headRef.current + dt * (live ? 1 : speed);
      if (live && newest.current) {
        // Stay a little behind the newest data so every car has a sample to move towards.
        if (h > newest.current - 300) h = newest.current - 300;
        if (h < newest.current - LIVE_DELAY_MS * 2) h = newest.current - LIVE_DELAY_MS;
      }
      if (!live) {
        // Wait for data rather than running past it.
        if (h > loadedTo.current) h = Math.max(headRef.current, loadedTo.current);
        if (h >= end) {
          h = end;
          setPlaying(false);
        }
      }
      headRef.current = h;
      setHead(h);
      // Forget samples that are well behind the clock.
      for (const list of buffer.current.values()) {
        let i = 0;
        while (i < list.length - 2 && list[i + 1].t < h - 5_000) i++;
        if (i) list.splice(0, i);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, live, speed, end]);

  const geo = useMemo(() => (circuit.data ? geometry(circuit.data) : null), [circuit.data]);

  // Timing sector boundaries: where a car was when it crossed each sector line on a clean lap.
  const refLap = laps
    .filter((l) => l.date_start && l.duration_sector_1 && l.duration_sector_2 && l.lap_duration && !l.is_pit_out_lap)
    .sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
  const bounds = useQuery({
    queryKey: ['sector-bounds', session.session_key],
    enabled: !!refLap,
    staleTime: Infinity,
    // Live, OpenF1's position data can lag a little behind the lap times. Keep trying until the sector lines are found.
    refetchInterval: (q: { state: { status: string } }) => (q.state.status === 'error' ? 30_000 : false),
    queryFn: async ({ signal }) => {
      const t1 = Date.parse(refLap!.date_start!) + refLap!.duration_sector_1! * 1000;
      const t2 = t1 + refLap!.duration_sector_2! * 1000;
      const rows = await openf1<CarLocation>('location', { session_key: session.session_key, driver_number: refLap!.driver_number, 'date>': new Date(t1 - 2_000).toISOString(), 'date<': new Date(t2 + 2_000).toISOString() }, signal);
      const samples = rows.filter((r) => r.x || r.y).map((r) => ({ t: Date.parse(r.date), x: r.x, y: r.y })).sort((a, b) => a.t - b.t);
      const p1 = position(samples, t1);
      const p2 = position(samples, t2);
      if (!p1 || !p2) throw new Error('No positions for the sector lines');
      return [p1, p2];
    },
  });
  const sectorPaths = useMemo(() => (geo && bounds.data ? geo.split(bounds.data) : null), [geo, bounds.data]);
  const bests = useMemo(() => sectorBests(laps, head), [laps, head]);
  const flags = useMemo(() => flagState(messages, head), [messages, head]);

  const seek = (t: number) => {
    headRef.current = t;
    setHead(t);
  };

  if (circuit.error) return <div className="empty">The circuit layout is not available for this track.</div>;
  if (!geo) return <div className="empty">Loading the circuit…</div>;

  const cars = drivers
    .map((d) => {
      const p = position(buffer.current.get(d.driver_number), head);
      return p ? { d, ...geo.project(p.x, p.y), stale: p.stale } : null;
    })
    .filter((c): c is NonNullable<typeof c> => !!c)
    // Favourite and team drawn last so they sit on top.
    .sort((a, b) => rank(a.d.driver_number) - rank(b.d.driver_number));
  function rank(n: number) {
    return n === favNum ? 2 : teamNums.includes(n) ? 1 : 0;
  }

  const flagBanner = banner(flags, geo.sectors);
  const r = geo.size * 0.016;
  const sw = geo.size * 0.011;

  return (
    <div className={`tmap${flags.red ? ' is-red' : flags.sectors.size ? ' is-yellow' : flags.neutralised ? ' is-sc' : ''}`}>
      <div className="tmap-stage">
      {flagBanner && <div className={`tmap-banner ${flagBanner.tone}`} role="status">{flagBanner.text}</div>}
      <svg viewBox={geo.viewBox} className="tmap-svg" role="img" aria-label={`Track map of ${session.circuit_short_name} with car positions`}>
        <path d={geo.path} className="tmap-edge" style={{ strokeWidth: sw * 2.2 }} />
        {showSectors && sectorPaths && !flags.red && !flags.neutralised ? (
          sectorPaths.map((sp, i) => <path key={i} d={sp.path} className={`tmap-sector s${i + 1}`} style={{ strokeWidth: sw }} />)
        ) : null}
        <path
          d={geo.path}
          className={`tmap-track${flags.red ? ' red' : flags.neutralised ? ' sc' : ''}`}
          style={{ display: showSectors && sectorPaths && !flags.red && !flags.neutralised ? 'none' : undefined, strokeWidth: sw, strokeDasharray: flags.neutralised && !flags.red ? `${sw * 2.5} ${sw * 1.5}` : undefined }}
        />
        {!flags.red &&
          geo.sectors.map((s) =>
            flags.sectors.get(s.number) ? (
              <g key={s.number}>
                <path d={s.path} className={`tmap-flag glow ${flags.sectors.get(s.number)}`} style={{ strokeWidth: sw * 3.2 }} />
                <path d={s.path} className={`tmap-flag ${flags.sectors.get(s.number)}`} style={{ strokeWidth: sw * 1.3 }} />
                <path d={s.path} className="tmap-flag stripe" style={{ strokeWidth: sw * 0.45, strokeDasharray: `${sw * 1.2} ${sw * 1.2}` }} />
              </g>
            ) : null,
          )}
        {geo.finish && (
          <g transform={`translate(${geo.finish.x} ${geo.finish.y}) rotate(${geo.finish.angle})`}>
            <rect x={-sw * 2.4} y={-sw * 1.2} width={sw * 4.8} height={sw * 2.4} fill="#fff" stroke="#0b0b0d" strokeWidth={sw * 0.25} />
            {[0, 1, 2, 3].map((i) =>
              [0, 1].map((j) => <rect key={`${i}${j}`} x={-sw * 2.4 + i * sw * 1.2} y={-sw * 1.2 + j * sw * 1.2} width={sw * 1.2} height={sw * 1.2} fill={(i + j) % 2 ? '#111' : 'none'} />),
            )}
          </g>
        )}
        {geo.corners.map((c) => (
          <g key={c.number} className="tmap-corner">
            <circle cx={c.x} cy={c.y} r={r * 1.15} />
            <text x={c.x} y={c.y} style={{ fontSize: r * 1.15 }}>{c.number}</text>
          </g>
        ))}
        {showSectors &&
          sectorPaths?.map((sp, i) => (
            <g key={`sl${i}`} className={`tmap-slabel s${i + 1}`}>
              <rect x={sp.label.x - r * 1.5} y={sp.label.y - r * 0.85} width={r * 3} height={r * 1.7} rx={r * 0.4} />
              <text x={sp.label.x} y={sp.label.y} style={{ fontSize: r * 1.05 }}>S{i + 1}</text>
            </g>
          ))}
        {cars.map(({ d, x, y, stale }) => {
          const code = d.name_acronym;
          const fav = d.driver_number === favNum;
          const team = teamNums.includes(d.driver_number);
          const colour = teamColour(d.team_name, d.team_colour);
          const rr = fav ? r * 1.45 : r;
          return (
            <a key={d.driver_number} href={driverHref(code)} className="tmap-car" style={{ opacity: stale ? 0.35 : 1 }}>
              <title>{`${code}: full stats`}</title>
              {(fav || team) && <circle cx={x} cy={y} r={rr * 1.35} fill="none" stroke={fav ? 'var(--fav, #f5c518)' : '#fff'} strokeWidth={r * 0.22} />}
              <circle cx={x} cy={y} r={rr} fill={colour} stroke="#0b0b0d" strokeWidth={r * 0.15} />
              <text x={x} y={y} style={{ fontSize: rr * 0.78 }} fill={textOn(colour)}>{code}</text>
            </a>
          );
        })}
      </svg>
      </div>
      {showSectors && (
        <div className="tmap-sectors">
          {[0, 1, 2].map((i) => {
            const top = bests.top[i];
            const favPos = favNum != null ? bests.rank[i].findIndex((b) => b.driver === favNum) : -1;
            const favBest = favPos >= 3 ? bests.rank[i][favPos] : null;
            return (
              <div key={i} className={`tmap-sbox s${i + 1}`}>
                <div className="tmap-sname">Sector {i + 1}</div>
                {top.length === 0 ? (
                  <div className="faint">No sector times yet</div>
                ) : (
                  <ol className="tmap-top">
                    {top.map((b, k) => {
                      const d = drivers.find((x) => x.driver_number === b.driver);
                      const colour = teamColour(d?.team_name, d?.team_colour);
                      return (
                        <li key={b.driver} className={b.driver === favNum ? 'fav' : teamNums.includes(b.driver) ? 'team' : ''}>
                          <span className="tmap-tile" style={{ '--team': colour } as React.CSSProperties}>
                            <b>{k + 1}</b>
                            {d ? <a href={driverHref(d.name_acronym)} title={`${d.name_acronym}: full stats`}>{d.name_acronym}</a> : <span>#{b.driver}</span>}
                          </span>
                          <span className={`mono${k === 0 ? ' tone-overall' : ''}`}>{b.time.toFixed(3)}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                {favBest && (
                  <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                    ★ {drivers.find((x) => x.driver_number === favNum)?.name_acronym} P{favPos + 1} · {favBest.time.toFixed(3)} (+{(favBest.time - top[0].time).toFixed(3)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="tmap-bar">
        {live ? (
          <span className="muted">
            <span className="dot live-dot on" /> Live, about {Math.round((liveEvery(LIVE_POLL_MS) + 3_000) / 1000)} s behind · {fmtClock(new Date(head))}
          </span>
        ) : (
          <>
            <button className="tab" onClick={() => (head >= end ? (seek(start), setPlaying(true)) : setPlaying(!playing))} aria-label={playing ? 'Pause replay' : 'Play replay'}>
              {playing ? '❚❚ Pause' : '▶ Replay'}
            </button>
            <input
              className="tmap-scrub"
              type="range"
              min={start}
              max={end}
              step={1000}
              value={head}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Replay position"
            />
            <span className="mono muted tmap-clock">{fmtClock(new Date(head))}</span>
            <span className="tabs" style={{ margin: 0 }}>
              {SPEEDS.map((s) => (
                <button key={s} className="tab" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>
              ))}
            </span>
          </>
        )}
        {loading && cars.length === 0 && <span className="faint">Loading positions…</span>}
        {error && <span style={{ color: 'var(--amber)' }}>Positions: {error}</span>}
        <button className="tab" aria-pressed={showSectors} onClick={() => setShowSectors(!showSectors)} style={{ marginLeft: 'auto' }}>Sectors</button>
        <span className="faint">Layout: MultiViewer · Positions: OpenF1</span>
      </div>
    </div>
  );
}

/** A car's position at time t, interpolated between the two nearest samples. */
function position(list: Sample[] | undefined, t: number): { x: number; y: number; stale: boolean } | null {
  if (!list?.length) return null;
  if (t <= list[0].t) return list[0].t - t < 10_000 ? { x: list[0].x, y: list[0].y, stale: false } : null;
  let i = list.length - 1;
  while (i > 0 && list[i].t > t) i--;
  const a = list[i];
  const b = list[i + 1];
  if (!b) return { x: a.x, y: a.y, stale: t - a.t > 10_000 };
  const k = (t - a.t) / (b.t - a.t || 1);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, stale: false };
}

/* ---------- flags ---------- */

function flagState(messages: ClassifiedMsg[], t: number) {
  const sectors = new Map<number, 'yellow' | 'double'>();
  let red = false;
  let neutralised = false;
  const iso = new Date(t).toISOString();
  for (const m of [...messages].sort((a, b) => a.date.localeCompare(b.date))) {
    if (m.date > iso) break;
    const text = m.message.toUpperCase();
    const flag = (m.flag ?? '').toUpperCase();
    if (m.category === 'SafetyCar') {
      if (/DEPLOYED/.test(text)) neutralised = true;
      else if (/ENDING|IN THIS LAP/.test(text)) neutralised = false;
      continue;
    }
    if (m.category !== 'Flag') continue;
    const scope = (m.scope ?? '').toLowerCase();
    if (scope === 'sector' && m.sector) {
      if (flag === 'DOUBLE YELLOW') sectors.set(m.sector, 'double');
      else if (flag === 'YELLOW') sectors.set(m.sector, 'yellow');
      else if (flag === 'CLEAR' || flag === 'GREEN') sectors.delete(m.sector);
    } else if (flag === 'RED') red = true;
    else if (flag === 'GREEN' || flag === 'CLEAR') {
      red = false;
      sectors.clear();
    } else if (flag === 'CHEQUERED') {
      sectors.clear();
      neutralised = false;
    }
  }
  return { sectors, red, neutralised };
}

/** Black or white text, whichever reads better on the team colour. */
function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#111' : '#fff';
}

/** Fastest time in each sector up to time t, overall and per driver. */
function sectorBests(laps: Lap[], t: number) {
  const overall: ({ time: number; driver: number } | undefined)[] = [undefined, undefined, undefined];
  const byDriver = new Map<number, (number | undefined)[]>();
  for (const l of laps) {
    if (!l.date_start) continue;
    let end = Date.parse(l.date_start);
    const secs = [l.duration_sector_1, l.duration_sector_2, l.duration_sector_3];
    secs.forEach((d, i) => {
      if (d == null) return;
      end += d * 1000;
      if (end > t || l.is_pit_out_lap) return;
      const cur = overall[i];
      if (!cur || d < cur.time) overall[i] = { time: d, driver: l.driver_number };
      const mine = byDriver.get(l.driver_number) ?? [undefined, undefined, undefined];
      if (mine[i] == null || d < mine[i]!) mine[i] = d;
      byDriver.set(l.driver_number, mine);
    });
  }
  // Each driver's best per sector, fastest first.
  const rank = [0, 1, 2].map((i) =>
    [...byDriver.entries()]
      .filter(([, v]) => v[i] != null)
      .map(([driver, v]) => ({ driver, time: v[i]! }))
      .sort((a, b) => a.time - b.time),
  );
  return { overall, byDriver, rank, top: rank.map((r) => r.slice(0, 3)) };
}

/** Headline for the flag state shown over the map, or null when the track is green. */
function banner(f: ReturnType<typeof flagState>, sectors: { number: number; turn: number }[]): { text: string; tone: string } | null {
  if (f.red) return { text: 'Red flag · Session stopped', tone: 'red' };
  if (f.sectors.size) {
    const list = [...f.sectors.entries()].sort((a, b) => a[0] - b[0]);
    const dbl = list.some(([, v]) => v === 'double');
    const turns = [...new Set(list.map(([n]) => sectors.find((s) => s.number === n)?.turn).filter((t): t is number => !!t))].sort((a, b) => a - b);
    const where = turns.length ? `Turn${turns.length > 1 ? 's' : ''} ${turns.join(', ')}` : `Marshal sector ${list.map(([n]) => n).join(', ')}`;
    return { text: `${dbl ? 'Double yellow' : 'Yellow flag'} · ${where}`, tone: dbl ? 'double' : 'yellow' };
  }
  if (f.neutralised) return { text: 'Safety car', tone: 'sc' };
  return null;
}
