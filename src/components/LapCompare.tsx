import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Race } from '../api/jolpica';
import { findMeeting, meetingSessions, openf1, type Lap, type OF1Driver, type Pit, type Stint } from '../api/openf1';
import { useFavourite } from '../hooks/useFavourite';
import { fmtLap } from '../lib/format';
import { driverLaps, paceGap, representative, timeRange, type LapPoint } from '../lib/lapCompare';
import { teamColour, tyre } from '../lib/teams';
import { SpeedTrace } from './SpeedTrace';

/** Team colours for the two drivers; team-mates share one, so the second then shows in the text colour. */
function traceColours(a: OF1Driver, b: OF1Driver): [string, string] {
  const ca = teamColour(a.team_name, a.team_colour), cb = teamColour(b.team_name, b.team_colour);
  return [ca, ca === cb || a.team_name === b.team_name ? 'var(--text)' : cb];
}

const H = 350, L = 64, R = 16, T = 14, B = 50;
const SESSION_ORDER = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Sprint Shootout', 'Sprint', 'Qualifying', 'Race'];
const short = (n: string) => n.replace('Practice ', 'FP').replace('Sprint Qualifying', 'Sprint quali').replace('Sprint Shootout', 'Sprint quali');

/**
 * Two drivers' lap times in one session of a weekend (OpenF1, 2023 onward): one line each, with pit stops and tyre
 * changes marked, the tyre on every lap in the tooltip, and their average gap over the laps both did at race pace.
 */
