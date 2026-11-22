import { useSyncExternalStore } from 'react';

/** Hash routes, so the app works on any static host without server rewrites. */
export type Route = 'dashboard' | 'live' | 'driver' | 'team' | 'race' | 'standings' | 'calendar' | 'drivers' | 'settings' | 'help';

const ROUTES: Route[] = ['dashboard', 'live', 'driver', 'team', 'race', 'standings', 'calendar', 'drivers', 'settings', 'help'];

const parts = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/');

function read(): Route {
  const r = parts()[0] as Route;
  return ROUTES.includes(r) ? r : 'dashboard';
}

/**
 * Second part of the hash: a driver code in #/driver/VER, a team id in
 * #/team/red_bull. Empty when absent or malformed.
 */
function readParam(): string {
  const [route, p = ''] = parts();
  if (route === 'driver') return /^[A-Za-z]{3}$/.test(p) ? p.toUpperCase() : '';
  if (route === 'team') return /^[a-z0-9_]{2,40}$/.test(p) ? p : '';
  if (route === 'race') {
    // #/race/20 (season picker) or #/race/2024/20 (a specific season).
    const q = parts()[2];
    if (/^(19|20)\d\d$/.test(p) && q && /^[1-9][0-9]?$/.test(q)) return `${p}/${q}`;
    return /^[1-9][0-9]?$/.test(p) ? p : '';
  }
  return '';
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read);
}

export function useRouteParam(): string {
  return useSyncExternalStore(subscribe, readParam);
}

/** Link to any driver's stats page by their three-letter code. */
export const driverHref = (code: string) => `#/driver/${code}`;

/** Link to any team's page by its constructor id (e.g. "ferrari"). */
export const teamHref = (id: string) => `#/team/${id}`;

export const href = (r: Route) => (r === 'dashboard' ? '#/' : `#/${r}`);

/** Link to a race results page by round number, for the season in the season picker. */
export const raceHref = (round: string | number, season?: string) =>
  season && /^\d{4}$/.test(season) ? `#/race/${season}/${round}` : `#/race/${round}`;
