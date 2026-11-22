import { describe, expect, it } from 'vitest';
import snapshot from '../fixtures/feed-snapshot.json';
import { mergeF1, parseLapTime, type FeedSnapshot } from '../../src/api/f1live';
import { feedDrivers, feedMessages, feedRows, feedSession, feedWeather } from '../../src/lib/f1adapter';

const snap = (state: object): FeedSnapshot => ({ status: 'live', delay: 0, state: state as FeedSnapshot['state'], laps: [], updatedAt: Date.parse('2026-11-22T04:22:46Z'), receivedAt: null, retryAt: null });

describe('mergeF1', () => {
  it('merges nested objects without losing other keys', () => {
    expect(mergeF1({ a: { b: 1, c: 2 } }, { a: { b: 3 } })).toEqual({ a: { b: 3, c: 2 } });
  });
  it('applies index-keyed updates to arrays in place, keeping the other fields', () => {
    const sectors = [{ Value: '28.1', Segments: [2049] }, { Value: '', Segments: [2048, 0] }, { Value: '' }];
    expect(mergeF1(sectors, { 1: { Value: '32.5' } })).toEqual([{ Value: '28.1', Segments: [2049] }, { Value: '32.5', Segments: [2048, 0] }, { Value: '' }]);
  });
  it('replaces a list sent in full', () => {
    expect(mergeF1([1, 2, 3], [4])).toEqual([4]);
  });
  it('removes deleted keys', () => {
    expect(mergeF1({ a: 1, b: 2 }, { _deleted: ['a'] })).toEqual({ b: 2 });
  });
});

describe('parseLapTime', () => {
  it('reads minutes and seconds', () => expect(parseLapTime('1:36.214')).toBeCloseTo(96.214));
  it('reads seconds only', () => expect(parseLapTime('28.142')).toBeCloseTo(28.142));
  it('returns null for empty or odd values', () => {
    expect(parseLapTime('')).toBeNull();
    expect(parseLapTime('LAP 12')).toBeNull();
  });
});

describe('F1 feed adapter (Las Vegas race snapshot)', () => {
  const s = snap(snapshot);
  it('finds the session as OpenF1 would name it', () => {
    const sess = feedSession(s)!;
    expect(sess.session_key).toBe(11420);
    expect(sess.session_name).toBe('Race');
    expect(sess.date_start).toBe('2026-11-22T04:00:00.000Z');
    expect(sess.circuit_key).toBe(152);
  });
  it('builds a full timing tower in position order', () => {
    const rows = feedRows(s, true);
    expect(rows.length).toBe(feedDrivers(s).length);
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(rows.map((r) => r.position)).toEqual([...rows.map((r) => r.position)].sort((a, b) => (a ?? 99) - (b ?? 99)));
    expect(rows[0].gap).toBe(0);
    expect(rows.slice(1, 5).every((r) => typeof r.gap === 'number' && r.gap > 0)).toBe(true);
    expect(rows.every((r) => r.driver.name_acronym.length === 3)).toBe(true);
  });
  it('maps race control messages and weather', () => {
    const msgs = feedMessages(s);
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.every((m) => /Z$|[+-]\d\d:\d\d$/.test(m.date))).toBe(true);
    const w = feedWeather(s)!;
    expect(w.air_temperature).toBeGreaterThan(0);
  });
});
