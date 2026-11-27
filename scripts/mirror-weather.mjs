/**
 * Pit Wall's copy of the weekend forecast: for the race weekend under way and the next one (when it starts within
 * 15 days, the reach of the forecast), the same Open-Meteo request the app makes, saved under data/weather/ as
 * "<season>-<round>.json" with the time it was fetched. The app uses it only when Open-Meteo does not answer (it caps
 * requests per network address per day, which a shared mobile or office connection can reach).
 *
 *   node scripts/mirror-weather.mjs <output folder> [Jolpica copy folder] [live site URL]
 *
 * When Open-Meteo refuses, the forecast comes from MET Norway instead (api.met.no, CC BY 4.0), turned into the same
 * daily shape. MET Norway asks browsers not to call it directly, so only this job does, identifying itself as its
 * terms require. When both refuse, the forecast already on the live site for that weekend is kept, so a failed run
 * never removes a saved copy.
 *
 * The calendar comes from the Jolpica copy made just before. Open-Meteo's data is free for non-commercial use with
 * credit (CC BY 4.0); the app credits it on the forecast card. Never stops a deploy.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mirrorKey } from '../src/lib/mirrorKey.ts';
import { forecastUrl, weatherFile, weekendDays } from '../src/lib/weatherKey.ts';
import { CIRCUIT_TZ, metnoToDaily, metnoUrl } from '../src/lib/metno.ts';

const USER_AGENT = 'PitWall/1.0 (https://github.com/Sarthak125/Pit-wall; fan project, non-commercial)';

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

/** The weekend from MET Norway, in Open-Meteo's daily shape (only for circuits whose time zone Pit Wall knows). */
async function fromMetno(race, start, end) {
  const tz = CIRCUIT_TZ[race.Circuit.circuitId];
  if (!tz) throw new Error(`no time zone known for circuit ${race.Circuit.circuitId}`);
  const res = await fetch(metnoUrl(race.Circuit.Location.lat, race.Circuit.Location.long), { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status}`);
  const body = await res.json();
  const data = metnoToDaily(body?.properties?.timeseries ?? [], tz, start, end);
  if (!data.daily.time.length) throw new Error('no days in range');
  return data;
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
    const file = join(OUT, weatherFile(race.season, race.round));
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
      const data = await res.json();
      if (!data?.daily?.time?.length) throw new Error('no daily data');
      writeFileSync(file, JSON.stringify({ url, fetchedAt: new Date(now).toISOString(), source: 'open-meteo', data }));
      saved++;
      console.log(`Saved the Open-Meteo forecast for ${race.season} round ${race.round} (${race.raceName}), ${start} to ${end}.`);
      continue;
    } catch (err) {
      console.log(`Open-Meteo refused the forecast for ${race.raceName}: ${err.message}.`);
    }
    try {
      const data = await fromMetno(race, start, end);
      writeFileSync(file, JSON.stringify({ url, fetchedAt: new Date(now).toISOString(), source: 'metno', data }));
      saved++;
      console.log(`Saved the MET Norway forecast for ${race.season} round ${race.round} (${race.raceName}), ${data.daily.time.length} days.`);
    } catch (err) {
      const kept = await keepPrevious(race, url);
      console.log(`MET Norway did not give a forecast for ${race.raceName} either: ${err.message}.${kept ? ` Kept the copy saved at ${kept}.` : ''}`);
    }
  }
  if (!saved) console.log('No forecast saved this time.');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
