import { describe, expect, it } from 'vitest';
import { copyAge } from '../../src/lib/dataAge';

const now = Date.parse('2026-11-22T08:00:00Z');
describe('age of the data copy', () => {
  it('describes minutes, hours and days', () => {
    expect(copyAge('2026-11-22T07:59:00Z', now)?.text).toBe('just now');
    expect(copyAge('2026-11-22T07:15:00Z', now)?.text).toBe('45 minutes ago');
    expect(copyAge('2026-11-22T05:00:00Z', now)?.text).toBe('3 hours ago');
    expect(copyAge('2026-11-19T08:00:00Z', now)?.text).toBe('3 days ago');
  });
  it('is stale after 12 hours, not before', () => {
    expect(copyAge('2026-11-21T20:00:00Z', now)?.stale).toBe(false);
    expect(copyAge('2026-11-21T19:59:00Z', now)?.stale).toBe(true);
  });
  it('has no age without a usable date', () => {
    expect(copyAge(null, now)).toBeNull();
    expect(copyAge('not a date', now)).toBeNull();
  });
});
