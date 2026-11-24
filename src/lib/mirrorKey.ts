/**
 * File name of a Jolpica request in Pit Wall's own copy of the data (see scripts/mirror-jolpica.mjs): the request's
 * path as folders and its query as the file name, e.g. "current/results/?limit=100&offset=0" becomes
 * "current/results/limit-100_offset-0.json". Shared by the job that makes the copy and the app that reads it, so
 * the two always agree. Plain TypeScript with no imports, so Node can run it directly.
 */
export function mirrorKey(pathAndQuery: string): string {
  const [path, query = ''] = pathAndQuery.split('?');
  const dir = path.replace(/^\/+|\/+$/g, '');
  const name = query ? query.replace(/=/g, '-').replace(/&/g, '_').replace(/[^A-Za-z0-9._-]/g, '') : 'index';
  return `${dir}/${name}.json`;
}

/**
 * File name of an OpenF1 request in Pit Wall's copy of finished-session data (see scripts/mirror-openf1.mjs), or null
 * when the request is not one the copy can hold. Only requests for a whole session (or a weekend's session list) by
 * number are kept: "laps?session_key=9999" becomes "laps/session_key-9999.json". Anything else (live polling, time
 * windows, "latest") always goes to OpenF1.
 */
export function openf1Key(endpoint: string, params: Record<string, string | number | undefined>): string | null {
  const given = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (given.length !== 1) return null;
  const [name, value] = given[0];
  if (!/^[a-z_]+$/.test(endpoint) || !['session_key', 'meeting_key'].includes(name) || !/^\d+$/.test(String(value))) return null;
  return `${endpoint}/${name}-${value}.json`;
}
