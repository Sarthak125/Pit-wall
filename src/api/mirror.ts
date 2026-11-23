/**
 * Reading Jolpica data from Pit Wall's own copy (scripts/mirror-jolpica.mjs, refreshed by the deploy workflow every
 * few hours and published with the site under data/jolpica/). The copy answers first: it is on the same fast host as
 * the app and needs no rate limiting, and it keeps pages working while Jolpica is slow or down. Jolpica is asked
 * instead when the copy does not have the request (older seasons, career and circuit history) or is out of date.
 */
import { fetchJson, RateLimiter, sleep, type FetchOptions } from './http';
import { mirrorKey } from '../lib/mirrorKey';

const ROOT = `${import.meta.env.BASE_URL}data/jolpica`;
const limiter = new RateLimiter(20, 600);
/** Newer than this, the copy is used as it is; the OpenF1 backup covers a race that finished since. */
const FRESH_MS = 12 * 3_600_000;
/** With an older copy, Jolpica gets this long to answer before the copy is shown instead. */
const OLD_COPY_AFTER_MS = 6_000;

export interface MirrorManifest {
  generatedAt: string;
  /** When the files were last fetched from Jolpica (runs while Jolpica is down keep the earlier date). */
  dataFrom: string | null;
  current: string;
  keys: string[];
}

let manifest: { at: number; p: Promise<{ m: MirrorManifest; keys: Set<string> } | null> } | null = null;

function getManifest() {
  if (manifest && Date.now() - manifest.at < 60_000) return manifest.p;
  const load = fetchJson<MirrorManifest>(`${ROOT}/manifest.json`, { limiter, cacheTtlMs: 5 * 60_000, retries: 0 })
    .then((m) => (m?.keys?.length ? { m, keys: new Set(m.keys) } : null))
    .catch(() => null);
  // Never hold a page up waiting for the copy's index.
  const p = Promise.race([load, sleep(3_000).then(() => null)]);
  manifest = { at: Date.now(), p };
  return p;
}

/** A Jolpica request, answered from the copy when it has it. `pathAndQuery` is the part after the API's base URL. */
export async function jolpicaGet<T>(base: string, pathAndQuery: string, opts: FetchOptions): Promise<T> {
  const live = () => fetchJson<T>(`${base}/${pathAndQuery}`, opts);
  const found = await getManifest();
  const key = mirrorKey(pathAndQuery);
  if (!found || !found.keys.has(key)) return live();
  const copy = () => fetchJson<T>(`${ROOT}/${key}`, { limiter, cacheTtlMs: Math.min(opts.cacheTtlMs ?? 10 * 60_000, 10 * 60_000), retries: 1 });
  const from = Date.parse(found.m.dataFrom ?? found.m.generatedAt);
  if (Date.now() - from < FRESH_MS) return copy().catch(live);
  // The copy is old (the refresh job has not reached Jolpica for a while): try Jolpica, but not for long.
  const request = live();
  return Promise.race([request, sleep(OLD_COPY_AFTER_MS).then(copy)]).catch(copy);
}

/** When the copy's data was fetched from Jolpica, if the app is using it. */
export async function mirrorDate(): Promise<string | null> {
  const found = await getManifest();
  return found ? (found.m.dataFrom ?? found.m.generatedAt) : null;
}
