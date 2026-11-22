import { useEffect } from 'react';
import { isSessionLive } from './api/openf1';
import { Shell } from './components/Shell';
import { useNow } from './hooks/usePoll';
import { useLatestSessions } from './hooks/useSeason';
import { Calendar } from './pages/Calendar';
import { Dashboard } from './pages/Dashboard';
import { Drivers } from './pages/Drivers';
import { LiveTiming } from './pages/LiveTiming';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { Standings } from './pages/Standings';
import { MyDriver } from './pages/MyDriver';
import { MyTeam } from './pages/MyTeam';
import { RaceResults } from './pages/RaceResults';
import { Toasts } from './components/Toasts';
import { UpdateBanner } from './components/UpdateBanner';
import { useAlertWatcher } from './hooks/useFavourite';
import { useRoute, useRouteParam } from './lib/router';

const TITLES = { dashboard: 'Dashboard', live: 'Live Timing', driver: 'My Driver', team: 'My Team', race: 'Race results', standings: 'Standings', calendar: 'Calendar', drivers: 'Drivers', settings: 'Settings', help: 'How to use' };

export default function App() {
  const route = useRoute();
  const param = useRouteParam();
  const sessions = useLatestSessions();
  const now = useNow(30_000);
  const live = (sessions.data ?? []).some((s) => isSessionLive(s, now));
  // Live Timing and My Driver feed alerts from their own data; elsewhere a light watcher does.
  useAlertWatcher(route !== 'live' && route !== 'driver');

  useEffect(() => {
    document.title = `${TITLES[route]} · Pit Wall`;
    window.scrollTo(0, 0);
  }, [route, param]);

  return (
    <Shell route={route} live={live}>
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
      <Toasts />
      <UpdateBanner />
    </Shell>
  );
}
