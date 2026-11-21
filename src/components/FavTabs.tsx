import type React from 'react';
import { useFavourite, useFavouriteTeam } from '../hooks/useFavourite';
import { href } from '../lib/router';
import { FlagIcon, StarIcon } from './Icons';

/** Driver | Team switcher at the top of the Favourites pages. */
export function FavTabs({ active }: { active: 'driver' | 'team' }) {
  const fav = useFavourite();
  const team = useFavouriteTeam();
  return (
    <nav className="subtabs" aria-label="Favourites">
      <a href={href('driver')} aria-current={active === 'driver' ? 'page' : undefined}>
        <span className="fav-star"><StarIcon filled={!!fav} size={16} /></span>
        Driver{fav ? `: ${fav.name.split(' ').slice(-1)[0]}` : ''}
      </a>
      <a href={href('team')} aria-current={active === 'team' ? 'page' : undefined}>
        <span className="team-flag" style={{ '--team': team?.colour ?? '#ff5c77' } as React.CSSProperties}><FlagIcon filled={!!team} size={16} /></span>
        Team{team ? `: ${team.name}` : ''}
      </a>
    </nav>
  );
}