export function LapCompare({ race, now }: { race: Race; now: number }) {
  const fav = useFavourite();
  const meeting = useQuery({ queryKey: ['meeting-year', race.season, race.round], staleTime: Infinity, queryFn: ({ signal }) => findMeeting([race.date], signal) });
  const mk = meeting.data?.meeting_key;
  const sessions = useQuery({ queryKey: ['meeting-sessions', mk], enabled: !!mk, staleTime: 10 * 60_000, queryFn: ({ signal }) => meetingSessions(mk!, signal) });
  const started = useMemo(
    () => (sessions.data ?? []).filter((s) => Date.parse(s.date_start) < now).sort((a, b) => SESSION_ORDER.indexOf(a.session_name) - SESSION_ORDER.indexOf(b.session_name)),
    [sessions.data, now],
  );
  const [picked, setPicked] = useState<number | null>(null);
  const session = started.find((s) => s.session_key === picked) ?? started.find((s) => s.session_name === 'Race') ?? started[started.length - 1];
  const sk = session?.session_key;
  const data = useQuery({
    queryKey: ['lap-compare', sk],
    enabled: !!sk,
    staleTime: session && Date.parse(session.date_end) + 30 * 60_000 < now ? Infinity : 60_000,
    queryFn: async ({ signal }) => {
      const [laps, stints, pits, drivers] = await Promise.all([
        openf1<Lap>('laps', { session_key: sk! }, signal),
        openf1<Stint>('stints', { session_key: sk! }, signal),
        openf1<Pit>('pit', { session_key: sk! }, signal),
        openf1<OF1Driver>('drivers', { session_key: sk! }, signal),
      ]);
      return { laps, stints, pits, drivers };
    },
  });

  // Drivers with laps, quickest first: by finishing order in a race, by best lap in other sessions.
  const drivers = useMemo(() => {
    const d = data.data;
    if (!d) return [];
    const best = new Map<number, number>();
    for (const l of d.laps) if (l.lap_duration && !l.is_pit_out_lap) best.set(l.driver_number, Math.min(best.get(l.driver_number) ?? Infinity, l.lap_duration));
    // Race order from the lap data itself: most laps first, then the first to finish their last lap.
    const last = new Map<number, { lap: number; end: number }>();
    for (const l of d.laps) {
      const end = l.date_start && l.lap_duration ? Date.parse(l.date_start) + l.lap_duration * 1000 : Infinity;
      const cur = last.get(l.driver_number);
      if (!cur || l.lap_number > cur.lap || (l.lap_number === cur.lap && end < cur.end)) last.set(l.driver_number, { lap: l.lap_number, end });
    }
    const isRace = /^(Race|Sprint)$/.test(session?.session_name ?? '');
    const raceOrder = (x: number, y: number) => {
      const p = last.get(x), q = last.get(y);
      return (q?.lap ?? 0) - (p?.lap ?? 0) || (p?.end ?? Infinity) - (q?.end ?? Infinity);
    };
    return d.drivers
      .filter((x) => best.has(x.driver_number))
      .sort((a, b) => (isRace ? raceOrder(a.driver_number, b.driver_number) : 0) || best.get(a.driver_number)! - best.get(b.driver_number)!);
  }, [data.data, session?.session_name]);

  const [choice, setChoice] = useState<[number | null, number | null]>([null, null]);
  const [view, setView] = useState<'laps' | 'trace'>('laps');
  const favNum = drivers.find((d) => d.name_acronym === fav?.code)?.driver_number ?? null;
  const a = drivers.find((d) => d.driver_number === choice[0])?.driver_number ?? favNum ?? drivers[0]?.driver_number ?? null;
  const b = drivers.find((d) => d.driver_number === choice[1] && d.driver_number !== a)?.driver_number ?? drivers.find((d) => d.driver_number !== a)?.driver_number ?? null;

  if (meeting.isLoading || sessions.isLoading) return <div className="empty">Loading sessions…</div>;
  if (!started.length) return <div className="empty">Lap times are not available for this weekend.</div>;

  return (
    <div>
      <div className="lapcmp-controls">
        <div className="tabs" role="tablist" aria-label="Session" style={{ marginBottom: 0 }}>
          {started.map((s) => (
            <button key={s.session_key} role="tab" className="tab" aria-selected={s.session_key === sk} onClick={() => setPicked(s.session_key)}>{short(s.session_name)}</button>
          ))}
        </div>
        {drivers.length > 1 && a != null && b != null && (
          <div className="lapcmp-pick">
            <DriverSelect label="Driver 1" value={a} drivers={drivers} onChange={(n) => setChoice([n, n === b ? a : b])} />
            <span className="muted">vs</span>
            <DriverSelect label="Driver 2" value={b} drivers={drivers.filter((d) => d.driver_number !== a)} onChange={(n) => setChoice([a, n])} />
          </div>
        )}
      </div>
      {data.isLoading ? (
        <div className="empty">Loading lap times…</div>
      ) : !data.data || drivers.length < 2 || a == null || b == null ? (
        <div className="empty">No lap times for this session yet.</div>
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="View" style={{ marginTop: 12, marginBottom: 0 }}>
            <button role="tab" className="tab" aria-selected={view === 'laps'} onClick={() => setView('laps')}>Lap by lap</button>
            <button role="tab" className="tab" aria-selected={view === 'trace'} onClick={() => setView('trace')}>Fastest laps: speed and gap</button>
          </div>
          {view === 'laps' ? (
            <LapChart race={/^(Race|Sprint)$/.test(session?.session_name ?? '')} data={data.data} a={drivers.find((d) => d.driver_number === a)!} b={drivers.find((d) => d.driver_number === b)!} />
          ) : (
            <SpeedTrace session={session!} laps={data.data.laps} a={drivers.find((d) => d.driver_number === a)!} b={drivers.find((d) => d.driver_number === b)!} colours={traceColours(drivers.find((d) => d.driver_number === a)!, drivers.find((d) => d.driver_number === b)!)} />
          )}
        </>
      )}
    </div>
  );
}

function DriverSelect({ label, value, drivers, onChange }: { label: string; value: number; drivers: OF1Driver[]; onChange: (n: number) => void }) {
  return (
    <label className="field">
      <span className="sr-only">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {drivers.map((d) => (
          <option key={d.driver_number} value={d.driver_number}>{d.name_acronym} · {d.broadcast_name}</option>
        ))}
      </select>
    </label>
  );
}

