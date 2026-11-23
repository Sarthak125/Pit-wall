/**
 * Short summaries from Wikipedia (the REST API's page summary: free, no key, allowed from the browser). Jolpica links
 * every driver, team and circuit to its English Wikipedia article, so no name matching is needed.
 * Text is CC BY-SA 4.0; photos come from Wikimedia Commons, each with its own author and licence.
 */
import { fetchJson, RateLimiter } from './http';

const limiter = new RateLimiter(5, 100);

export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
}

/** The article title in a Wikipedia link, e.g. "Max_Verstappen" from http://en.wikipedia.org/wiki/Max_Verstappen. */
export function wikiTitle(url: string | undefined): string | null {
  const m = url?.match(/wikipedia\.org\/wiki\/([^?#]+)/);
  return m ? m[1] : null;
}

export async function getSummary(url: string, signal?: AbortSignal): Promise<WikiSummary | null> {
  const title = wikiTitle(url);
  if (!title) return null;
  const data = await fetchJson<WikiSummary & { type?: string }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    limiter,
    signal,
    cacheTtlMs: 7 * 24 * 3_600_000,
    retries: 1,
  });
  // A disambiguation page or an empty one is not about the subject.
  return data?.extract && data.type !== 'disambiguation' ? data : null;
}

/** The Wikimedia Commons page of a thumbnail (author and licence are there). */
export function commonsPage(thumb: string): string | null {
  const m = thumb.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null;
}
