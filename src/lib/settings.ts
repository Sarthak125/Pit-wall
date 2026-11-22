import { useSyncExternalStore } from 'react';

/** Per-device settings, kept in localStorage only. */
export interface Settings {
  /** Optional OpenF1 access token, sent as a Bearer header to api.openf1.org only. */
  openf1Token: string;
  /** OpenF1 request budget per minute (free tier default is conservative). */
  openf1PerMinute: number;
  /** Selected season for standings and calendar ("current" or a year). */
  season: string;
  /** Favourite driver's three-letter code (e.g. "VER"), shared by both APIs. Empty for none. */
  favoriteDriver: string;
  /** Display name for the favourite, so it shows before data loads. */
  favoriteName: string;
  /** Pop-up alerts about the favourite while the app is open. */
  alertsEnabled: boolean;
  /** Also show system notifications (needs browser permission). */
  systemNotifications: boolean;
  /** Live track map on the My Driver page (uses extra API requests). */
  trackMap: boolean;
  /** Favourite team's Jolpica constructorId (e.g. "ferrari"). Empty for none. */
  favoriteTeam: string;
  favoriteTeamName: string;
  /** Seconds to hold back F1's live feed so it matches a TV or stream that runs behind (0 = no delay). */
  liveDelay: number;
  /** Hide results of the latest race weekend until revealed. */
  spoilerFree: boolean;
  /** Race weekend (season-round) whose results were revealed in spoiler-free mode. */
  revealed: string;
}

const KEY = 'pitwall:settings';
const DEFAULTS: Settings = { openf1Token: '', openf1PerMinute: 30, season: 'current', favoriteDriver: '', favoriteName: '', alertsEnabled: true, systemNotifications: false, trackMap: false, favoriteTeam: '', favoriteTeamName: '', liveDelay: 0, spoilerFree: false, revealed: '' };

let current: Settings = load();
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Settings still apply for this visit.
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export function setFavorite(code: string, name: string) {
  const { favoriteDriver } = getSettings();
  // Choosing the current favourite again clears it.
  updateSettings(favoriteDriver === code ? { favoriteDriver: '', favoriteName: '' } : { favoriteDriver: code, favoriteName: name });
}

export function setFavoriteTeam(id: string, name: string) {
  const { favoriteTeam } = getSettings();
  updateSettings(favoriteTeam === id ? { favoriteTeam: '', favoriteTeamName: '' } : { favoriteTeam: id, favoriteTeamName: name });
}
