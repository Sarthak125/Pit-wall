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
