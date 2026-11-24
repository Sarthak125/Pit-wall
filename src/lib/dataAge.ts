/** How the age of Pit Wall's own data copy is described, and when it counts as out of date. */

/** The refresh job runs every 3 hours; beyond this the copy has missed several runs. */
export const STALE_COPY_MS = 12 * 3_600_000;

export function copyAge(dataFrom: string | null, now = Date.now()): { text: string; stale: boolean } | null {
  const t = dataFrom ? Date.parse(dataFrom) : NaN;
  if (!Number.isFinite(t)) return null;
  const ms = Math.max(0, now - t);
  const mins = Math.round(ms / 60_000);
  const hours = Math.round(ms / 3_600_000);
  const text = mins < 2 ? 'just now' : mins < 90 ? `${mins} minutes ago` : hours < 48 ? `${hours} hours ago` : `${Math.round(hours / 24)} days ago`;
  return { text, stale: ms > STALE_COPY_MS };
}
