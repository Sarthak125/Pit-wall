import { describe, expect, it } from 'vitest';
import { dueReminders, LEAD_MS, reminderId, reminderText, type Reminder } from '../../src/lib/reminders';

const at = Date.parse('2026-11-28T18:00:00Z');
const r = (id: string, t = at): Reminder => ({ id, at: t, session: 'Qualifying', race: 'Qatar Grand Prix' });

describe('session reminders', () => {
  it('builds one id per season, round and session', () => {
    expect(reminderId('2026', '22', 'Qualifying')).toBe('2026-22-Qualifying');
  });
  it('waits until 15 minutes before the session', () => {
    expect(dueReminders([r('a')], at - LEAD_MS - 1000)).toEqual({ due: [], keep: [r('a')], stale: [] });
    expect(dueReminders([r('a')], at - LEAD_MS).due).toEqual([r('a')]);
  });
  it('still goes off a little after the start, but drops one found long after (the app was closed)', () => {
    expect(dueReminders([r('a')], at + 5 * 60_000).due).toHaveLength(1);
    expect(dueReminders([r('a')], at + 60 * 60_000)).toEqual({ due: [], keep: [], stale: [r('a')] });
  });
  it('says how long is left', () => {
    expect(reminderText(r('a'), at - 15 * 60_000)).toEqual({ title: 'Qualifying starts in 15 minutes', body: 'Qatar Grand Prix' });
    expect(reminderText(r('a'), at - 60_000).title).toBe('Qualifying starts in 1 minute');
    expect(reminderText(r('a'), at + 30_000).title).toBe('Qualifying is starting now');
  });
});
