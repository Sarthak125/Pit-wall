import type { Race, RaceWithResults } from '../api/jolpica';
import { driverHref, teamHref } from '../lib/router';
import { teamColour } from '../lib/teams';
import { titleDecisions, type TitleDecision } from '../lib/titles';

const when = (d: TitleDecision) => `decided at the ${d.raceName} (round ${d.round})`;

/**
 * The champions, once a title can no longer be lost: on the Dashboard while the season still has races to run, and
 * after the final race. Nothing shows while both titles are still open.
 */
export function ChampionsBanner({ schedule, races, sprints, driverCode }: { schedule: Race[]; races: RaceWithResults[]; sprints: RaceWithResults[]; driverCode?: (driverId: string) => string | undefined }) {
  const { driver, team } = titleDecisions(schedule, races, sprints);
  if (!driver && !team) return null;
  const year = schedule[0]?.season ?? '';
  const code = driver ? driverCode?.(driver.id) : undefined;
  return (
    <section className="card champions" aria-labelledby="champions">
      <span className="champions-cup" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h2.5a1.5 1.5 0 0 1 0 3H17" /><path d="M7 5H4.5a1.5 1.5 0 0 0 0 3H7" /></svg>
      </span>
      <div className="champions-main">
        {driver && (
          <>
            <p className="kicker" id="champions">{year} World Champion{driver.seasonOver ? '' : ' · title decided'}</p>
            <h2 className="champions-name">
              <span className="team-bar" style={{ background: teamColour(driver.teamId) }} />
              {code ? <a className="name-link" href={driverHref(code)}>{driver.name}</a> : driver.name}
            </h2>
            <p className="muted champions-detail">
              {driver.teamName} · {driver.points} points · {when(driver)}
              {!driver.seasonOver && <>. Leads by {driver.lead} with {driver.available} points left.</>}
            </p>
          </>
        )}
        {team && (
          <p className={driver ? 'champions-team' : 'champions-detail'} id={driver ? undefined : 'champions'}>
            <span className="kicker champions-team-label">{year} Constructors' Champions</span>
            <span className="team-bar" style={{ background: teamColour(team.id) }} />
            <a className="name-link" href={teamHref(team.id)}>{team.name}</a>
            <span className="muted"> · {team.points} points · {when(team)}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/** "Champion" tag for the title winner in the standings tables. */
export function ChampionTag({ decision }: { decision: TitleDecision }) {
  return (
    <span className="champion-tag" title={`Title ${when(decision)}${decision.seasonOver ? '' : `: leads by ${decision.lead} with ${decision.available} points left`}.`}>
      Champion
    </span>
  );
}
