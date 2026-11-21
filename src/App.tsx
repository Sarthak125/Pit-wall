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
import { Standings } from './pages/Standings';
import { useRoute } from './lib/router';

const TITLES = { dashboard: 'Dashboard', live: 'Live Timing', standings: 'Standings', calendar: 'Calendar', drivers: 'Drivers', settings: 'Settings' };

export default function App() {
  const route = useRoute();
  const sessions = useLatestSessions();
  const now = useNow(30_000);
  const live = (sessions.data ?? []).some((s) => isSessionLive(s, now));

  useEffect(() => {
    document.title = `${TITLES[route]} · Pit Wall`;
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <Shell route={route} live={live}>
      {route === 'dashboard' && <Dashboard />}
      {route === 'live' && <LiveTiming />}
      {route === 'standings' && <Standings />}
      {route === 'calendar' && <Calendar />}
      {route === 'drivers' && <Drivers />}
      {route === 'settings' && <Settings />}
    </Shell>
  );
}
