import { describe, expect, it } from 'vitest';
import { mirrorKey } from '../../src/lib/mirrorKey';

describe('mirror file names', () => {
  it('turns a Jolpica request into a file path', () => {
    expect(mirrorKey('current/results/?limit=100&offset=0')).toBe('current/results/limit-100_offset-0.json');
    expect(mirrorKey('2025/3/sprint/?limit=100')).toBe('2025/3/sprint/limit-100.json');
    expect(mirrorKey('/current/races/')).toBe('current/races/index.json');
  });
  it('gives different requests different files', () => {
    expect(mirrorKey('current/results/?limit=100&offset=100')).not.toBe(mirrorKey('current/results/?limit=100&offset=0'));
  });
});

import { openf1Key } from '../../src/lib/mirrorKey';
describe('OpenF1 copy file names', () => {
  it('names whole-session and whole-weekend requests', () => {
    expect(openf1Key('laps', { session_key: 11416 })).toBe('laps/session_key-11416.json');
    expect(openf1Key('sessions', { meeting_key: 1300 })).toBe('sessions/meeting_key-1300.json');
    expect(openf1Key('stints', { session_key: '9999', driver_number: undefined })).toBe('stints/session_key-9999.json');
  });
  it('leaves live polling, windows, "latest" and other filters to OpenF1', () => {
    expect(openf1Key('laps', { session_key: 1, 'lap_number>=': 5 })).toBeNull();
    expect(openf1Key('position', { session_key: 1, 'date>': '2026-01-01T00:00:00Z' })).toBeNull();
    expect(openf1Key('sessions', { meeting_key: 'latest' })).toBeNull();
    expect(openf1Key('meetings', { year: 2026 })).toBeNull();
    expect(openf1Key('car_data', { session_key: 1, driver_number: 1 })).toBeNull();
    expect(openf1Key('../x', { session_key: 1 })).toBeNull();
  });
});
