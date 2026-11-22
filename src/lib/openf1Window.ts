/**
 * OpenF1 shares data only with paying supporters while an F1 session is live: from 30 minutes before a session
 * starts until 30 minutes after it ends, every request without a token is refused, past sessions included
 * (https://openf1.org, FAQ "What counts as live vs historical data?"). The refusal carries no CORS headers, so the
 * browser only sees a failed connection. This module works out from the calendar (Jolpica, which keeps working)
 * whether such a window is open, so the app can explain the gap instead of loading forever.
 */
import { useSyncExternalStore } from 'react';
import type { Race } from '../api/jolpica';

export interface LiveWindow {
  raceName: string;
  session: string;
  start: number;
  /** Estimated end of the session (start plus its usual length). */
  end: number;
  /** When free access should return: estimated end plus 30 minutes. */
  freeAt: number;
}

const MIN = 60_000;
const SESSIONS: { key: keyof Race | 'race'; label: string; minutes: number }[] = [
  { key: 'FirstPractice', label: 'Practice 1', minutes: 60 },
  { key: 'SecondPractice', label: 'Practice 2', minutes: 60 },
  { key: 'ThirdPractice', label: 'Practice 3', minutes: 60 },
  { key: 'SprintQualifying', label: 'Sprint Qualifying', minutes: 45 },
  { key: 'SprintShootout', label: 'Sprint Shootout', minutes: 45 },
  { key: 'Sprint', label: 'Sprint', minutes: 60 },
  { key: 'Qualifying', label: 'Qualifying', minutes: 60 },
  { key: 'race', label: 'Race', minutes: 120 },
];

const STORE = 'pitwall:live-windows';
let windows: LiveWindow[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '[]') as LiveWindow[];
  } catch {
    return [];
  }
})();

/** Called with the current season's calendar. */
export function setLiveWindows(races: Race[]) {
  const out: LiveWindow[] = [];
  for (const r of races) {
    for (const s of SESSIONS) {
      const t = s.key === 'race' ? { date: r.date, time: r.time } : (r[s.key] as { date: string; time?: string } | undefined);
      if (!t?.date || !t.time) continue;
      const start = Date.parse(`${t.date}T${t.time}`);
      if (!Number.isFinite(start)) continue;
      const end = start + s.minutes * MIN;
      out.push({ raceName: r.raceName, session: s.label, start, end, freeAt: end + 30 * MIN });
    }
  }
  if (!out.length) return;
  windows = out;
  try {
    localStorage.setItem(STORE, JSON.stringify(out));
  } catch {
    // best effort
  }
}

/**
 * The live window open at `now`, if any. A race can overrun its usual two hours (safety cars, red flags), so a
 * window is treated as open for up to an extra hour after the estimate while OpenF1 still refuses requests.
 */
export function activeWindow(now = Date.now(), grace = 0): LiveWindow | null {
  return windows.find((w) => now >= w.start - 30 * MIN && now <= w.freeAt + grace) ?? null;
}

// Whether OpenF1 is currently refusing us, shared with the UI.
let blocked: LiveWindow | null = null;
const listeners = new Set<() => void>();

export function setBlocked(w: LiveWindow | null) {
  if (blocked === w || (blocked && w && blocked.start === w.start && blocked.session === w.session)) return;
  blocked = w;
  listeners.forEach((l) => l());
}

export function getBlocked(): LiveWindow | null {
  return blocked;
}

/** The live window OpenF1 is refusing requests for right now, or null when it is answering. */
export function useOpenF1Blocked(): LiveWindow | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => blocked,
  );
}

export class OpenF1BlockedError extends Error {
  window: LiveWindow;
  constructor(w: LiveWindow) {
    super(`OpenF1 is limited to supporters while ${w.raceName} ${w.session} is live`);
    this.window = w;
  }
}
