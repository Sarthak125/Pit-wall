import { useSyncExternalStore } from 'react';

/** Hash routes, so the app works on any static host without server rewrites. */
export type Route = 'dashboard' | 'live' | 'standings' | 'calendar' | 'drivers' | 'settings';

const ROUTES: Route[] = ['dashboard', 'live', 'standings', 'calendar', 'drivers', 'settings'];

function read(): Route {
  const r = window.location.hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(r) ? r : 'dashboard';
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    read,
  );
}

export const href = (r: Route) => (r === 'dashboard' ? '#/' : `#/${r}`);
