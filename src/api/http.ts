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
      const lastSecond = this.stamps.filter((t) => now - t < 1_000);
      if (this.stamps.length < this.perMinute && lastSecond.length < this.perSecond) {
        this.stamps.push(now);
        return;
      }
      const waitMinute = this.stamps.length >= this.perMinute ? 60_000 - (now - this.stamps[0]) : 0;
      const waitSecond = lastSecond.length >= this.perSecond ? 1_000 - (now - lastSecond[0]) : 0;
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

interface FetchOptions {
  limiter: RateLimiter;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Cache the parsed response in localStorage for this many ms. */
  cacheTtlMs?: number;
  retries?: number;
}

const CACHE_PREFIX = 'pitwall:cache:';

export async function fetchJson<T>(url: string, opts: FetchOptions): Promise<T> {
  if (opts.cacheTtlMs) {
    const hit = readCache<T>(url, opts.cacheTtlMs);
    if (hit !== undefined) return hit;
  }

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
        if (stale !== undefined) return stale;
        throw err;
      }
      // A network error is often a rate-limit reply the browser could not read; wait it out.
      await sleep(3_000 * 2 ** attempt, opts.signal);
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as T;
      if (opts.cacheTtlMs) writeCache(url, data);
      return data;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      const stale = opts.cacheTtlMs ? readCache<T>(url, Infinity) : undefined;
      if (stale !== undefined) return stale;
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
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), d: data }));
  } catch {
    // Storage full or blocked: caching is best effort only.
    clearCache();
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
