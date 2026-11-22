import { describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../../src/api/http';
import type { Lap, SessionResult, Stint } from '../../src/api/openf1';
import type { Race } from '../../src/api/jolpica';
import { qualiFromResults } from '../../src/hooks/useLiveTiming';
import { buildIcs } from '../../src/lib/ics';
import { longRuns } from '../../src/lib/longRuns';
import { activeWindow, setLiveWindows } from '../../src/lib/openf1Window';

const lap = (driver: number, n: number, t: number | null, pitOut = false): Lap => ({ date_start: null, driver_number: driver, lap_number: n, lap_duration: t, duration_sector_1: null, duration_sector_2: null, duration_sector_3: null, is_pit_out_lap: pitOut });
const stint = (driver: number, n: number, start: number, end: number | null, compound = 'SOFT', age = 0): Stint => ({ driver_number: driver, stint_number: n, compound, lap_start: start, lap_end: end, tyre_age_at_start: age });

const race: Race = {
  season: '2026', round: '21', raceName: 'Las Vegas Grand Prix', date: '2026-11-22', time: '04:00:00Z',
  Circuit: { circuitId: 'vegas', circuitName: 'Las Vegas Strip Street Circuit', Location: { locality: 'Las Vegas', country: 'USA' } },
  FirstPractice: { date: '2026-11-20', time: '00:30:00Z' }, Qualifying: { date: '2026-11-21', time: '04:00:00Z' },
} as Race;

describe('long runs', () => {
  it('uses the longest run, leaving out out-lap, in-lap and slow laps', () => {
    const laps = [lap(1, 1, null, true), lap(1, 2, 98), lap(1, 3, 97.2), lap(1, 4, 97.4), lap(1, 5, 120), lap(1, 6, 97.6), lap(1, 7, 97.8), lap(1, 8, 98), lap(1, 9, 101)];
    const [r] = longRuns(laps, [stint(1, 1, 1, 9)]);
    // Laps 2 to 8 minus the slow lap 5: six laps.
    expect(r.laps).toBe(6);
    expect(r.avg).toBeCloseTo((98 + 97.2 + 97.4 + 97.6 + 97.8 + 98) / 6, 3);
    expect(r.deg).toBeGreaterThan(0);
  });
  it('needs at least 5 representative laps', () => {
    expect(longRuns([lap(2, 2, 98), lap(2, 3, 98), lap(2, 4, 98)], [stint(2, 1, 1, 5)])).toEqual([]);
  });
});

describe('qualifying from the classification', () => {
  const res = (n: number, pos: number, d: (number | null)[]): SessionResult => ({ driver_number: n, position: pos, number_of_laps: 10, duration: d as SessionResult["duration"], gap_to_leader: null, dnf: false, dns: false, dsq: false });
  it('counts cars per part and who went out where', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => res(i + 1, i + 1, [90, 89.5, 89])),
      ...Array.from({ length: 6 }, (_, i) => res(i + 11, i + 11, [90.5, 90, null])),
      ...Array.from({ length: 6 }, (_, i) => res(i + 17, i + 17, [91, null, null])),
    ];
    const q = qualiFromResults(rows)!;
    expect(q.state.entries).toEqual([22, 16, 10]);
    expect(q.byDriver.get(1)!.out).toBeNull();
    expect(q.byDriver.get(11)!.out).toBe(2);
    expect(q.byDriver.get(17)!.out).toBe(1);
  });
});

describe('calendar file', () => {
  const ics = buildIcs([race], 'F1 test', 'https://example.org/');
  it('has one event per session with stable IDs and UTC times', () => {
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(3);
    expect(ics).toContain('UID:pitwall-2026-21-race@pitwall');
    expect(ics).toContain('DTSTART:20261122T040000Z');
    expect(ics).toContain('DTEND:20261122T060000Z');
  });
  it('follows the format: CRLF line ends and lines of at most 75 bytes', () => {
    const lines = ics.split('\r\n');
    expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});

describe('OpenF1 live windows', () => {
  setLiveWindows([race]);
  it('opens 30 minutes before a session and closes about 30 minutes after it ends', () => {
    expect(activeWindow(Date.parse('2026-11-22T03:29:00Z'))).toBeNull();
    expect(activeWindow(Date.parse('2026-11-22T03:31:00Z'))?.session).toBe('Race');
    expect(activeWindow(Date.parse('2026-11-22T06:29:00Z'))?.session).toBe('Race');
    expect(activeWindow(Date.parse('2026-11-22T06:31:00Z'))).toBeNull();
    expect(activeWindow(Date.parse('2026-11-21T04:30:00Z'))?.session).toBe('Qualifying');
  });
});

describe('request limiter', () => {
  it('never lets more than the per-second limit through in any second', async () => {
    vi.useFakeTimers();
    const lim = new RateLimiter(3, 30);
    const times: number[] = [];
    const all = Array.from({ length: 12 }, () => lim.acquire().then(() => times.push(Date.now())));
    await vi.advanceTimersByTimeAsync(10_000);
    await Promise.all(all);
    vi.useRealTimers();
    for (const t of times) expect(times.filter((u) => u >= t && u < t + 1000).length).toBeLessThanOrEqual(3);
  });
  it('drops a waiting request that is cancelled without using a slot', async () => {
    vi.useFakeTimers();
    const lim = new RateLimiter(1, 30);
    await lim.acquire();
    const ctrl = new AbortController();
    const cancelled = lim.acquire(ctrl.signal).catch((e) => e.name);
    ctrl.abort();
    const next = lim.acquire().then(() => 'ok');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await cancelled).toBe('AbortError');
    expect(await next).toBe('ok');
    vi.useRealTimers();
  });
});