function LapChart({ data, a, b, race }: { data: { laps: Lap[]; stints: Stint[]; pits: Pit[] }; a: OF1Driver; b: OF1Driver; race: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  // Drawn at the width it is shown at, so the axis text stays readable on a phone.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const series = useMemo(() => [a, b].map((d) => driverLaps(data.laps, data.stints, data.pits, d.driver_number)), [data, a, b]);
  const colours = [teamColour(a.team_name, a.team_colour), teamColour(b.team_name, b.team_colour)];
  const range = timeRange(series, race);
  const lastLap = Math.max(1, ...series.flat().map((p) => p.lap));
  if (!range) return <div className="empty">No timed laps for these drivers.</div>;
  const [lo, hi] = range;
  const x = (lap: number) => L + ((lap - 1) / Math.max(1, lastLap - 1)) * (W - L - R);
  // Slower laps higher up, so the lines fall as a driver gets faster.
  const y = (t: number) => H - B - ((Math.min(t, hi) - lo) / (hi - lo)) * (H - T - B);
  const path = (ps: LapPoint[]) => {
    let d = '';
    let pen = false;
    for (const p of ps) {
      if (p.time == null || p.time > hi || p.pitIn || p.pitOut) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${x(p.lap).toFixed(1)},${y(p.time).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  // Grid lines on round lap times (0.5, 1, 2 or 5 seconds apart).
  const step = [0.5, 1, 2, 5, 10].find((s) => (hi - lo) / s <= 6) ?? 10;
  const ticks = Array.from({ length: Math.floor(hi / step) - Math.ceil(lo / step) + 1 }, (_, i) => (Math.ceil(lo / step) + i) * step);
  const nTicks = W < 600 ? 3 : 6;
  const lapTicks = Array.from(new Set([1, ...Array.from({ length: nTicks }, (_, i) => Math.round(1 + ((lastLap - 1) * (i + 1)) / nTicks))]));
  const gap = race ? paceGap(series[0], series[1], hi) : null;
  const who = [a, b];
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(1, Math.min(lastLap, Math.round(1 + ((vx - L) / (W - L - R)) * (lastLap - 1)))));
  };
  const at = (i: number, lap: number) => series[i].find((p) => p.lap === lap);
  const best = series.map((s) => Math.min(...s.filter(representative).map((p) => p.time!)));

  return (
    <div>
      <div className="legend" style={{ marginTop: 12 }}>
        {who.map((d, i) => (
          <span key={d.driver_number}>
            <svg width="22" height="10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke={colours[i]} strokeWidth="2" strokeDasharray={i === 1 ? '5 3' : undefined} /></svg>
            <b style={{ color: 'var(--text)' }}>{d.name_acronym}</b> best {fmtLap(best[i])}
          </span>
        ))}
        <span><svg width="10" height="10" aria-hidden="true"><path d="M5 1 L9 9 L1 9 Z" fill="var(--muted)" /></svg>Pit stop</span>
        <span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="var(--muted)" stroke="var(--card)" strokeWidth="2" /></svg>New tyres (colour of the tyre)</span>
        <span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--muted)" strokeWidth="1.5" /></svg>Slower lap, off the scale</span>
      </div>
      {!race && Number.isFinite(best[0]) && Number.isFinite(best[1]) && (
        <p className="lapcmp-gap">
          Best laps: <b>{best[0] <= best[1] ? a.name_acronym : b.name_acronym}</b> was <b className="mono">{Math.abs(best[1] - best[0]).toFixed(3)} s</b> quicker ({fmtLap(best[0])} vs {fmtLap(best[1])}).
        </p>
      )}
      {gap && (
        <p className="lapcmp-gap">
          Over the {gap.laps} laps both did at full pace, <b>{gap.gap >= 0 ? a.name_acronym : b.name_acronym}</b> was{' '}
          <b className="mono">{Math.abs(gap.gap).toFixed(3)} s</b> a lap quicker on average ({fmtLap(gap.avgA)} vs {fmtLap(gap.avgB)}).
        </p>
      )}
      <div className="lapcmp-chart" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lap times of ${a.name_acronym} and ${b.name_acronym}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line-soft)" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--faint)" className="mono">{fmtLap(t).replace(/0+$/, '').replace(/\.$/, '')}</text>
            </g>
          ))}
          {lapTicks.map((l) => (
            <text key={l} x={x(l)} y={H - 4} textAnchor="middle" fontSize="12" fill="var(--faint)">L{l}</text>
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--line-strong)" />}
          {series.map((s, i) => (
            <g key={i}>
              <path d={path(s)} fill="none" stroke={colours[i]} strokeWidth="2" strokeLinejoin="round" strokeDasharray={i === 1 ? '6 4' : undefined} />
              {s.filter((p) => representative(p) && p.time! <= hi).map((p) => (
                <circle key={`d${p.lap}`} cx={x(p.lap)} cy={y(p.time!)} r={race ? 2.5 : 4} fill={colours[i]} stroke="var(--card)" strokeWidth={race ? 0 : 1.5} />
              ))}
              {s.filter((p) => p.time != null && p.time > hi && !p.pitIn && !p.pitOut).map((p) => (
                <circle key={p.lap} cx={x(p.lap)} cy={T + 4} r="3.5" fill="none" stroke={colours[i]} strokeWidth="1.5" />
              ))}
              {s.filter((p) => p.pitIn).map((p) => (
                <path key={p.lap} d={`M${x(p.lap)},${H - B + 4 + i * 11} l5,9 l-10,0 Z`} fill={colours[i]} stroke="var(--card)" strokeWidth="1"><title>{`${who[i].name_acronym} pits on lap ${p.lap}`}</title></path>
              ))}
              {s.filter((p) => p.newTyres || (p === s[0] && p.compound)).map((p) => {
                const t = s.find((q) => q.lap >= p.lap && representative(q) && q.time! <= hi);
                return t ? <circle key={p.lap} cx={x(t.lap)} cy={y(t.time!)} r="5" fill={tyre(p.compound).colour} stroke="var(--card)" strokeWidth="2"><title>{`${who[i].name_acronym}: ${tyre(p.compound).name} from lap ${p.lap}`}</title></circle> : null;
              })}
            </g>
          ))}
        </svg>
        {hover != null && (
          <div className="lapcmp-tip" style={{ left: `clamp(95px, ${(x(hover) / W) * 100}%, calc(100% - 95px))` }} role="status">
            <div className="muted" style={{ fontSize: 11 }}>Lap {hover}</div>
            {who.map((d, i) => {
              const p = at(i, hover);
              return (
                <div key={d.driver_number} className="lapcmp-tip-row">
                  <i className="sw" style={{ background: colours[i] }} />
                  <b>{d.name_acronym}</b>
                  <span className="mono">{fmtLap(p?.time)}</span>
                  <span className="muted">{p?.compound ? `${tyre(p.compound).letter}${p.tyreAge != null ? ` ${p.tyreAge}` : ''}` : ''}{p?.pitIn ? ' · in' : p?.pitOut ? ' · out' : ''}</span>
                </div>
              );
            })}
            {(() => {
              const p = at(0, hover), q = at(1, hover);
              return p?.time != null && q?.time != null ? <div className="muted" style={{ fontSize: 11 }}>{q.time === p.time ? 'Same time' : `${q.time > p.time ? a.name_acronym : b.name_acronym} ${Math.abs(q.time - p.time).toFixed(3)} s quicker`}</div> : null;
            })()}
          </div>
        )}
      </div>
      <button className="btn" style={{ marginTop: 8 }} onClick={() => setTable(!table)} aria-expanded={table}>{table ? 'Hide the table' : 'Show laps as a table'}</button>
      {table && (
        <div className="scroll-x" style={{ marginTop: 8, maxHeight: 360, overflowY: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Lap</th>{who.map((d) => <th key={d.driver_number} className="r">{d.name_acronym}</th>)}<th className="r">Gap</th></tr></thead>
            <tbody>
              {Array.from({ length: lastLap }, (_, k) => k + 1).map((lap) => {
                const p = at(0, lap), q = at(1, lap);
                const cell = (r?: LapPoint) => (r ? `${fmtLap(r.time)}${r.compound ? ` ${tyre(r.compound).letter}` : ''}${r.pitIn ? ' in' : r.pitOut ? ' out' : ''}` : '-');
                return (
                  <tr key={lap}>
                    <td className="mono muted">{lap}</td>
                    <td className="r mono">{cell(p)}</td>
                    <td className="r mono">{cell(q)}</td>
                    <td className="r mono muted">{p?.time != null && q?.time != null ? (q.time - p.time >= 0 ? '+' : '') + (q.time - p.time).toFixed(3) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        {race ? '' : 'In practice and qualifying, drivers do different programmes, so the same lap number is not a like-for-like comparison. '}Lap times from OpenF1. {who[1].name_acronym}'s line is dashed. Laps into and out of the pits are left out of the lines and the average. Lower is faster. Laps much slower than usual pace (safety car, cool-down laps) sit at the top edge. The letter and number in the tooltip are the tyre and how many laps old it was. In the table, Gap is {b.name_acronym}'s lap minus {a.name_acronym}'s.
      </p>
    </div>
  );
}
