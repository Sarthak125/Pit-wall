import { describe, expect, it } from 'vitest';
import type { Race } from '../../src/api/jolpica';
import { countdown, dayKey, hasSprint, isOvernight, monthGrid, nextRaceIndex, seasonWrap, sessionKind, weekendSessions, weekStart } from '../../src/lib/calendarBoard';

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


describe('month view helpers', () => {
  it('sorts sessions into kinds', () => {
    expect(['Practice 2', 'Sprint Qualifying', 'Sprint Shootout', 'Sprint', 'Qualifying', 'Race'].map(sessionKind)).toEqual(['practice', 'quali', 'quali', 'sprint', 'quali', 'race']);
  });
  it('lays out a month Monday first', () => {
    const g = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(g.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(dayKey(g[6]!)).toBe('2026-11-01');
    expect(g.length).toBe(36);
  });
});

describe('week and overnight helpers', () => {
  it('finds the Monday of a week', () => {
    expect(dayKey(weekStart('2026-11-27'))).toBe('2026-11-23');
    expect(dayKey(weekStart('2026-11-23'))).toBe('2026-11-23');
    expect(dayKey(weekStart('2026-11-01'))).toBe('2026-10-26');
  });
  it('treats midnight to 6 am as overnight', () => {
    expect(isOvernight(new Date(2026, 10, 29, 1, 30))).toBe(true);
    expect(isOvernight(new Date(2026, 10, 29, 5, 59))).toBe(true);
    expect(isOvernight(new Date(2026, 10, 29, 6, 0))).toBe(false);
    expect(isOvernight(new Date(2026, 10, 29, 23, 30))).toBe(false);
  });
});

describe('season wrap-up', () => {
  const res = (code: string, team: string) => [{ Driver: { code, givenName: code, familyName: code, driverId: code.toLowerCase() }, Constructor: { constructorId: team, name: team } }];
  it('counts wins by driver and team, most wins first and ties by who got there first', () => {
    const races = ['1', '2', '3', '4', '5'].map((r) => race(r, `2026-0${r}-01`));
    const results = new Map([['1', res('NOR', 'mclaren')], ['2', res('VER', 'red_bull')], ['3', res('VER', 'red_bull')], ['4', res('PIA', 'mclaren')], ['5', res('NOR', 'mclaren')]]);
    const w = seasonWrap(races, results);
    expect(w.races).toBe(5);
    expect(w.winners.map((x) => [x.code, x.wins])).toEqual([['NOR', 2], ['VER', 2], ['PIA', 1]]);
    expect(w.teams.map((x) => [x.id, x.wins])).toEqual([['mclaren', 3], ['red_bull', 2]]);
  });
  it('skips races without a result', () => {
    const w = seasonWrap([race('1', '2026-01-01'), race('2', '2026-02-01')], new Map([['1', res('NOR', 'mclaren')]]));
    expect(w.races).toBe(1);
  });
});
