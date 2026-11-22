import { useSyncExternalStore } from 'react';
import { f1Feed, type FeedSnapshot } from '../api/f1live';

/** No timing message for this long while connected: worth saying, though a quiet spell (a red flag) is normal. */
const QUIET_MS = 45_000;

function useOnline() {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener('online', l);
      window.addEventListener('offline', l);
      return () => {
        window.removeEventListener('online', l);
        window.removeEventListener('offline', l);
      };
    },
    () => navigator.onLine,
  );
}

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ''}`.trim();
};

/**
 * How F1's live feed connection is doing, for the session bar while Live Timing reads it: live, quiet (connected but
 * nothing new for a while), reconnecting (with a countdown and a button to try now) or offline. While it is not live,
 * the page keeps showing the last data it received.
 */
export function FeedStatus({ feed, now }: { feed: FeedSnapshot; now: number }) {
  const online = useOnline();
  let tone: 'ok' | 'warn' | 'bad';
  let label: string;
  let detail: string;
  let retry = false;
  const last = feed.receivedAt ? `Last update ${ago(now - feed.receivedAt)} ago.` : '';

  if (!online) {
    tone = 'bad';
    label = 'Offline';
    detail = `Your device is offline. Timing shows the last data received and picks up again when you reconnect. ${last}`;
  } else if (feed.status === 'error') {
    tone = 'bad';
    const wait = feed.retryAt ? Math.max(0, Math.ceil((feed.retryAt - now) / 1000)) : null;
    label = wait ? `Reconnecting in ${wait} s` : 'Reconnecting';
    detail = `The connection to F1's feed dropped. Timing shows the last data received until it is back. ${last}`;
    retry = true;
  } else if (feed.status === 'connecting') {
    tone = 'warn';
    label = 'Connecting';
    detail = `Connecting to F1's live timing feed. ${last}`;
  } else if (feed.receivedAt && now - feed.receivedAt > QUIET_MS) {
    tone = 'warn';
    label = `No updates for ${ago(now - feed.receivedAt)}`;
    detail = "Still connected to F1's feed, but nothing new has arrived. This is normal during a red flag or a break; otherwise it should recover by itself.";
  } else {
    tone = 'ok';
    label = 'F1 feed live';
    detail = `Connected to F1's live timing feed. ${last}`;
  }

  return (
    <span className={`feed-status ${tone}`} role="status" title={detail.trim()} aria-label={`${label}. ${detail}`.trim()}>
      <i className="feed-status-dot" />
      {label}
      {retry && (
        <button type="button" className="feed-status-retry" onClick={f1Feed.retryNow}>
          Retry now
        </button>
      )}
    </span>
  );
}
