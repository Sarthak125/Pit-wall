/**
 * Alerts about the favourite driver while the app is open: position changes,
 * pit stops and FIA messages. Pages that already poll live data feed it via
 * ingestFavourite(); a light watcher covers the other pages.
 */
import { useSyncExternalStore } from 'react';
import type { ClassifiedMsg } from './raceControl';
import { getSettings } from './settings';

export interface AppAlert {
  id: number;
  title: string;
  body: string;
  tone: 'red' | 'amber' | 'green' | 'blue' | 'grey';
}

let alerts: AppAlert[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useAlerts(): AppAlert[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => alerts,
  );
}

export function dismissAlert(id: number) {
  alerts = alerts.filter((a) => a.id !== id);
  emit();
}

function push(a: Omit<AppAlert, 'id'>) {
  const alert = { ...a, id: nextId++ };
  alerts = [...alerts, alert].slice(-4);
  emit();
  setTimeout(() => dismissAlert(alert.id), 9000);
  const s = getSettings();
  if (s.systemNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(a.title, { body: a.body, tag: `pitwall-${alert.id}` });
    } catch {
      // Some Android browsers only allow notifications from a service worker.
      navigator.serviceWorker?.ready.then((reg) => reg.showNotification(a.title, { body: a.body })).catch(() => undefined);
    }
  }
}

interface Baseline {
  position: number | null;
  pits: number;
  seen: Set<string>;
}

const baselines = new Map<string, Baseline>();

export interface FavouriteSnapshot {
  sessionKey: number;
  code: string;
  position: number | null;
  pits: number;
  /** FIA messages that involve the favourite. */
  messages: ClassifiedMsg[];
}

/** Compares with the last snapshot for this session and raises alerts for changes. */
/** Set by the app shell while spoiler-free mode hides the current weekend. */
let spoilerGuard = false;
export function setSpoilerGuard(on: boolean) {
  spoilerGuard = on;
}

export function ingestFavourite(s: FavouriteSnapshot) {
  // Spoiler-free mode: no pop-ups about a weekend that is still hidden.
  if (spoilerGuard) return;
  if (!getSettings().alertsEnabled) return;
  const key = `${s.sessionKey}-${s.code}`;
  const prev = baselines.get(key);
  const msgKey = (m: ClassifiedMsg) => `${m.date}|${m.message}`;
  if (!prev) {
    // First data for this session: remember it without alerting about the past.
    baselines.set(key, { position: s.position, pits: s.pits, seen: new Set(s.messages.map(msgKey)) });
    return;
  }
  if (s.position != null && prev.position != null && s.position !== prev.position) {
    const gained = s.position < prev.position;
    push({ title: `${s.code} ${gained ? 'up' : 'down'} to P${s.position}`, body: `Was P${prev.position}.`, tone: gained ? 'green' : 'amber' });
  }
  if (s.pits > prev.pits) push({ title: `${s.code} pitted`, body: `Pit stop ${s.pits} this session.`, tone: 'blue' });
  for (const m of s.messages) {
    const k = msgKey(m);
    if (prev.seen.has(k)) continue;
    prev.seen.add(k);
    if (m.kind === 'penalty' || m.kind === 'investigation' || m.kind === 'nfa' || m.kind === 'noted' || m.kind === 'limits') {
      push({ title: `${m.label}: ${s.code}`, body: m.message, tone: m.kind === 'penalty' ? 'red' : m.kind === 'investigation' ? 'amber' : 'grey' });
    }
  }
  if (s.position != null) prev.position = s.position;
  prev.pits = Math.max(prev.pits, s.pits);
}
