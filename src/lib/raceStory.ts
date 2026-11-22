/**
 * The story of a race as a timeline, worked out from data rather than written by hand: the start, lead changes,
 * safety cars, virtual safety cars and red flags, pit stops (with the tyres fitted), stewards' penalties, retirements,
 * the fastest lap and the finish.
 *
 * Sources: OpenF1 positions, laps, pit stops, stints and race control messages, plus the classification (Jolpica, or
 * OpenF1's provisional one) for the grid, retirements and the winner.
 */
import type { Result } from '../api/jolpica';
import type { Lap, PitDetail, RaceControlMsg, Stint } from '../api/openf1';
import type { PositionTrace } from './sectorLines';
import { classify, summarisePenalties } from './raceControl';
import { fmtLap } from './format';

export type StoryKind = 'start' | 'lead' | 'sc' | 'vsc' | 'red' | 'pit' | 'penalty' | 'retire' | 'fastest' | 'finish';

export interface StoryEvent {
  lap: number | null;
  kind: StoryKind;
  title: string;
  detail?: string;
  /** Car numbers the event is about. */
  cars: number[];
  /** Pit stops by drivers outside the top five are hidden until asked for. */
  minor?: boolean;
}

export interface StoryInput {
  results: Result[];
  traces: PositionTrace[];
  lapRows: Lap[];
  raceControl: RaceControlMsg[];
  pits: PitDetail[];
  stints: Stint[];
}

const COMPOUND: Record<string, string> = { SOFT: 'Soft', MEDIUM: 'Medium', HARD: 'Hard', INTERMEDIATE: 'Intermediate', WET: 'Wet' };
const tyre = (c: string | null | undefined) => (c ? (COMPOUND[c.toUpperCase()] ?? c) : null);

const plainCase = (s: string) => {
  const t = s.trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};

