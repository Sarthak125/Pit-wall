import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJson, RateLimiter } from '../../src/api/http';

/** A small in-memory localStorage that refuses writes over a size limit, like a full browser store. */
function fakeStorage(limit = Infinity) {
  const m = new Map<string, string>();
  const size = () => [...m.values()].reduce((n, v) => n + v.length, 0);
  const store = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (size() - (m.get(k)?.length ?? 0) + v.length > limit) throw new Error('QuotaExceededError');
      m.set(k, v);
    },
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
  // Object.keys(localStorage) lists the stored keys in a browser.
  return new Proxy(store, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (_, k) => (m.has(String(k)) ? { enumerable: true, configurable: true, value: m.get(String(k)) } : undefined) });
}

const limiter = () => new RateLimiter(100, 1000);
let calls: string[] = [];

beforeEach(() => {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => { calls.push(url); return new Response(JSON.stringify({ url, pad: 'x'.repeat(100) }), { status: 200 }); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('fetchJson cache', () => {
  it('shares one request between two callers asking at the same time', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    const [a, b] = await Promise.all([fetchJson('https://x/a', { limiter: limiter() }), fetchJson('https://x/a', { limiter: limiter() })]);
    expect(a).toEqual(b);
    expect(calls).toHaveLength(1);
  });

  it('keeps a stable response past its short lifetime, and refetches one that can still change', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.useFakeTimers({ toFake: ['Date'] });
    const opts = (stable: boolean) => ({ limiter: limiter(), cacheTtlMs: 60_000, stableTtlMs: 86_400_000, stable: () => stable });
    await fetchJson('https://x/full', opts(true));
    await fetchJson('https://x/partial', opts(false));
    vi.setSystemTime(Date.now() + 10 * 60_000);
    await fetchJson('https://x/full', opts(true));
    await fetchJson('https://x/partial', opts(false));
    expect(calls).toEqual(['https://x/full', 'https://x/partial', 'https://x/partial']);
  });

  it('drops the oldest cached responses when storage is full instead of failing', async () => {
    const store = fakeStorage(1000);
    vi.stubGlobal('localStorage', store);
    vi.useFakeTimers({ toFake: ['Date'] });
    for (let i = 0; i < 12; i++) {
      vi.setSystemTime(1_000_000 + i * 1000);
      await fetchJson(`https://x/${i}`, { limiter: limiter(), cacheTtlMs: 3_600_000 });
    }
    const keys = Object.keys(store);
    expect(keys.some((k) => k.endsWith('https://x/11'))).toBe(true);
    expect(keys.some((k) => k.endsWith('https://x/0'))).toBe(false);
  });
});
