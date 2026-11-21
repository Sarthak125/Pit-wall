import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface PollState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  updatedAt: number | null;
}

/**
 * Last good result for each key, kept in memory for this visit. Switching session or page and coming back shows the
 * saved data straight away: a finished session is not fetched again (unless the saved copy is over 5 minutes old),
 * and a live one carries on polling from where it left off instead of starting over.
 */
const memory = new Map<string, { data: unknown; at: number }>();
const MEMORY_MAX = 80;
const FINISHED_FRESH_MS = 5 * 60_000;

function remember(key: string, data: unknown) {
  memory.delete(key);
  memory.set(key, { data, at: Date.now() });
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
}

/**
 * Runs `fn` now and then every `intervalMs` (when intervalMs > 0).
 * Pauses while the tab or app is in the background to save API quota.
 * `fn` receives the previous value, so callers can fetch incrementally.
 * The first request waits `startDelayMs`, so flicking quickly through sessions or pages does not spend the
 * OpenF1 request budget on screens that are gone a moment later. Less urgent panels pass a longer delay so the
 * timing tower's requests go first.
 */
export function usePoll<T>(
  key: string | null,
  fn: (prev: T | undefined, signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  startDelayMs = 400,
): PollState<T> {
  // The state remembers which key it belongs to, so right after the key changes the previous key's data is never
  // handed out as if it were the new one's (for example last session's laps for a newly picked session).
  const [state, setState] = useState<PollState<T> & { key: string | null }>(() => {
    const saved = key ? memory.get(key) : undefined;
    return { key, data: saved?.data as T | undefined, error: null, loading: !!key && !saved, updatedAt: saved?.at ?? null };
  });
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!key) {
      setState({ key, data: undefined, error: null, loading: false, updatedAt: null });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const saved = memory.get(key);
    let latest = saved?.data as T | undefined;
    const ctrl = new AbortController();
    setState({ key, data: latest, error: null, loading: !saved, updatedAt: saved?.at ?? null });

    const run = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden' && latest !== undefined) {
        schedule();
        return;
      }
      try {
        const next = await fnRef.current(latest, ctrl.signal);
        if (cancelled) return;
        latest = next;
        remember(key, next);
        setState({ key, data: next, error: null, loading: false, updatedAt: Date.now() });
      } catch (error) {
        if (cancelled) return;
        setState((s) => ({ ...s, error, loading: false }));
      }
      schedule();
    };
    const schedule = () => {
      if (!cancelled && intervalMs > 0) timer = setTimeout(run, intervalMs);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && intervalMs > 0) {
        clearTimeout(timer);
        run();
      }
    };

    if (saved && intervalMs === 0 && Date.now() - saved.at < FINISHED_FRESH_MS) {
      // Nothing to poll and the saved copy is recent: no request needed.
    } else if (saved) {
      run();
    } else {
      timer = setTimeout(run, startDelayMs);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key, intervalMs]);

  if (state.key !== key) {
    const saved = key ? memory.get(key) : undefined;
    return { data: saved?.data as T | undefined, error: null, loading: !!key && !saved, updatedAt: saved?.at ?? null };
  }
  return state;
}

/** Re-renders every `ms` so clocks and countdowns tick. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
