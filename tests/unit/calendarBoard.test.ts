import { describe, expect, it } from 'vitest';
import type { Race } from '../../src/api/jolpica';
import { countdown, hasSprint, nextRaceIndex, weekendSessions } from '../../src/lib/calendarBoard';

const race = (round: string, date: string, time = '13:00:00Z', extra: Partial<Race> = {}): Race => ({
  season: '2026',
  round,
  raceName: `Race ${round}`,
  date,
  time,
  Circuit: { circuitId: 'c', circuitName: 'Circuit', Location: { locality: 'Town', country: 'Land' } },
  ...extra,
});

describe('nextRaceIndex', () => {
  const races = [race('1', '2026-03-08'), race('2', '2026-03-15'), race('3', '2026-03-22')];
  it('is the first weekend whose race has not finished', () => {
    expect(nextRaceIndex(races, Date.parse('2026-03-01T00:00:00Z'))).toBe(0);
    expect(nextRaceIndex(races, Date.parse('2026-03-10T00:00:00Z'))).toBe(1);
  });
  it('keeps a race as next for 3 hours after it starts, then moves on', () => {
    expect(nextRaceIndex(races, Date.parse('2026-03-08T15:59:00Z'))).toBe(0);
    expect(nextRaceIndex(races, Date.parse('2026-03-08T16:01:00Z'))).toBe(1);
  });
  it('is -1 once the season is over, and for an empty season', () => {
    expect(nextRaceIndex(races, Date.parse('2026-04-01T00:00:00Z'))).toBe(-1);
    expect(nextRaceIndex([], Date.now())).toBe(-1);
  });
});

describe('countdown', () => {
  it('splits a time into days, hours and minutes', () => {
    expect(countdown(((4 * 24 + 8) * 60 + 5) * 60_000)).toEqual({ days: 4, hours: 8, minutes: 5 });
  });
  it('never goes below zero', () => {
    expect(countdown(-5000)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
  it('drops partial minutes', () => {
    expect(countdown(59_999)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});

describe('weekendSessions', () => {
  it('lists sessions in time order and ends with the race', () => {
    const r = race('1', '2026-03-08', '04:00:00Z', {
      FirstPractice: { date: '2026-03-06', time: '01:30:00Z' },
      Qualifying: { date: '2026-03-07', time: '05:00:00Z' },
      SecondPractice: { date: '2026-03-06', time: '05:00:00Z' },
    });
    expect(weekendSessions(r).map((s) => s.label)).toEqual(['Practice 1', 'Practice 2', 'Qualifying', 'Race']);
  });
  it('puts sprint sessions where they fall', () => {
    const r = race('2', '2026-03-15', '07:00:00Z', {
      FirstPractice: { date: '2026-03-13', time: '03:30:00Z' },
      SprintQualifying: { date: '2026-03-13', time: '07:30:00Z' },
      Sprint: { date: '2026-03-14', time: '03:00:00Z' },
      Qualifying: { date: '2026-03-14', time: '07:00:00Z' },
    });
    expect(weekendSessions(r).map((s) => s.label)).toEqual(['Practice 1', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race']);
    expect(hasSprint(r)).toBe(true);
    expect(hasSprint(race('3', '2026-03-22'))).toBe(false);
  });
});
