/**
 * What an account keeps in step between devices, and how two copies are combined. Pure functions, so the rules are
 * easy to test; src/lib/account.ts does the network side.
 */
import type { Settings } from './settings';
import type { Reminder } from './reminders';

/**
 * Settings that follow the account. Left out on purpose: the OpenF1 token and request budget (per device and
 * private), system notifications (a browser permission on each device), the TV delay (each screen runs behind by
 * a different amount) and the season picker (a view choice).
 */
export const SYNCED_KEYS = ['favoriteDriver', 'favoriteName', 'favoriteTeam', 'favoriteTeamName', 'alertsEnabled', 'trackMap', 'spoilerFree', 'revealed', 'theme'] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export type SyncedSettings = Pick<Settings, SyncedKey>;

export interface SyncDoc {
  v: 1;
  settings: Partial<SyncedSettings>;
  reminders: Reminder[];
}

export function pickSynced(s: Settings): SyncedSettings {
  const out = {} as Record<SyncedKey, unknown>;
  for (const k of SYNCED_KEYS) out[k] = s[k];
  return out as SyncedSettings;
}

export function makeDoc(s: Settings, reminders: Reminder[]): SyncDoc {
  return { v: 1, settings: pickSynced(s), reminders: [...reminders].sort((a, b) => a.at - b.at) };
}

const isReminder = (r: unknown): r is Reminder => {
  const x = r as Reminder;
  return !!x && typeof x.id === 'string' && typeof x.at === 'number' && Number.isFinite(x.at) && typeof x.session === 'string' && typeof x.race === 'string';
};

/** Reads a stored document defensively: unknown keys and wrong types are dropped rather than applied. */
export function readDoc(raw: unknown): SyncDoc {
  const d = (raw ?? {}) as { settings?: Record<string, unknown>; reminders?: unknown };
  const settings: Record<string, unknown> = {};
  const src = d.settings && typeof d.settings === 'object' ? d.settings : {};
  for (const k of SYNCED_KEYS) {
    const val = src[k];
    if (val === undefined) continue;
    if (k === 'theme') {
      if (val === 'dark' || val === 'light' || val === 'auto') settings[k] = val;
    } else if (k === 'alertsEnabled' || k === 'trackMap' || k === 'spoilerFree') {
      if (typeof val === 'boolean') settings[k] = val;
    } else if (typeof val === 'string' && val.length <= 80) {
      settings[k] = val;
    }
  }
  const reminders = Array.isArray(d.reminders) ? d.reminders.filter(isReminder).slice(0, 200) : [];
  return { v: 1, settings: settings as Partial<SyncedSettings>, reminders };
}

/**
 * The first time a device meets an account that already has saved settings: the account's settings win (so a new
 * phone picks up what you chose on the laptop), and reminders from both are kept.
 */
export function mergeFirst(local: SyncDoc, cloud: SyncDoc): SyncDoc {
  const byId = new Map<string, Reminder>();
  for (const r of local.reminders) byId.set(r.id, r);
  for (const r of cloud.reminders) byId.set(r.id, r);
  return {
    v: 1,
    settings: { ...local.settings, ...cloud.settings },
    reminders: [...byId.values()].sort((a, b) => a.at - b.at),
  };
}

export function sameDoc(a: SyncDoc, b: SyncDoc): boolean {
  return JSON.stringify(normal(a)) === JSON.stringify(normal(b));
}

function normal(d: SyncDoc) {
  const settings: Record<string, unknown> = {};
  for (const k of SYNCED_KEYS) settings[k] = d.settings[k];
  return { settings, reminders: [...d.reminders].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)) };
}
