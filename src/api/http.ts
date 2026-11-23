/**
 * Small fetch layer: per-host rate limiting, retry on 429/5xx,
 * and an optional localStorage cache for slow-changing data.
 */

export class RateLimiter {
  private stamps: number[] = [];
  private queue: Promise<void> = Promise.resolve();
  private perSecond: number;
  private perMinute: number;

  constructor(perSecond: number, perMinute: number) {
    this.perSecond = perSecond;
    this.perMinute = perMinute;
  }

  setLimits(perSecond: number, perMinute: number) {
    this.perSecond = perSecond;
    this.perMinute = perMinute;
  }

  /**
   * Resolves when a request slot is free. Requests are served in order. A request whose signal is aborted while it
   * waits (for example because the user switched session or page) leaves the queue without using up a slot, so it
   * never delays the requests that replaced it.
   */
  acquire(signal?: AbortSignal): Promise<void> {
    const next = this.queue.then(() => this.waitForSlot(signal));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async waitForSlot(signal?: AbortSignal): Promise<void> {
    for (;;) {
      if (signal?.aborted) throw abortError();
      const now = Date.now();
      this.stamps = this.stamps.filter((t) => now - t < 60_000);
      // A slightly longer window than a second leaves a margin, so requests never bunch up past the per-second limit.
      const lastSecond = this.stamps.filter((t) => now - t < 1_100);
      if (this.stamps.length < this.perMinute && lastSecond.length < this.perSecond) {
        this.stamps.push(now);
        return;
      }
      const waitMinute = this.stamps.length >= this.perMinute ? 60_000 - (now - this.stamps[0]) : 0;
      const waitSecond = lastSecond.length >= this.perSecond ? 1_100 - (now - lastSecond[0]) : 0;
      await sleep(Math.max(waitMinute, waitSecond, 25), signal);
    }
  }
}

function abortError(): Error {
  return new DOMException('The request was cancelled', 'AbortError');
}

export class HttpError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string) {
    super(`Request failed with status ${status}`);
    this.status = status;
    this.url = url;
  }
}

export interface FetchOptions {
  limiter: RateLimiter;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Cache the parsed response in localStorage for this many ms. */
  cacheTtlMs?: number;
  /**
   * Keep a cached response this much longer when `stable` says it can no longer change (for example a full page of
   * results from rounds already run), so past results stay on the device instead of being downloaded again.
   */
  stableTtlMs?: number;
  stable?: (data: unknown) => boolean;
  retries?: number;
}

const CACHE_PREFIX = 'pitwall:cache:';

/**
 * Requests in flight, by URL. Two parts of a page asking for the same data at the same moment (for example a season's
 * results, wanted by both the standings and the provisional check) share one request instead of each queuing for the
 * rate limiter. Only for requests without an abort signal, so one caller giving up cannot cancel the other's.
 */
const inFlight = new Map<string, Promise<unknown>>();

/** How long to wait for a server before showing a saved copy instead (when there is one). */
export const STALE_AFTER_MS = 5_000;

/* ---------- Saved copies shown while a server is slow ---------- */

const slowHosts = new Set<string>();
const slowListeners = new Set<() => void>();
const lateListeners = new Set<() => void>();
const host = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
/** A saved copy from this server is on screen (it was slow or failed); cleared when it next answers. */
function markSlow(url: string, on: boolean) {
  const h = host(url);
  if (on === slowHosts.has(h)) return;
  if (on) slowHosts.add(h);
  else slowHosts.delete(h);
  slowListeners.forEach((f) => f());
}
/** Hosts whose saved copy is on screen while the request is still running (for the "slow to respond" note). */
export function slowServers(): string[] {
  return [...slowHosts.keys()];
}
export function onSlowChange(f: () => void): () => void {
  slowListeners.add(f);
  return () => slowListeners.delete(f);
}
/** Called when a request that was answered from a saved copy finally gets fresh data (to redraw the page). */
export function onLateData(f: () => void): () => void {
  lateListeners.add(f);
  return () => lateListeners.delete(f);
}

