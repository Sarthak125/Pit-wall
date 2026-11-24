/**
 * Reading finished-session OpenF1 data from Pit Wall's own copy (scripts/mirror-openf1.mjs, refreshed by the deploy
 * workflow and published under data/openf1/). A finished session's laps, stints, pit stops, race control messages,
 * drivers and results never change, so the copy answers first when it has them: race pages open at once, do not use up
 * OpenF1's 30 requests a minute, and still work while OpenF1 is slow, down or refusing requests during a live session.
 * Anything the copy lacks (live data, newer sessions, car data and location) is asked of OpenF1 as before.
 */
import { fetchJson, RateLimiter, sleep } from './http';
import { openf1Key } from '../lib/mirrorKey';

type Params = Record<string, string | number | undefined>;

const ROOT = `${import.meta.env.BASE_URL}data/openf1`;
const limiter = new RateLimiter(20, 600);

interface Manifest { generatedAt: string; keys: string[] }

let manifest: { at: number; p: Promise<Set<string> | null> } | null = null;

function getKeys() {
  if (manifest && Date.now() - manifest.at < 60_000) return manifest.p;
  const load = fetchJson<Manifest>(`${ROOT}/manifest.json`, { limiter, cacheTtlMs: 5 * 60_000, retries: 0 })
    .then((m) => (m?.keys?.length ? new Set(m.keys) : null))
    .catch(() => null);
  // Never hold a page up waiting for the copy's index.
  const p = Promise.race([load, sleep(3_000).then(() => null)]);
  manifest = { at: Date.now(), p };
  return p;
}

/** The copy's answer to an OpenF1 request, or null when the copy does not have it (the caller then asks OpenF1). */
export async function openf1FromCopy<T>(endpoint: string, params: Params, signal?: AbortSignal): Promise<T[] | null> {
  const key = openf1Key(endpoint, params);
  if (!key) return null;
  const keys = await getKeys();
  if (!keys?.has(key)) return null;
  try {
    const rows = await fetchJson<T[]>(`${ROOT}/${key}`, { limiter, signal, cacheTtlMs: 10 * 60_000, retries: 1 });
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}
