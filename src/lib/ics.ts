/**
 * Race weekends as an iCalendar (.ics) file for Google Calendar, Apple Calendar or Outlook. Times are in UTC, so each
 * calendar shows them in the viewer's own time zone. Every event has a stable ID, so importing again updates the
 * events instead of duplicating them. End times are estimates from each session's usual length.
 */
import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { toDate } from './format';

const MINUTES: Record<string, number> = { 'Practice 1': 60, 'Practice 2': 60, 'Practice 3': 60, 'Sprint Qualifying': 45, 'Sprint Shootout': 45, Sprint: 60, Qualifying: 60, Race: 120 };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
/** Lines longer than 75 bytes are folded, as the format requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function sessionsOf(race: Race): { label: string; start: Date }[] {
  return [
    ...SESSION_FIELDS.map((f) => ({ label: f.label, start: toDate(race[f.key] as Race['FirstPractice']) })),
    { label: 'Race', start: toDate({ date: race.date, time: race.time }) },
  ].filter((s): s is { label: string; start: Date } => !!s.start);
}

export function buildIcs(races: Race[], name: string, siteUrl: string): string {
  const now = stamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pit Wall//F1 dashboard//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`];
  for (const r of races) {
    const place = `${r.Circuit.circuitName}, ${r.Circuit.Location.locality}, ${r.Circuit.Location.country}`;
    const link = `${siteUrl}#/race/${r.round}`;
    for (const s of sessionsOf(r)) {
      const end = new Date(s.start.getTime() + (MINUTES[s.label] ?? 60) * 60_000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:pitwall-${r.season}-${r.round}-${s.label.toLowerCase().replace(/\s+/g, '-')}@pitwall`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(s.start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${esc(`F1 ${r.raceName.replace(/ Grand Prix$/, ' GP')} · ${s.label}`)}`,
        `LOCATION:${esc(place)}`,
        `DESCRIPTION:${esc(`Round ${r.round} of the ${r.season} season. End time is an estimate. Live timing and results: ${link}`)}`,
        `URL:${link}`,
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Hands the file to the browser: phones offer to add it to the calendar, desktops download it. */
export function downloadIcs(races: Race[], name: string, filename: string) {
  const site = `${location.origin}${location.pathname}`;
  const blob = new Blob([buildIcs(races, name, site)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
