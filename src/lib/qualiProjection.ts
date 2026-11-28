/**
 * Knockout times for qualifying: the Q1 and Q2 cut-offs (time of the last car through) and the Q3 pole time.
 * A part that has finished shows its real value, the running part shows the value right now, and later parts are
 * projected from the same places in the last qualifying at this circuit:
 *  - Q2 cut-off: today's time for that place (P10 when 10 go into Q3) in Q1, times how much that place's time fell
 *    from Q1 to Q2 last time.
 *  - Pole: today's fastest time in the latest part with times, times how much the fastest time fell from that part
 *    to pole last time.
 * Comparing the same places keeps the projection sensible when the field is more spread out than last time. It is
 * still a rough guide: weather, red flags, track evolution and this year's cars can all move it.
 */

/** "1:23.456" (or "83.456") to seconds; null when missing or unreadable. */
export function parseLap(s?: string | null): number | null {
  if (!s) return null;
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s.trim());
  if (!m) return null;
  const v = (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
  return v > 0 ? v : null;
}

export interface CutRatios {
  /** Season of the qualifying the ratios come from. */
  season: string;
  /** Q2 cut-off divided by the Q1 time of the same place (the last car into Q3). */
  q2CutOverQ1: number;
  /** Pole divided by the fastest Q1 time. */
  poleOverQ1Best: number;
  /** Pole divided by the fastest Q2 time. */
  poleOverQ2Best: number;
}

const sorted = (v: (number | null | undefined)[]) => v.filter((x): x is number => x != null && x > 0).sort((a, b) => a - b);

/**
 * Ratios from one finished qualifying, given each car's [Q1, Q2, Q3] times. The places that went through are read
 * from how many cars set a time in the next part. Null when the data is incomplete or a ratio looks wrong (for
 * example a wet Q1 and a dry Q2).
 */
export function cutRatios(times: (number | null)[][], season: string): CutRatios | null {
  const q1 = sorted(times.map((t) => t[0]));
  const q2 = sorted(times.map((t) => t[1]));
  const q3 = sorted(times.map((t) => t[2]));
  const into3 = q3.length;
  if (!into3 || q2.length < into3 || q1.length < into3) return null;
  const r = {
    season,
    q2CutOverQ1: q2[into3 - 1] / q1[into3 - 1],
    poleOverQ1Best: q3[0] / q1[0],
    poleOverQ2Best: q3[0] / q2[0],
  };
  // Each is normally a little under 1. Anything far outside means the parts are not comparable.
  const ok = (x: number) => x > 0.95 && x < 1.01;
  return ok(r.q2CutOverQ1) && ok(r.poleOverQ1Best) && ok(r.poleOverQ2Best) ? r : null;
}

export type KnockoutKind = 'final' | 'now' | 'projected';

export interface KnockoutTime {
  part: 1 | 2 | 3;
  /** "Q1 cut-off", "Q2 cut-off" or "Q3 pole". */
  label: string;
  time: number | null;
  kind: KnockoutKind;
}

/**
 * @param times each car's best [Q1, Q2, Q3] time so far
 * @param part the running part (1 to 3), or null when qualifying has finished
 * @param entries cars in Q1, Q2 and Q3, e.g. [22, 16, 10]
 * @param ratios from the last qualifying at this circuit, or null if there is none to compare with
 */
export function knockoutTimes(times: (number | null)[][], part: number | null, entries: number[], ratios: CutRatios | null): KnockoutTime[] {
  const inPart = [0, 1, 2].map((k) => sorted(times.map((t) => t[k])));
  const at = (k: number, n: number | undefined) => (n && inPart[k].length >= n ? inPart[k][n - 1] : null);
  const done = (k: number) => part == null || part > k;

  // Q1 cut-off: the last car into Q2.
  const q1: KnockoutTime = { part: 1, label: 'Q1 cut-off', time: at(0, entries[1]), kind: done(1) ? 'final' : 'now' };

  // Q2 cut-off: the last car into Q3.
  const q2: KnockoutTime = { part: 2, label: 'Q2 cut-off', time: null, kind: 'projected' };
  if (done(2)) Object.assign(q2, { time: at(1, entries[2]), kind: 'final' });
  else if (part === 2 && at(1, entries[2]) != null) Object.assign(q2, { time: at(1, entries[2]), kind: 'now' });
  else if (ratios && at(0, entries[2]) != null) q2.time = at(0, entries[2])! * ratios.q2CutOverQ1;

  // Q3: no one is knocked out, so the time that matters is pole.
  const q3: KnockoutTime = { part: 3, label: 'Q3 pole', time: null, kind: 'projected' };
  if (part == null) Object.assign(q3, { time: inPart[2][0] ?? null, kind: 'final' });
  else if (part === 3 && inPart[2].length) Object.assign(q3, { time: inPart[2][0], kind: 'now' });
  else if (ratios && inPart[1].length) q3.time = inPart[1][0] * ratios.poleOverQ2Best;
  else if (ratios && inPart[0].length) q3.time = inPart[0][0] * ratios.poleOverQ1Best;

  return [q1, q2, q3];
}
