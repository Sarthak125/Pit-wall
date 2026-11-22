import { useSpoilers } from '../hooks/useSpoilers';
import { href } from '../lib/router';

/** Shown in place of results while spoiler-free mode protects the latest race weekend. */
export function SpoilerCover({ what, compact = false }: { what: string; compact?: boolean }) {
  const sp = useSpoilers();
  const name = sp.weekend?.raceName ?? 'the latest race weekend';
  return (
    <div className={`spoiler-cover${compact ? ' compact' : ''}`} role="note">
      <div>
        <strong>Spoiler-free mode</strong>
        <span className="muted"> · {what} for the {name} {compact ? 'hidden' : 'are hidden until you reveal them'}.</span>
      </div>
      <div className="spoiler-actions">
        <button className="btn primary" onClick={sp.reveal}>Reveal {sp.weekend ? sp.weekend.raceName.replace(/ Grand Prix$/, '') : ''}</button>
        {!compact && <a className="link" href={href('settings')}>Turn off in Settings</a>}
      </div>
    </div>
  );
}
