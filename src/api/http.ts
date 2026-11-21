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

  /** Resolves when a request slot is free. Requests are served in order. */
  acquire(): Promise<void> {
    const next = this.queue.then(() => this.waitForSlot());
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async waitForSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.stamps = this.stamps.filter((t) => now - t < 60_000);
      const lastSecond = this.stamps.filter((t) => now - t < 1_000);
      if (this.stamps.length < this.perMinute && lastSecond.length < this.perSecond) {
        this.stamps.push(now);
        return;
      }
      const waitMinute = this.stamps.length >= this.perMinute ? 60_000 - (now - this.stamps[0]) : 0;
      const waitSecond = lastSecond.length >= this.perSecond ? 1_000 - (now - lastSecond[0]) : 0;
      await sleep(Math.max(waitMinute, waitSecond, 25));
    }
  }
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
    await opts.limiter.acquire();
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: 'application/json', ...opts.headers }, signal: opts.signal });
    } catch (err) {
      if (opts.signal?.aborted || attempt >= retries) {
        const stale = opts.cacheTtlMs ? readCache<T>(url, Infinity) : undefined;
        if (stale !== undefined) return stale;
        throw err;
      }
      await sleep(1_000 * (attempt + 1));
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
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 2_000 * (attempt + 1));
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

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
