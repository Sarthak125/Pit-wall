import type { Race } from '../api/jolpica';
import { downloadIcs, sessionsOf } from '../lib/ics';

/** "Add to calendar" for one race weekend, or for several (e.g. the rest of the season). */
export function AddToCalendar({ races, label, filename, name }: { races: Race[]; label?: string; filename?: string; name?: string }) {
  const sessions = races.reduce((n, r) => n + sessionsOf(r).length, 0);
  if (!sessions) return null;
  const one = races.length === 1 ? races[0] : null;
  return (
    <button
      className="btn cal-btn"
      onClick={() => downloadIcs(races, name ?? (one ? `F1 ${one.raceName}` : 'F1 calendar'), filename ?? (one ? `f1-${one.season}-${one.raceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics` : 'f1-calendar.ics'))}
      title={`Download ${sessions} session${sessions === 1 ? '' : 's'} as a calendar file (.ics) for Google Calendar, Apple Calendar or Outlook`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>
      {label ?? 'Add to calendar'}
    </button>
  );
}
