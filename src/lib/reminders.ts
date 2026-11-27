/**
 * Session reminders: a notification shortly before a session starts. They live on this device only and fire while
 * Pit Wall is open (in a tab or as the installed app); without a push server nothing can wake it when it is closed.
 */
import { useSyncExternalStore } from 'react';
import { pushAlert } from './alerts';

export const LEAD_MS = 15 * 60_000;
/** A reminder found more than this long after its session started (the app was closed) is dropped silently. */
const STALE_MS = 10 * 60_000;
const KEY = 'pitwall:reminders';

export interface Reminder {
  id: string;
  /** Session start, ms since epoch. */
  at: number;
  session: string;
  race: string;
}

export const reminderId = (season: string, round: string, session: string) => `${season}-${round}-${session}`;

let list: Reminder[] = load();
const listeners = new Set<() => void>();

function load(): Reminder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.id === 'string' && typeof r.at === 'number') : [];
  } catch {
    return [];
  }
}

function save(next: Reminder[]) {
  list = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the reminder still works until the page is closed.
  }
  listeners.forEach((l) => l());
}

export function useReminders(): Reminder[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => list,
  );
}

/** Turns a reminder on or off. Turning one on asks for notification permission the first time. */
export function toggleReminder(r: Reminder): boolean {
  if (list.some((x) => x.id === r.id)) {
    save(list.filter((x) => x.id !== r.id));
    return false;
  }
  save([...list, r].sort((a, b) => a.at - b.at));
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try {
      // Older browsers take a callback and return nothing, so wrap whatever comes back.
      Promise.resolve(Notification.requestPermission()).catch(() => undefined);
    } catch {
      // Not allowed here (some embedded browsers): reminders still show inside Pit Wall.
    }
  }
  return true;
}

/** The reminders due at `now`, and the ones to keep. */
export function dueReminders(all: Reminder[], now: number): { due: Reminder[]; keep: Reminder[]; stale: Reminder[] } {
  const due: Reminder[] = [];
  const keep: Reminder[] = [];
  const stale: Reminder[] = [];
  for (const r of all) {
    if (now < r.at - LEAD_MS) keep.push(r);
    else if (now <= r.at + STALE_MS) due.push(r);
    else stale.push(r);
  }
  return { due, keep, stale };
}

/** Text for a reminder going off: "Qualifying starts in 15 minutes" (or "has started"). */
export function reminderText(r: Reminder, now: number): { title: string; body: string } {
  const mins = Math.round((r.at - now) / 60_000);
  const when = mins >= 1 ? `starts in ${mins} minute${mins === 1 ? '' : 's'}` : 'is starting now';
  return { title: `${r.session} ${when}`, body: r.race };
}

/** Checks the reminders every 20 seconds while the app is open. Returns a function that stops it. */
export function startReminders(): () => void {
  const tick = () => {
    const now = Date.now();
    const { due, keep, stale } = dueReminders(list, now);
    for (const r of due) pushAlert({ ...reminderText(r, now), tone: 'blue' }, true);
    if (due.length || stale.length) save(keep);
  };
  tick();
  const t = setInterval(tick, 20_000);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      list = load();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    clearInterval(t);
    window.removeEventListener('storage', onStorage);
  };
}
