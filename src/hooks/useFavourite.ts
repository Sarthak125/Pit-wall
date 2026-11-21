import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSessionLive, openf1, type OF1Driver, type Pit, type Position, type RaceControlMsg, type Session } from '../api/openf1';
import { ingestFavourite } from '../lib/alerts';
import { classify } from '../lib/raceControl';
import { useSettings } from '../lib/settings';
import { useNow } from './usePoll';
import { useDriverStandings, useLatestSessions } from './useSeason';
import { teamColour } from '../lib/teams';

/** The favourite driver's code and name, or null when none is set. */
export function useFavourite() {
  const { favoriteDriver, favoriteName } = useSettings();
  return favoriteDriver ? { code: favoriteDriver, name: favoriteName } : null;
}

/** The live session right now, if any, from the latest meeting. */
export function useLiveSession(): Session | undefined {
  const sessions = useLatestSessions();
  const now = useNow(30_000);
  return useMemo(() => (sessions.data ?? []).find((s) => isSessionLive(s, now)), [sessions.data, now]);
}

/**
 * Background watcher for favourite-driver alerts on pages that do not poll
 * live timing themselves. About 9 requests a minute while a session is live.
 */
export function useAlertWatcher(enabled: boolean) {
  const fav = useFavourite();
  const { alertsEnabled } = useSettings();
  const session = useLiveSession();
  const sk = session?.session_key;
  const on = enabled && alertsEnabled && !!fav && !!sk;

  const drivers = useQuery({
    queryKey: ['drv', sk],
    enabled: on,
    queryFn: () => openf1<OF1Driver>('drivers', { session_key: sk }),
    staleTime: 10 * 60_000,
  });
  const num = drivers.data?.find((d) => d.name_acronym === fav?.code)?.driver_number;
  const active = on && !!num;

  const pos = useQuery({
    queryKey: ['watch-pos', sk, num],
    enabled: active,
    queryFn: () => openf1<Position>('position', { session_key: sk, driver_number: num }),
    refetchInterval: 15_000,
  });
  const pits = useQuery({
    queryKey: ['watch-pit', sk, num],
    enabled: active,
    queryFn: () => openf1<Pit>('pit', { session_key: sk, driver_number: num }),
    refetchInterval: 30_000,
  });
  const rc = useQuery({
    queryKey: ['watch-rc', sk],
    enabled: active,
    queryFn: () => openf1<RaceControlMsg>('race_control', { session_key: sk }),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!active || !sk || !fav || !num || !pos.data || !pits.data || !rc.data) return;
    const latest = [...pos.data].sort((a, b) => a.date.localeCompare(b.date)).pop();
    ingestFavourite({
      sessionKey: sk,
      code: fav.code,
      position: latest?.position ?? null,
      pits: pits.data.length,
      messages: rc.data.map(classify).filter((m) => m.cars.includes(num)),
    });
  }, [active, sk, fav, num, pos.data, pits.data, rc.data]);
}

export interface FavouriteTeam {
  id: string;
  name: string;
  colour: string;
  /** Three-letter codes of the drivers who last drove for the team this season. */
  codes: Set<string>;
}

/** Any team by constructor id, with its drivers worked out from the season's standings. */
export function useTeam(id: string, name: string): FavouriteTeam | null {
  const { season } = useSettings();
  const standings = useDriverStandings(season);
  return useMemo(() => {
    if (!id) return null;
    const rows = standings.data?.standings ?? [];
    const codes = new Set(
      rows.filter((d) => d.Constructors[d.Constructors.length - 1]?.constructorId === id && d.Driver.code).map((d) => d.Driver.code!),
    );
    const fromStandings = rows.flatMap((d) => d.Constructors).find((c) => c.constructorId === id)?.name;
    return { id, name: name || fromStandings || id, colour: teamColour(id), codes };
  }, [id, name, standings.data]);
}

/** The favourite team, with its drivers worked out from the season's standings. */
export function useFavouriteTeam(): FavouriteTeam | null {
  const { favoriteTeam, favoriteTeamName } = useSettings();
  return useTeam(favoriteTeam, favoriteTeamName);
}
