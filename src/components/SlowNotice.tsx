import { useSyncExternalStore } from 'react';
import { onSlowChange, slowServers } from '../api/http';

const NAMES: Record<string, string> = {
  'api.jolpi.ca': 'Jolpica (results and standings)',
  'api.multiviewer.app': 'MultiViewer (track maps)',
  'en.wikipedia.org': 'Wikipedia',
  'api.open-meteo.com': 'Open-Meteo (weather)',
};

let snapshot = '';
const read = () => {
  const next = slowServers().join(',');
  if (next !== snapshot) snapshot = next;
  return snapshot;
};

/** Says when a slow server's saved copy is on screen, so older data is never shown without a word. */
export function SlowNotice() {
  const hosts = useSyncExternalStore(onSlowChange, read);
  if (!hosts) return null;
  const names = hosts.split(',').map((h) => NAMES[h] ?? h);
  return (
    <div className="slow-note" role="status">
      <span className="dot" aria-hidden="true" />
      <span>
        {names.join(' and ')} {names.length > 1 ? 'are' : 'is'} slow to respond or not answering, so some of this page is the data saved on this device from an earlier visit. It updates by itself once the server answers.
      </span>
    </div>
  );
}
