import { useF1Feed, type FeedSnapshot } from '../api/f1live';
import type { Session } from '../api/openf1';
import { feedSession } from '../lib/f1adapter';
import { activeWindow, useOpenF1Blocked } from '../lib/openf1Window';
import { getSettings } from '../lib/settings';
import { useNow } from './usePoll';

/**
 * F1's live feed and the session it covers, while a session's live window is open and no OpenF1 token is set
 * (OpenF1 is paused for free users then). Null outside those windows.
 */
export function useLiveFeedSession(): { feed: FeedSnapshot | null; session: Session | null } {
  const now = useNow(30_000);
  const blocked = useOpenF1Blocked();
  // Only while OpenF1 is paused for free users; otherwise OpenF1 has everything.
  const on = !getSettings().openf1Token.trim() && !!activeWindow(now, 60 * 60_000) && !!blocked;
  const feed = useF1Feed(on);
  return { feed, session: feed && feed.status !== 'idle' ? feedSession(feed) : null };
}
