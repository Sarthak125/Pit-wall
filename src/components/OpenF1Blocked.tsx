import { useNow } from '../hooks/usePoll';
import { href } from '../lib/router';
import type { LiveWindow } from '../lib/openf1Window';

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

function countdown(ms: number): string {
  if (ms <= 0) return 'any moment now';
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  return h ? `in ${h} h ${String(m % 60).padStart(2, '0')} min` : `in ${m} min`;
}

/** Shown where OpenF1 data would be, while OpenF1 is limited to paying supporters during a live session. */
export function OpenF1BlockedNotice({ w, compact = false }: { w: LiveWindow; compact?: boolean }) {
  const now = useNow(compact ? 30_000 : 1_000);
  const left = w.freeAt - now;
  const when = `about ${clock.format(new Date(w.freeAt))}`;
  if (compact) {
    return (
      <div className="of1-blocked compact" role="status">
        <strong>Paused while {w.session} is live.</strong> OpenF1 only serves paying supporters during a live session. Back at {when} ({countdown(left)}).
      </div>
    );
  }
  return (
    <section className="card of1-blocked" role="status" aria-labelledby="of1b">
      <div className="of1-blocked-head">
        <span className="live-pill"><span className="dot" />LIVE</span>
        <h1 className="h2" id="of1b">{w.raceName} · {w.session} is live</h1>
      </div>
      <p>
        During a live session, <a href="https://openf1.org" target="_blank" rel="noreferrer">OpenF1</a> shares data only with paying supporters. From 30 minutes before a session until 30 minutes after it ends, every free request is refused, including past sessions. That is why timing, track maps and team radio are empty right now.
      </p>
      <div className="of1-blocked-when">
        <div>
          <div className="l">FREE ACCESS SHOULD RETURN</div>
          <div className="v">{when}</div>
        </div>
        <div>
          <div className="l">TIME LEFT</div>
          <div className="v">{left > 0 ? countdown(left).replace('in ', '') : 'any moment'}</div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        {left > 0
          ? 'This is an estimate from the usual session length; a red flag or safety car can push it back. This page checks every 2 minutes and fills in by itself, with the full session ready to replay.'
          : 'The session may have run long. This page checks every 2 minutes and fills in by itself as soon as OpenF1 answers again.'}
      </p>
      <ul className="of1-blocked-list">
        <li>Standings, results, the calendar and the weather forecast keep working: they come from other sources.</li>
        <li>For live timing right now, use the official F1 app or <a href="https://www.formula1.com" target="_blank" rel="noreferrer">formula1.com</a>.</li>
        <li>OpenF1 supporter? Paste your access token in <a href={href('settings')}>Settings</a> to get live data here.</li>
      </ul>
    </section>
  );
}
