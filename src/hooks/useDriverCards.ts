import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getQualifying } from '../api/jolpica';
import { driverCardSnapshots, type CardSnapshot } from '../lib/driverCards';
import { useDriverStandings, useResults } from './useSeason';

/** Driver cards for a season: one snapshot per round run, so a card can be compared with the round before. */
export function useDriverCards(season: string): { snapshots: CardSnapshot[]; isLoading: boolean; error: unknown } {
  const results = useResults(season);
  const standings = useDriverStandings(season);
  const quali = useQuery({ queryKey: ['quali-all', season], queryFn: () => getQualifying(season), staleTime: 15 * 60_000 });
  const snapshots = useMemo(() => {
    if (!results.data) return [];
    const official = new Map((standings.data?.standings ?? []).map((s) => [s.Driver.driverId, { pos: Number(s.position ?? s.positionText), points: Number(s.points) }]));
    return driverCardSnapshots(results.data.races, results.data.sprints, quali.data ?? [], official.size ? official : undefined);
  }, [results.data, quali.data, standings.data]);
  return { snapshots, isLoading: results.isLoading || standings.isLoading, error: results.error ?? standings.error };
}
