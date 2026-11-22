import { lazy, Suspense, useEffect } from 'react';
import { Loading } from './components/States';
import { isSessionLive } from './api/openf1';
import { Shell } from './components/Shell';
import { useNow } from './hooks/usePoll';
import { useLatestSessions } from './hooks/useSeason';
import { Dashboard } from './pages/Dashboard';
import { Toasts } from './components/Toasts';
import { UpdateBanner } from './components/UpdateBanner';
import { useAlertWatcher } from './hooks/useFavourite';
import { useRoute, useRouteParam } from './lib/router';
import { useResolvedTheme } from './lib/theme';

// Pages other than the Dashboard load their code when first opened (all of it is still saved for offline use).
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })));
const Drivers = lazy(() => import('./pages/Drivers').then((m) => ({ default: m.Drivers })));
const LiveTiming = lazy(() => import('./pages/LiveTiming').then((m) => ({ default: m.LiveTiming })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Help = lazy(() => import('./pages/Help').then((m) => ({ default: m.Help })));
const SeasonReview = lazy(() => import('./pages/SeasonReview').then((m) => ({ default: m.SeasonReview })));
const Standings = lazy(() => import('./pages/Standings').then((m) => ({ default: m.Standings })));
const MyDriver = lazy(() => import('./pages/MyDriver').then((m) => ({ default: m.MyDriver })));
const MyTeam = lazy(() => import('./pages/MyTeam').then((m) => ({ default: m.MyTeam })));
const RaceResults = lazy(() => import('./pages/RaceResults').then((m) => ({ default: m.RaceResults })));

const TITLES = { dashboard: 'Dashboard', live: 'Live Timing', driver: 'My Driver', team: 'My Team', race: 'Race results', standings: 'Standings', calendar: 'Calendar', drivers: 'Drivers', settings: 'Settings', help: 'How to use', review: 'Season review' };

export default function App() {
  const route = useRoute();
  const param = useRouteParam();
  const sessions = useLatestSessions();
  const now = useNow(30_000);
  const live = (sessions.data ?? []).some((s) => isSessionLive(s, now));
  // Live Timing and My Driver feed alerts from their own data; elsewhere a light watcher does.
  useAlertWatcher(route !== 'live' && route !== 'driver');
  // Charts read some colours (such as the hard tyre) when drawn, so the page is redrawn when the theme changes.
  const theme = useResolvedTheme();

  useEffect(() => {
    document.title = `${TITLES[route]} · Pit Wall`;
    window.scrollTo(0, 0);
  }, [route, param]);

  return (
    <Shell route={route} live={live}>
      {/* One boundary keyed by page, so a page still loading never leaves the previous one on screen. */}
      <Suspense fallback={<Loading rows={8} />} key={`${route}:${theme}`}>
      {route === 'dashboard' && <Dashboard />}
      {route === 'live' && <LiveTiming />}
      {route === 'driver' && <MyDriver />}
      {route === 'team' && <MyTeam />}
      {route === 'race' && <RaceResults />}
      {route === 'standings' && <Standings />}
      {route === 'calendar' && <Calendar />}
      {route === 'drivers' && <Drivers />}
      {route === 'settings' && <Settings />}
      {route === 'help' && <Help />}
      {route === 'review' && <SeasonReview />}
      </Suspense>
      <Toasts />
      <UpdateBanner />
    </Shell>
  );
}
