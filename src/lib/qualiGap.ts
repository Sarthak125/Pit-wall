/**
 * How far apart two team-mates are in qualifying, in lap time. Per round the gap is taken in the last qualifying
 * session both drivers set a time in (Q3, else Q2, else Q1), so a driver knocked out earlier is compared on the
 * session they both reached. The season figure is the middle round gap, so one wet session or one crash does not decide it.
 */
import type { RaceWithQualifying } from '../api/jolpica';

export interface QualiGap {
  /** Rounds where both drivers set a time in a common session. */
  rounds: number;
  /** Typical gap as a share of the lap: positive means the first driver is quicker. */
  pct: number;
  /** The same typical gap in seconds. */
  seconds: number;
  /** In how many of those rounds the first driver was quicker. */
  aQuicker: number;
}

export function lapSeconds(t?: string): number | null {
  const m = t?.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
}

function middle(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function qualiGap(quali: RaceWithQualifying[], codeA: string, codeB: string): QualiGap | null {
  const pcts: number[] = [];
  const secs: number[] = [];
  for (const race of quali) {
    const a = race.QualifyingResults?.find((x) => x.Driver.code === codeA);
    const b = race.QualifyingResults?.find((x) => x.Driver.code === codeB);
    if (!a || !b) continue;
    for (const q of ['Q3', 'Q2', 'Q1'] as const) {
      const ta = lapSeconds(a[q]), tb = lapSeconds(b[q]);
      if (ta == null || tb == null) continue;
      // Positive: A's lap was shorter than B's.
      pcts.push(((tb - ta) / tb) * 100);
      secs.push(tb - ta);
      break;
    }
  }
  if (!pcts.length) return null;
  return { rounds: pcts.length, pct: middle(pcts), seconds: middle(secs), aQuicker: secs.filter((s) => s > 0).length };
}
