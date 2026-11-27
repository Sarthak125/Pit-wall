import { describe, expect, it } from 'vitest';
import { forecastUrl, weatherFile, weekendDays } from '../../src/lib/weatherKey';
// @ts-expect-error: a plain JavaScript script, tested for its choice of weekends.
import { weekendsToSave } from '../../scripts/mirror-weather.mjs';

const race = (round: string, fp1: string, raceDay: string) => ({
  season: '2026', round, raceName: `Race ${round}`, date: raceDay, time: '16:00:00Z',
  FirstPractice: { date: fp1, time: '13:30:00Z' },
  Circuit: { Location: { lat: '25.49', long: '51.45' } },
});

describe('weekend forecast copy', () => {
  it('asks for the day before the first session to the day after the last', () => {
    expect(weekendDays([Date.parse('2026-11-27T13:30:00Z'), Date.parse('2026-11-29T16:00:00Z')])).toEqual({ start: '2026-11-26', end: '2026-11-30' });
  });
  it('builds the same request the app makes, and one file per weekend', () => {
    expect(forecastUrl('25.49', '51.45', '2026-11-26', '2026-11-30')).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=25.49&longitude=51.45&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,precipitation_probability_max&timezone=auto&start_date=2026-11-26&end_date=2026-11-30',
    );
    expect(weatherFile('2026', '22')).toBe('2026-22.json');
  });
  it('saves the weekend under way and any starting within 15 days, not finished or far-off ones', () => {
    const now = Date.parse('2026-11-27T10:00:00Z');
    const races = [race('21', '2026-11-20', '2026-11-22'), race('22', '2026-11-27', '2026-11-29'), race('23', '2026-12-04', '2026-12-06'), race('24', '2026-12-20', '2026-12-22')];
    expect(weekendsToSave(races, now).map((r: { round: string }) => r.round)).toEqual(['22', '23']);
  });
});
