import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CIRCUIT_TZ, metnoToDaily, metnoUrl, symbolToWmo, tzOffsetSeconds } from '../../src/lib/metno';

const step = (time: string, temp: number, rain1?: number, rain6?: number, symbol = 'clearsky_day') => ({
  time,
  data: {
    instant: { details: { air_temperature: temp, wind_speed: 5 } },
    ...(rain1 != null ? { next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain1 } } } : {}),
    next_6_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain6 ?? 0, air_temperature_max: temp + 1, air_temperature_min: temp - 1 } },
  },
});

describe('MET Norway forecast in the daily shape', () => {
  it('knows every circuit of the 2026 calendar', () => {
    for (const id of ['albert_park', 'shanghai', 'suzuka', 'miami', 'villeneuve', 'monaco', 'catalunya', 'red_bull_ring', 'silverstone', 'spa', 'hungaroring', 'zandvoort', 'monza', 'madring', 'baku', 'sepang', 'marina_bay', 'americas', 'rodriguez', 'interlagos', 'vegas', 'losail', 'yas_marina']) {
      expect(CIRCUIT_TZ[id], id).toBeTruthy();
    }
  });
  it('works out time zone offsets, summer time included', () => {
    expect(tzOffsetSeconds('Asia/Qatar', Date.parse('2026-11-27T12:00:00Z'))).toBe(10800);
    expect(tzOffsetSeconds('Europe/London', Date.parse('2026-07-05T12:00:00Z'))).toBe(3600);
    expect(tzOffsetSeconds('Europe/London', Date.parse('2026-01-05T12:00:00Z'))).toBe(0);
    expect(tzOffsetSeconds('America/Los_Angeles', Date.parse('2026-11-22T04:00:00Z'))).toBe(-8 * 3600);
  });
  it('turns weather symbols into the WMO codes the app describes', () => {
    expect(symbolToWmo('clearsky_day')).toBe(0);
    expect(symbolToWmo('fair_night')).toBe(1);
    expect(symbolToWmo('partlycloudy_polartwilight')).toBe(2);
    expect(symbolToWmo('heavyrainshowersandthunder_day')).toBe(95);
    expect(symbolToWmo('rain')).toBe(63);
    expect(symbolToWmo(undefined)).toBeNull();
  });
  it('adds hourly rain while the forecast is hourly and 6-hour rain after, without counting twice', () => {
    // Qatar (UTC+3): 21:00 to 23:00 UTC on the 27th is the 28th locally.
    const series = [
      step('2026-11-27T21:00:00Z', 20, 0.5, 9), step('2026-11-27T22:00:00Z', 19, 0.5, 9), step('2026-11-27T23:00:00Z', 18, 0.5, 9),
      step('2026-11-28T00:00:00Z', 18, undefined, 1), step('2026-11-28T06:00:00Z', 24, undefined, 2), step('2026-11-28T12:00:00Z', 26, undefined, 0),
    ];
    const d = metnoToDaily(series, 'Asia/Qatar', '2026-11-27', '2026-11-30');
    expect(d.utc_offset_seconds).toBe(10800);
    expect(d.daily.time).toEqual(['2026-11-28']);
    expect(d.daily.precipitation_sum[0]).toBe(4.5); // 0.5 + 0.5 + 0.5 hourly, then 1 + 2 + 0 at 6-hour steps
    expect(d.daily.temperature_2m_max[0]).toBe(27);
    expect(d.daily.temperature_2m_min[0]).toBe(17);
    expect(d.daily.wind_speed_10m_max[0]).toBe(18);
    expect(d.daily.precipitation_probability_max).toEqual([null]);
  });
  it('reads a real Locationforecast response for Lusail', () => {
    const body = JSON.parse(readFileSync('tests/fixtures/metno-losail-2026-11-27.json', 'utf8'));
    const d = metnoToDaily(body.properties.timeseries, 'Asia/Qatar', '2026-11-26', '2026-11-30');
    expect(d.daily.time).toEqual(['2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30']);
    d.daily.time.forEach((_, i) => {
      expect(d.daily.temperature_2m_max[i]!).toBeGreaterThanOrEqual(d.daily.temperature_2m_min[i]!);
      expect(d.daily.weather_code[i]).not.toBeNull();
    });
  });
  it('asks with at most four decimals, as MET Norway requires', () => {
    expect(metnoUrl('25.49', '51.4542')).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=25.4900&lon=51.4542');
  });
});