export async function fetchJson<T>(url: string, opts: FetchOptions): Promise<T> {
  if (opts.cacheTtlMs) {
    const hit = readCache<T>(url, opts.cacheTtlMs);
    if (hit !== undefined) return hit;
  }
  if (opts.stableTtlMs && opts.stable) {
    const kept = readCache<T>(url, opts.stableTtlMs);
    if (kept !== undefined && opts.stable(kept)) return kept;
  }
  let p: Promise<T>;
  if (opts.signal) p = load<T>(url, opts);
  else {
    const pending = inFlight.get(url);
    if (pending) p = pending as Promise<T>;
    else {
      p = load<T>(url, opts).finally(() => inFlight.delete(url));
      inFlight.set(url, p);
    }
  }
  // A saved copy (of any age) answers if the server is slow, so a page is never stuck loading for minutes while the
  // server times out. The request carries on and the page redraws with fresh data when it arrives.
  const saved = opts.cacheTtlMs ? readCache<T>(url, Infinity) : undefined;
  if (saved === undefined) return p;
  const SLOW = Symbol('slow'), FAILED = Symbol('failed');
  const first = await Promise.race([p.catch(() => FAILED), sleep(STALE_AFTER_MS).then(() => SLOW)]);
  if (first !== SLOW && first !== FAILED) return first as T;
  markSlow(url, true);
  if (first === SLOW) p.then(() => lateListeners.forEach((f) => f()), () => {});
  return saved;
}

async function load<T>(url: string, opts: FetchOptions): Promise<T> {

  const retries = opts.retries ?? 2;
  for (let attempt = 0; ; attempt++) {
    if (opts.signal?.aborted) throw abortError();
    await opts.limiter.acquire(opts.signal);
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: 'application/json', ...opts.headers }, signal: opts.signal });
    } catch (err) {
      if (opts.signal?.aborted || attempt >= retries) {
        const stale = opts.cacheTtlMs ? readCache<T>(url, Infinity) : undefined;
        if (stale !== undefined) {
          markSlow(url, true);
          return stale;
        }
        throw err;
      }
      // A network error is often a rate-limit reply the browser could not read; wait it out.
      await sleep(3_000 * 2 ** attempt, opts.signal);
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as T;
      markSlow(url, false);
      if (opts.cacheTtlMs) writeCache(url, data);
      return data;
    }

    // A gateway timeout means the server already spent a minute or so failing; trying again straight away rarely helps.
    const retryable = res.status === 429 || (res.status >= 500 && res.status !== 504);
    if (!retryable || attempt >= retries) {
      const stale = opts.cacheTtlMs ? readCache<T>(url, Infinity) : undefined;
      if (stale !== undefined) {
        markSlow(url, true);
        return stale;
      }
      throw new HttpError(res.status, url);
    }
    const retryAfter = Number(res.headers.get('Retry-After'));
    // Honour Retry-After, but never stall a page for long: a server asking for minutes or hours gets an error instead on the next try.
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1_000 : 2_000 * (attempt + 1), opts.signal);
  }
}

function readCache<T>(key: string, ttlMs: number): T | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const { t, d } = JSON.parse(raw) as { t: number; d: T };
    return Date.now() - t <= ttlMs ? d : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, data: unknown) {
  const value = JSON.stringify({ t: Date.now(), d: data });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, value);
      return;
    } catch {
      // Storage full: drop the oldest half of the cached responses and try again. Caching is best effort only.
      if (!dropOldest()) return;
    }
  }
}

function dropOldest(): boolean {
  try {
    const entries = Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .map((k) => {
        try {
          return { k, t: Number(JSON.parse(localStorage.getItem(k) ?? '{}').t) || 0 };
        } catch {
          return { k, t: 0 };
        }
      })
      .sort((a, b) => a.t - b.t);
    if (!entries.length) return false;
    entries.slice(0, Math.ceil(entries.length / 2)).forEach((e) => localStorage.removeItem(e.k));
    return true;
  } catch {
    return false;
  }
}

export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Waits `ms`; with a signal, stops early (rejecting) when it is aborted. */
export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
