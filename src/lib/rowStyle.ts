import type { CSSProperties } from 'react';
import type { FavouriteTeam } from '../hooks/useFavourite';

/** Class and style for a table row: gold for the favourite driver, team tint for the favourite team's drivers. */
export function rowProps(code: string | undefined, favCode: string | undefined, team: FavouriteTeam | null): { className?: string; style?: CSSProperties } {
  const isFav = !!code && code === favCode;
  const isTeam = !!code && !!team?.codes.has(code);
  const className = [isFav ? 'fav' : '', isTeam ? 'team' : ''].join(' ').trim() || undefined;
  return { className, style: isTeam ? ({ '--team': team!.colour } as CSSProperties) : undefined };
}
