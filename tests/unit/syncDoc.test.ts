import { describe, expect, it } from 'vitest';
import { makeDoc, mergeFirst, pickSynced, readDoc, sameDoc, SYNCED_KEYS } from '../../src/lib/syncDoc';
import type { Settings } from '../../src/lib/settings';
import type { Reminder } from '../../src/lib/reminders';

const base: Settings = { openf1Token: 'secret', openf1PerMinute: 30, season: 'current', favoriteDriver: 'VER', favoriteName: 'Max Verstappen', alertsEnabled: true, systemNotifications: true, trackMap: false, favoriteTeam: 'red_bull', favoriteTeamName: 'Red Bull', liveDelay: 45, spoilerFree: false, revealed: '', theme: 'dark' };
const rem = (id: string, at: number): Reminder => ({ id, at, session: 'Qualifying', race: 'Qatar Grand Prix' });

describe('account sync document', () => {
  it('keeps device-only settings out of the account', () => {
    const s = pickSynced(base) as Record<string, unknown>;
    expect(s.openf1Token).toBeUndefined();
    expect(s.openf1PerMinute).toBeUndefined();
    expect(s.systemNotifications).toBeUndefined();
    expect(s.liveDelay).toBeUndefined();
    expect(s.season).toBeUndefined();
    expect(Object.keys(s).sort()).toEqual([...SYNCED_KEYS].sort());
  });
  it('drops unknown keys and wrong types when reading a saved document', () => {
    const d = readDoc({ settings: { theme: 'purple', favoriteDriver: 'NOR', trackMap: 'yes', openf1Token: 'x', spoilerFree: true }, reminders: [rem('a', 1), { id: 3 }, null] });
    expect(d.settings).toEqual({ favoriteDriver: 'NOR', spoilerFree: true });
    expect(d.reminders).toEqual([rem('a', 1)]);
    expect(readDoc(null)).toEqual({ v: 1, settings: {}, reminders: [] });
  });
  it('on a new device the account settings win and reminders from both are kept', () => {
    const local = makeDoc({ ...base, theme: 'light' }, [rem('a', 2), rem('b', 1)]);
    const cloud = readDoc({ settings: { favoriteDriver: 'NOR', favoriteName: 'Lando Norris', theme: 'auto' }, reminders: [rem('c', 3), rem('a', 2)] });
    const m = mergeFirst(local, cloud);
    expect(m.settings.favoriteDriver).toBe('NOR');
    expect(m.settings.theme).toBe('auto');
    expect(m.settings.favoriteTeam).toBe('red_bull');
    expect(m.reminders.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
  it('compares documents regardless of reminder order', () => {
    const a = makeDoc(base, [rem('a', 1), rem('b', 2)]);
    const b = { ...a, reminders: [rem('b', 2), rem('a', 1)] };
    expect(sameDoc(a, b)).toBe(true);
    expect(sameDoc(a, makeDoc({ ...base, theme: 'light' }, a.reminders))).toBe(false);
  });
});
