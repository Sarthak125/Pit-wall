import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface PollState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  updatedAt: number | null;
}

/**
 * Runs `fn` now and then every `intervalMs` (when intervalMs > 0).
 * Pauses while the tab or app is in the background to save API quota.
 * `fn` receives the previous value, so callers can fetch incrementally.
 */
export function usePoll<T>(
  key: string | null,
  fn: (prev: T | undefined, signal: AbortSignal) => Promise<T>,
  intervalMs: number,
): PollState<T> {
  const [state, setState] = useState<PollState<T>>({ data: undefined, error: null, loading: !!key, updatedAt: null });
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!key) {
      setState({ data: undefined, error: null, loading: false, updatedAt: null });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let latest: T | undefined;
    const ctrl = new AbortController();
    setState({ data: undefined, error: null, loading: true, updatedAt: null });

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
        setState({ data: next, error: null, loading: false, updatedAt: Date.now() });
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

    run();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key, intervalMs]);

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
