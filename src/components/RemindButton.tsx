import type { Race } from '../api/jolpica';
import { BellIcon } from './Icons';
import { reminderId, toggleReminder, useReminders } from '../lib/reminders';

/** A bell that turns on a reminder 15 minutes before a session. Only shown for sessions still to come. */
export function RemindButton({ race, session, at, now }: { race: Race; session: string; at: Date; now: number }) {
  const reminders = useReminders();
  if (at.getTime() <= now) return null;
  const id = reminderId(race.season, race.round, session);
  const on = reminders.some((r) => r.id === id);
  const blocked = typeof Notification === 'undefined' || Notification.permission === 'denied';
  const what = `${session}, ${race.raceName}`;
  const title = on
    ? `Reminder on: 15 minutes before ${session}. Tap to turn it off.`
    : `Remind me 15 minutes before ${session}${blocked ? ' (notifications are blocked, so only inside Pit Wall)' : ''}. Works while Pit Wall is open.`;
  return (
    <button
      type="button"
      className={`remind${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Reminder on for ${what}` : `Remind me 15 minutes before ${what}`}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        toggleReminder({ id, at: at.getTime(), session, race: race.raceName });
      }}
    >
      <BellIcon on={on} />
    </button>
  );
}

/** One button for every session of a weekend still to come: turns them all on, or all off when they already are. */
export function RemindWeekend({ race, sessions, now }: { race: Race; sessions: { label: string; at: Date }[]; now: number }) {
  const reminders = useReminders();
  const left = sessions.filter((s) => s.at.getTime() > now);
  if (left.length < 2) return null;
  const ids = left.map((s) => reminderId(race.season, race.round, s.label));
  const allOn = ids.every((id) => reminders.some((r) => r.id === id));
  return (
    <button
      type="button"
      className="btn cb-remind-all"
      aria-pressed={allOn}
      title="A notification 15 minutes before each session, while Pit Wall is open"
      onClick={() => {
        for (const s of left) {
          const id = reminderId(race.season, race.round, s.label);
          const on = reminders.some((r) => r.id === id);
          // All on: turn them all off. Otherwise turn on the ones that are off.
          if (allOn ? on : !on) toggleReminder({ id, at: s.at.getTime(), session: s.label, race: race.raceName });
        }
      }}
    >
      <BellIcon on={allOn} />
      {allOn ? `Reminders on for all ${left.length} sessions` : `Remind me for ${left.length === sessions.length ? 'the whole weekend' : `the ${left.length} sessions left`}`}
    </button>
  );
}
