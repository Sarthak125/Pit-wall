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
