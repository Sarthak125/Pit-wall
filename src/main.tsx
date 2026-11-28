import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { announceUpdate, setUpdateHandler } from './lib/update';
import { onLateData, onSlowChange, slowServers } from './api/http';
import { startAccount } from './lib/account';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      // Pause polling while the app is in the background.
      refetchIntervalInBackground: false,
    },
  },
});

// When a slow server finally answers a request that a saved copy stood in for, reload the data drawn from saved
// copies: queries updated since the server became slow (a few seconds' wait at most, then one refresh).
let lateTimer: ReturnType<typeof setTimeout> | undefined;
let slowSince = 0;
onLateData(() => {
  clearTimeout(lateTimer);
  lateTimer = setTimeout(() => {
    const since = slowSince;
    slowSince = 0;
    void queryClient.invalidateQueries({ predicate: (q) => q.state.dataUpdatedAt >= since });
  }, 1_500);
});
onSlowChange(() => {
  if (slowServers().length && !slowSince) slowSince = Date.now() - 10_000;
});

// Installs the service worker so the app can be added to the home screen and opens offline. When a new version
// has downloaded, the update banner offers a reload instead of the old version lingering until the next visit.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => announceUpdate(),
  onRegisteredSW: (_url, reg) => {
    if (!reg) return;
    const check = () => {
      if (navigator.onLine) reg.update().catch(() => {});
    };
    // Check when the app comes back to the foreground, and every 30 minutes while it is open.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, 30 * 60_000);
  },
});
setUpdateHandler(() => void updateSW(true));

startAccount();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
