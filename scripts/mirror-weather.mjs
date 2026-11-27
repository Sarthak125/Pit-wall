/**
 * Pit Wall's copy of the weekend forecast: for the race weekend under way and the next one (when it starts within
 * 15 days, the reach of the forecast), the same Open-Meteo request the app makes, saved under data/weather/ as
 * "<season>-<round>.json" with the time it was fetched. The app uses it only when Open-Meteo does not answer (it caps
 * requests per network address per day, which a shared mobile or office connection can reach).
 *
 *   node scripts/mirror-weather.mjs <output folder> [Jolpica copy folder] [live site URL]
 *
 * When Open-Meteo refuses, the forecast already on the live site for that weekend is kept, so a failed run never
 * removes a saved copy.
 *
 * The calendar comes from the Jolpica copy made just before. Open-Meteo's data is free for non-commercial use with
 * credit (CC BY 4.0); the app credits it on the forecast card. Never stops a deploy.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mirrorKey } from '../src/lib/mirrorKey.ts';
import { forecastUrl, weatherFile, weekendDays } from '../src/lib/weatherKey.ts';

const OUT = process.argv[2] ?? 'dist/data/weather';
const JOLPICA = process.argv[3] ?? 'dist/data/jolpica';
const SITE = (process.argv[4] ?? '').replace(/\/?$/, '/');
const DAY = 86_400_000;
const SESSIONS = ['FirstPractice', 'SecondPractice', 'ThirdPractice', 'SprintQualifying', 'SprintShootout', 'Sprint', 'Qualifying'];

// Same reading of Jolpica's times as the app (src/lib/format.ts): UTC, midday when no time is given.
const toMs = (s) => (s?.date ? Date.parse(`${s.date}T${(s.time ?? '12:00:00Z').replace(/Z?$/, 'Z')}`) : NaN);

function sessionTimes(race) {
  return [...SESSIONS.map((k) => toMs(race[k])), toMs({ date: race.date, time: race.time })].filter((t) => Number.isFinite(t));
}

/** The weekends worth saving: under way, or starting within 15 days. */
export function weekendsToSave(races, now) {
  return races.filter((r) => {
    const t = sessionTimes(r);
    if (!t.length || !r.Circuit?.Location?.lat) return false;
    const first = Math.min(...t);
    const last = Math.max(...t);
    return last + DAY > now && first - now <= 15 * DAY;
  });
}

/** Copies the live site's saved forecast for this weekend into the new build, if it is for the same request. */
async function keepPrevious(race, url) {
  if (SITE === '/') return null;
  try {
    const res = await fetch(`${SITE}data/weather/${weatherFile(race.season, race.round)}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const copy = await res.json();
    if (copy?.url !== url) return null;
    writeFileSync(join(OUT, weatherFile(race.season, race.round)), JSON.stringify(copy));
    return copy.fetchedAt;
  } catch {
    return null;
  }
}

async function main() {
  let races;
  try {
    const schedule = JSON.parse(readFileSync(join(JOLPICA, mirrorKey('current/races/?limit=100')), 'utf8'));
    races = schedule?.MRData?.RaceTable?.Races ?? [];
  } catch (err) {
    console.log(`No calendar in the Jolpica copy (${err.message}); nothing to save.`);
    return;
  }
  mkdirSync(OUT, { recursive: true });
  const now = Date.now();
  let saved = 0;
  for (const race of weekendsToSave(races, now)) {
    const { start, end } = weekendDays(sessionTimes(race));
    const url = forecastUrl(race.Circuit.Location.lat, race.Circuit.Location.long, start, end);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
      const data = await res.json();
      if (!data?.daily?.time?.length) throw new Error('no daily data');
      writeFileSync(join(OUT, weatherFile(race.season, race.round)), JSON.stringify({ url, fetchedAt: new Date(now).toISOString(), data }));
      saved++;
      console.log(`Saved the forecast for ${race.season} round ${race.round} (${race.raceName}), ${start} to ${end}.`);
    } catch (err) {
      const kept = await keepPrevious(race, url);
      console.log(`Could not fetch the forecast for ${race.raceName}: ${err.message}.${kept ? ` Kept the copy saved at ${kept}.` : ''}`);
    }
  }
  if (!saved) console.log('No forecast saved this time.');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
