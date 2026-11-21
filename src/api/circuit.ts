/**
 * Circuit layouts from the MultiViewer community API: the track outline,
 * numbered corners, marshal sectors and the rotation used on F1 TV maps.
 * Coordinates use the same system as OpenF1's car positions.
 * Docs: https://api.multiviewer.app (unofficial, free, no key).
 */
import { fetchJson, RateLimiter } from './http';

const limiter = new RateLimiter(2, 20);

export interface CircuitPoint {
  number: number;
  angle: number;
  length: number;
  trackPosition: { x: number; y: number };
}

export interface Circuit {
  x: number[];
  y: number[];
  rotation: number;
  /** Estimated time lost making a pit stop, in seconds, normally and under safety car / virtual safety car. */
  pitLoss?: { normal?: string; sc?: string; vsc?: string };
  corners: CircuitPoint[];
  marshalSectors: CircuitPoint[];
}

/** Layout for a circuit, trying the session's year first, then the year before. */
export async function getCircuit(circuitKey: number, year: number, signal?: AbortSignal): Promise<Circuit> {
  let last: unknown;
  for (const y of [year, year - 1]) {
    try {
      const c = await fetchJson<Circuit>(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${y}`, { signal, limiter, retries: 1, cacheTtlMs: 7 * 24 * 3600_000 });
      if (c?.x?.length) return c;
    } catch (err) {
      last = err;
    }
  }
  throw last ?? new Error('No layout for this circuit');
}
