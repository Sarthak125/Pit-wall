import { useSyncExternalStore } from 'react';

/** Hash routes, so the app works on any static host without server rewrites. */
export type Route = 'dashboard' | 'live' | 'driver' | 'team' | 'standings' | 'calendar' | 'drivers' | 'settings';

const ROUTES: Route[] = ['dashboard', 'live', 'driver', 'team', 'standings', 'calendar', 'drivers', 'settings'];

const parts = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/');

function read(): Route {
  const r = parts()[0] as Route;
  return ROUTES.includes(r) ? r : 'dashboard';
}

/** Second part of the hash, e.g. "VER" in #/driver/VER. Empty when absent. */
function readParam(): string {
  const p = parts()[1] ?? '';
  return /^[A-Za-z]{3}$/.test(p) ? p.toUpperCase() : '';
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

export const href = (r: Route) => (r === 'dashboard' ? '#/' : `#/${r}`);
