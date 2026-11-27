import type { Result } from '../api/jolpica';
import { finishLabel } from '../lib/calendarBoard';
import { useSettings } from '../lib/settings';
import { driverHref } from '../lib/router';
import { teamColour } from '../lib/teams';

/** The favourite driver's result in a race, if they took part: "Your driver · P5 Lewis Hamilton". */
export function useMyFinish(results: Result[] | undefined): Result | undefined {
  const { favoriteDriver } = useSettings();
  return favoriteDriver ? results?.find((x) => x.Driver.code === favoriteDriver) : undefined;
}

export function MyFinish({ result, compact }: { result: Result; compact?: boolean }) {
  const label = finishLabel(result);
  const name = `${result.Driver.givenName} ${result.Driver.familyName}`;
  const title = label === 'DNF' || label === 'DNS' || label === 'DSQ' ? `${name}: ${result.status}` : undefined;
  if (compact) {
    return (
      <span className="my-fin" title={title ?? `Your driver, ${name}`}>
        <span className="my-star" aria-hidden="true">★</span><span className="sr-only">Your driver</span> {result.Driver.code} <b>{label}</b>
      </span>
    );
  }
  return (
    <div className="my-fin-row" title={title}>
      <span className="my-star" aria-hidden="true">★</span>
      <span className="muted">Your driver</span>
      <b className="mono">{label}</b>
      <span className="cb-dot" style={{ background: teamColour(result.Constructor.constructorId) }} aria-hidden="true" />
      {result.Driver.code ? <a className="name-link" href={driverHref(result.Driver.code)}>{name}</a> : name}
    </div>
  );
}
