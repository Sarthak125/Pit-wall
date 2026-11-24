/**
 * Checks how old Pit Wall's published Jolpica copy is and prints a one-line verdict.
 *
 *   node scripts/check-copy.mjs <live site URL>
 *
 * Exit code 0: the copy is fresh. 1: it is stale, missing or unreadable (the workflow then opens or updates an issue).
 */
import { copyAge } from '../src/lib/dataAge.ts';

const site = (process.argv[2] ?? '').replace(/\/?$/, '/');
try {
  const res = await fetch(`${site}data/jolpica/manifest.json`, { headers: { 'User-Agent': 'PitWall/1.0' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`manifest answered ${res.status}`);
  const m = await res.json();
  const age = copyAge(m.dataFrom ?? m.generatedAt);
  if (!age) throw new Error('manifest has no date');
  console.log(`Jolpica copy: data fetched ${age.text}${age.stale ? ' (stale)' : ''}.`);
  process.exit(age.stale ? 1 : 0);
} catch (err) {
  console.log(`Jolpica copy could not be checked: ${err.message}`);
  process.exit(1);
}