export function raceStory(input: StoryInput): StoryEvent[] {
  const { results, traces, lapRows, raceControl, pits, stints } = input;
  const byNum = new Map(results.map((r) => [Number(r.number), r]));
  const code = (n: number) => byNum.get(n)?.Driver.code ?? byNum.get(n)?.Driver.familyName.slice(0, 3).toUpperCase() ?? `#${n}`;
  const name = (n: number) => {
    const r = byNum.get(n);
    return r ? `${r.Driver.givenName} ${r.Driver.familyName}` : `Car ${n}`;
  };
  const finish = (n: number) => {
    const p = Number(byNum.get(n)?.positionText);
    return Number.isFinite(p) && p > 0 ? p : 99;
  };
  const events: StoryEvent[] = [];
  const totalLaps = Math.max(0, ...traces.map((t) => t.positions.length - 1), ...lapRows.map((l) => l.lap_number));
  const pitLaps = new Map<number, Set<number>>();
  for (const p of pits) {
    if (!pitLaps.has(p.lap_number)) pitLaps.set(p.lap_number, new Set());
    pitLaps.get(p.lap_number)!.add(p.driver_number);
  }

  // The start: who led lap 1, and from where.
  // The leader of a lap is the first car to complete it; positions sampled per car can briefly show two cars in P1.
  const lapEnd = new Map<number, { driver: number; t: number }>();
  const startOf = new Map(lapRows.filter((l) => l.date_start).map((l) => [`${l.driver_number}:${l.lap_number}`, Date.parse(l.date_start!)]));
  for (const l of lapRows) {
    const next = startOf.get(`${l.driver_number}:${l.lap_number + 1}`);
    const end = next ?? (l.date_start && l.lap_duration ? Date.parse(l.date_start) + l.lap_duration * 1000 : null);
    if (end == null) continue;
    const best = lapEnd.get(l.lap_number);
    if (!best || end < best.t) lapEnd.set(l.lap_number, { driver: l.driver_number, t: end });
  }
  const leaderAt = (lap: number) => lapEnd.get(lap)?.driver ?? traces.find((t) => t.positions[lap] === 1)?.driver ?? null;
  const pole = results.find((r) => r.grid === '1');
  const first = leaderAt(1);
  if (first != null) {
    const poleNum = pole ? Number(pole.number) : null;
    const grid = byNum.get(first)?.grid;
    events.push({
      lap: 1,
      kind: 'start',
      title: poleNum === first || !pole ? `${name(first)} leads away from pole` : `${name(first)} takes the lead at the start`,
      detail: poleNum === first || !pole ? undefined : `From P${grid && Number(grid) > 0 ? grid : '?'} on the grid, ahead of ${name(poleNum!)} who started on pole`,
      cars: poleNum != null && poleNum !== first ? [first, poleNum] : [first],
    });
  }

  // Lead changes at the end of each lap. Back-and-forth swaps between the same two drivers a few laps apart are one
  // battle for the lead rather than a list of single laps.
  const swaps: { lap: number; to: number; from: number; pitted: boolean }[] = [];
  let leader = first;
  for (let lap = 2; lap <= totalLaps; lap++) {
    const now = leaderAt(lap);
    if (now == null || now === leader) continue;
    if (leader != null) swaps.push({ lap, to: now, from: leader, pitted: !!(pitLaps.get(lap)?.has(leader) || pitLaps.get(lap - 1)?.has(leader)) });
    leader = now;
  }
  const pair = (a: { to: number; from: number }, b: { to: number; from: number }) => a.to === b.from && a.from === b.to;
  for (let i = 0; i < swaps.length; ) {
    let j = i;
    while (j + 1 < swaps.length && !swaps[j + 1].pitted && !swaps[i].pitted && pair(swaps[j], swaps[j + 1]) && swaps[j + 1].lap - swaps[j].lap <= 6) j++;
    const a = swaps[i], z = swaps[j];
    if (j - i >= 2) {
      events.push({
        lap: a.lap,
        kind: 'lead',
        title: `Battle for the lead: ${name(a.to)} and ${name(a.from)}`,
        detail: `The lead changed hands ${j - i + 1} times from lap ${a.lap} to lap ${z.lap}; ${name(z.to)} came out ahead`,
        cars: [a.to, a.from],
      });
    } else {
      for (const w of swaps.slice(i, j + 1)) {
        events.push({ lap: w.lap, kind: 'lead', title: `${name(w.to)} takes the lead`, detail: `From ${name(w.from)}${w.pitted ? ', who made a pit stop' : ''}`, cars: [w.to, w.from] });
      }
    }
    i = j + 1;
  }

  // Safety car, virtual safety car and red flag periods.
  const rc = [...raceControl].sort((a, b) => a.date.localeCompare(b.date));
  let sc: { kind: 'sc' | 'vsc'; lap: number | null } | null = null;
  let red: number | null | undefined;
  const lapOf = (m: RaceControlMsg) => m.lap_number ?? null;
  const span = (a: number | null, b: number | null) => (a != null && b != null ? (b > a ? `Laps ${a} to ${b}` : `Lap ${a}`) : a != null ? `From lap ${a}` : undefined);
  for (const m of rc) {
    const text = m.message.toUpperCase();
    const flag = (m.flag ?? '').toUpperCase();
    if (m.category === 'SafetyCar') {
      const virtual = /VIRTUAL/.test(text);
      if (/DEPLOYED/.test(text)) sc = { kind: virtual ? 'vsc' : 'sc', lap: lapOf(m) };
      else if (sc && /IN THIS LAP|ENDING|WITHDRAWN/.test(text)) {
        events.push({ lap: sc.lap, kind: sc.kind, title: sc.kind === 'vsc' ? 'Virtual safety car' : 'Safety car', detail: span(sc.lap, lapOf(m)), cars: [] });
        sc = null;
      }
    } else if (flag === 'RED' && (m.scope ?? '').toLowerCase() === 'track') {
      red = lapOf(m);
    } else if (red !== undefined && ((flag === 'GREEN' && (m.scope ?? '').toLowerCase() === 'track') || /RESUME|RESTART/.test(text)) && !/WILL RESUME/.test(text)) {
      events.push({ lap: red, kind: 'red', title: 'Red flag', detail: red != null ? `The race was stopped on lap ${red} and restarted` : 'The race was stopped and restarted', cars: [] });
      red = undefined;
    }
  }
  if (sc) events.push({ lap: sc.lap, kind: sc.kind, title: sc.kind === 'vsc' ? 'Virtual safety car' : 'Safety car', detail: span(sc.lap, null), cars: [] });
  if (red !== undefined) events.push({ lap: red, kind: 'red', title: 'Red flag', detail: red != null ? `The race was stopped on lap ${red}` : undefined, cars: [] });

  // Pit stops, with the tyres taken off and fitted.
  const stintsOf = (n: number) => stints.filter((s) => s.driver_number === n).sort((a, b) => a.stint_number - b.stint_number);
  for (const p of [...pits].sort((a, b) => a.date.localeCompare(b.date))) {
    const mine = stintsOf(p.driver_number);
    const next = mine.find((s) => s.lap_start != null && s.lap_start > p.lap_number && s.lap_start <= p.lap_number + 2);
    const prev = next ? mine.filter((s) => s.stint_number < next.stint_number).pop() : undefined;
    const from = tyre(prev?.compound), to = tyre(next?.compound);
    const tyres = to ? (from ? `${from} to ${to}` : `On to ${to}`) : null;
    const stop = p.stop_duration ?? null;
    const time = stop != null ? `${stop.toFixed(1)} s stop` : p.lane_duration ?? p.pit_duration ? `${(p.lane_duration ?? p.pit_duration)!.toFixed(1)} s in the pit lane` : null;
    events.push({
      lap: p.lap_number,
      kind: 'pit',
      title: `${name(p.driver_number)} pits`,
      detail: [tyres, time].filter(Boolean).join(' · ') || undefined,
      cars: [p.driver_number],
      minor: finish(p.driver_number) > 5,
    });
  }

  // Stewards' penalties.
  for (const pen of summarisePenalties(rc.map(classify))) {
    events.push({ lap: pen.lap, kind: 'penalty', title: `${pen.penalty} for ${name(pen.car)}`, detail: pen.reason.replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/, '') || undefined, cars: [pen.car] });
  }

  // Retirements: drivers not classified as finishers, at their last completed lap.
  for (const r of results) {
    const laps = Number(r.laps);
    const classified = /^\d+$/.test(r.positionText) && (r.status === 'Finished' || /^\+\d+ Laps?$|Lapped/.test(r.status));
    if (classified || !(laps >= 0)) continue;
    if (/Did not start|Withdrew|DNS/i.test(r.status)) continue;
    const status = r.status && r.status !== 'Retired' ? plainCase(r.status) : null;
    events.push({ lap: laps + 1, kind: 'retire', title: /Disqualified/i.test(r.status) ? `${name(Number(r.number))} disqualified` : `${name(Number(r.number))} retires`, detail: status && !/Disqualified/i.test(status) ? status : undefined, cars: [Number(r.number)] });
  }

  // Fastest lap: the classification's, or the quickest timed lap in OpenF1's lap data.
  const fl = results.find((r) => r.FastestLap?.rank === '1');
  if (fl?.FastestLap?.lap) {
    events.push({ lap: Number(fl.FastestLap.lap), kind: 'fastest', title: `Fastest lap: ${name(Number(fl.number))}`, detail: fl.FastestLap.Time?.time, cars: [Number(fl.number)] });
  } else {
    const best = lapRows.filter((l) => l.lap_duration && !l.is_pit_out_lap).sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
    if (best) events.push({ lap: best.lap_number, kind: 'fastest', title: `Fastest lap: ${name(best.driver_number)}`, detail: fmtLap(best.lap_duration!), cars: [best.driver_number] });
  }

  // The finish.
  const winner = results.find((r) => r.positionText === '1');
  if (winner) {
    const second = results.find((r) => r.positionText === '2');
    events.push({
      lap: Number(winner.laps) || totalLaps || null,
      kind: 'finish',
      title: `${name(Number(winner.number))} wins`,
      detail: second ? `${second.Time?.time ? `${second.Time.time} ahead of` : 'Ahead of'} ${name(Number(second.number))}` : undefined,
      cars: [Number(winner.number)],
    });
  }

  // Lap order; events on the same lap in race order (flags before stops, the finish last).
  const order: StoryKind[] = ['start', 'red', 'sc', 'vsc', 'lead', 'pit', 'penalty', 'retire', 'fastest', 'finish'];
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.lap ?? 9999) - (b.e.lap ?? 9999) || order.indexOf(a.e.kind) - order.indexOf(b.e.kind) || a.i - b.i)
    .map(({ e }) => ({ ...e, title: e.title.replace(/#(\d+)/, (_, n) => code(Number(n))) }));
}
