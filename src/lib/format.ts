/** Formatting helpers. All times are shown in the device's local time zone. */
import type { Race, SessionTime } from '../api/jolpica';

export function toDate(s: SessionTime | undefined): Date | null {
  if (!s?.date) return null;
  // Jolpica times are UTC ("13:00:00Z"). Without a time, assume midday UTC.
  const t = s.time ?? '12:00:00Z';
  const d = new Date(`${s.date}T${t.endsWith('Z') ? t : `${t}Z`}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function raceStart(r: Race): Date | null {
  return toDate({ date: r.date, time: r.time });
}

const dayTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const shortClock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export const fmtDayTime = (d: Date) => dayTime.format(d);
export const fmtDayMonth = (d: Date) => dayMonth.format(d);
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
/** Weekday and date in the device's time zone, for session schedules: "Fri 27 Nov". */
export const fmtWeekdayDate = (d: Date) => `${weekday.format(d)} ${dayMonth.format(d)}`;
/** Weekday, day of the month and time, for a session within a weekend whose month is shown nearby: "Fri 27 · 19:00". */
export const fmtWeekdayDayTime = (d: Date) => `${weekday.format(d)} ${d.getDate()} · ${shortClock.format(d)}`;
/** A date range in the device's time zone: "27–29 Nov", "31 Oct – 2 Nov" (or one date when both fall on the same day). */
export function fmtDateRange(a: Date, b: Date): string {
  try {
    return dayMonth.formatRange(a, b);
  } catch {
    return a.toDateString() === b.toDateString() ? dayMonth.format(b) : `${dayMonth.format(a)} – ${dayMonth.format(b)}`;
  }
}
export const fmtClock = (d: Date) => clock.format(d);
export const fmtShortClock = (d: Date) => shortClock.format(d);

/** The device's time zone by its everyday name ("India Standard Time"), or its IANA id if that is not available. */
export function timeZoneLabel(): string {
  try {
    const name = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' }).formatToParts(new Date()).find((x) => x.type === 'timeZoneName')?.value;
    return name || Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'local time';
  }
}

/** 95.902 -> "1:35.902" */
export function fmtLap(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '-';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, '0')}` : s.toFixed(3);
}

export function fmtSector(sec: number | null | undefined): string {
  return sec == null || !Number.isFinite(sec) ? '-' : sec.toFixed(3);
}

/** Gap values from OpenF1 can be seconds or strings such as "+1 LAP". */
export function fmtGap(v: number | string | null | undefined): string {
  if (v == null || v === '') return '-';
  if (typeof v === 'string') return v;
  return `+${v.toFixed(3)}`;
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function splitCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** OpenF1 writes surnames in capitals ("Max VERSTAPPEN"); show them as "Max Verstappen". */
export function niceName(name: string): string {
  return name.replace(/\p{Lu}{2,}/gu, (w) => w[0] + w.slice(1).toLowerCase());
}
