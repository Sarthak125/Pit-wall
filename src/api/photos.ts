/**
 * Driver photos for the cards: Pit Wall's own copy (scripts/mirror-photos.mjs) of each driver's lead Wikipedia photo
 * when it is a freely licensed image on Wikimedia Commons, published under data/photos/ with its author and licence.
 * A driver without one is not listed, and the card shows a silhouette.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchJson, RateLimiter } from './http';

const ROOT = `${import.meta.env.BASE_URL}data/photos`;
const limiter = new RateLimiter(10, 300);

export interface DriverPhoto {
  url: string;
  title: string;
  artist: string;
  licence: string;
  /** The photo's Commons page, where the author and licence terms are. */
  page: string;
}

interface Manifest {
  photos: Record<string, { file: string; title: string; artist: string; licence: string; page: string }>;
}

export async function getDriverPhotos(): Promise<Record<string, DriverPhoto>> {
  try {
    const m = await fetchJson<Manifest>(`${ROOT}/manifest.json`, { limiter, cacheTtlMs: 60 * 60_000, retries: 0 });
    return Object.fromEntries(Object.entries(m?.photos ?? {}).map(([id, p]) => [id, { url: `${ROOT}/${p.file}`, title: p.title, artist: p.artist, licence: p.licence, page: p.page }]));
  } catch {
    return {};
  }
}

export function useDriverPhotos(): Record<string, DriverPhoto> {
  return useQuery({ queryKey: ['driver-photos'], queryFn: getDriverPhotos, staleTime: 60 * 60_000, retry: false }).data ?? {};
}
