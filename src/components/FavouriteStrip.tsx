import type { DriverStanding, RaceWithResults } from '../api/jolpica';
import { useFavourite } from '../hooks/useFavourite';
import { href } from '../lib/router';
import { teamColour } from '../lib/teams';
import { StarIcon } from './Icons';

/** Dashboard strip for the favourite driver, or a one-line prompt when none is set. */
export function FavouriteStrip({ standings, races, season }: { standings: DriverStanding[]; races: RaceWithResults[]; season: string }) {
  const fav = useFavourite();
  if (!fav) {
    return (
      <section className="card fav-prompt" aria-label="Favourite driver">
        <span>
          <span className="fav-star"><StarIcon /></span> Pick a favourite driver to follow them here.
        </span>
        <a className="link" href={href('drivers')}>Choose a driver →</a>
      </section>
    );
  }

  const idx = standings.findIndex((s) => s.Driver.code === fav.code);
  const me = standings[idx];
  if (!me) {
    return (
      <section className="card fav-prompt" aria-label="Favourite driver">
        <span>
          <span className="fav-star"><StarIcon filled /></span> {fav.name} has no standings in the {season === 'current' ? 'current' : season} season.
        </span>
        <a className="link" href={href('driver')}>All stats →</a>
      </section>
    );
  }

  const team = me.Constructors[me.Constructors.length - 1];
  const colour = teamColour(team?.constructorId ?? team?.name);
  const leader = Number(standings[0]?.points ?? 0);
  const last = [...races].reverse().find((r) => r.Results?.some((x) => x.Driver.code === fav.code));
  const lastRes = last?.Results?.find((x) => x.Driver.code === fav.code);
  const lastText = lastRes ? (/^\d+$/.test(lastRes.positionText) ? `P${lastRes.positionText}` : 'DNF') : '-';

  return (
    <section className="card fav-card" style={{ borderLeftColor: colour }} aria-label="Your driver">
      <div className="who" style={{ gap: 14 }}>
        <span className="fav-star"><StarIcon filled size={22} /></span>
        <div>
          <div className="kicker" style={{ fontSize: 11 }}>Your driver</div>
          <div className="name">{me.Driver.givenName} {me.Driver.familyName}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {team?.name}
            {me.Driver.permanentNumber ? ` · #${me.Driver.permanentNumber}` : ''}
          </div>
        </div>
      </div>
      <div className="fav-stats">
        <div><div className="l">Championship</div><div className="v">P{me.position ?? me.positionText}</div></div>
        <div><div className="l">Points</div><div className="v">{me.points}</div></div>
        <div><div className="l">To leader</div><div className="v">{idx === 0 ? 'Leader' : `-${leader - Number(me.points)}`}</div></div>
        <div><div className="l">Wins</div><div className="v">{me.wins}</div></div>
        <div><div className="l">Last race</div><div className="v">{lastText}</div></div>
        <a className="link" href={href('driver')} style={{ color: 'var(--text)', fontWeight: 600 }}>All stats →</a>
        <a className="link" href={href('drivers')}>Change</a>
      </div>
    </section>
  );
}
