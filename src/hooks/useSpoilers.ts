import { useMemo } from 'react';
import type { Race } from '../api/jolpica';
import { updateSettings, useSettings } from '../lib/settings';
import { useNow } from './usePoll';
import { useSchedule } from './useSeason';

const HOUR = 3_600_000;
const at = (t?: { date: string; time?: string }) => (t?.date ? Date.parse(`${t.date}T${t.time ?? '12:00:00Z'}`) : NaN);

/**
 * Spoiler-free mode (Settings): the latest race weekend that has started stays hidden until revealed. Its sessions
 * on Live Timing, its race page and last race card, and (once its sprint or race has started) the standings and
 * title fight chart are covered. When the next weekend starts, protection moves on to it.
 */
export function useSpoilers() {
  const s = useSettings();
  const schedule = useSchedule('current');
  const now = useNow(60_000);
  return useMemo(() => {
    const races = schedule.data ?? [];
    const starts = (r: Race) => {
      const times = [r.FirstPractice, r.SecondPractice, r.ThirdPractice, r.SprintQualifying, r.SprintShootout, r.Sprint, r.Qualifying, { date: r.date, time: r.time }].map(at).filter(Number.isFinite);
      return Math.min(...times);
    };
    const weekend = [...races].reverse().find((r) => starts(r) <= now) ?? null;
    const key = weekend ? `${weekend.season}-${weekend.round}` : '';
    const on = s.spoilerFree && !!weekend && s.revealed !== key;
    const raceStart = weekend ? at({ date: weekend.date, time: weekend.time }) : NaN;
    const firstPointsSession = weekend ? Math.min(raceStart, at(weekend.Sprint)) || raceStart : NaN;
    const from = weekend ? starts(weekend) - HOUR : NaN;
    const to = Number.isFinite(raceStart) ? raceStart + 6 * HOUR : NaN;
    return {
      on,
      weekend,
      /** Standings and championship charts change once the sprint or race has started. */
      standingsHidden: on && now >= (Number.isFinite(firstPointsSession) ? firstPointsSession : raceStart),
      /** A race page or last race card for this round. */
      raceHidden: (season: string | number, round: string | number) => on && `${season}-${round}` === key && now >= raceStart,
      /** A Live Timing session of this weekend that has started. */
      sessionHidden: (dateStart: string) => {
        const t = Date.parse(dateStart);
        return on && t >= from && t <= to && t <= now;
      },
      reveal: () => updateSettings({ revealed: key }),
    };
  }, [s.spoilerFree, s.revealed, schedule.data, now]);
}
