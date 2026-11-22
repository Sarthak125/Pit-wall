import type { OffseasonTag } from '../hooks/useSeason';

/**
 * Before a new season's first race the standings, results and charts show the season before. This says so:
 * "Final 2026 standings" (or "2026 season"), with the reason on hover.
 */
export function OffseasonNote({ data, what = 'standings' }: { data?: OffseasonTag | null; what?: 'standings' | 'season' }) {
  const o = data?.offseason;
  if (!o) return null;
  const detail = `The ${o.upcoming} season has not had a race yet, so this shows the ${o.shown} season. It switches to ${o.upcoming} after the first race.`;
  return (
    <span className="provisional-pill" title={detail} aria-label={detail}>
      {what === 'standings' ? `Final ${o.shown} standings` : `${o.shown} season`}
    </span>
  );
}
