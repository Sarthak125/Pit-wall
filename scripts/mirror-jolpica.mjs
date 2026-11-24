/**
 * Pit Wall's own copy of the Jolpica data the app needs most: the calendar, race, sprint and qualifying results and
 * the standings (after every round too) of the current season and the one before. Run by the deploy workflow every
 * few hours; the files are published with the site under data/jolpica/, and the app reads them first, so pages load
 * fast and keep working while Jolpica is slow or down.
 *
 *   node scripts/mirror-jolpica.mjs <output folder> [live site URL]
 *
 * Each file holds Jolpica's answer to the exact request the app makes, named by src/lib/mirrorKey.ts. When Jolpica
 * cannot be reached, the copy on the live site is reused file by file, so a run never makes the copy worse. If there
 * is neither, nothing is written and the app simply asks Jolpica as before.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mirrorKey } from '../src/lib/mirrorKey.ts';

const OUT = process.argv[2] ?? 'dist/data/jolpica';
const SITE = (process.argv[3] ?? '').replace(/\/?$/, '/');
/** JOLPICA_API: another address for the API (for testing against recorded answers). */
const API = process.env.JOLPICA_API ?? 'https://api.jolpi.ca/ergast/f1';
/** Jolpica allows 4 requests a second and 500 an hour; stay well under. */
const SPACING_MS = 400;
const TIMEOUT_MS = 30_000;

const sleep = (ms) => new Promise((f) => setTimeout(f, ms));
const keys = new Map();
let fetched = 0, reused = 0, missing = 0, lastCall = 0;

/**
 * Jolpica requires every client to name itself with an app name and version
 * (https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md#custom-user-agent); requests with Node's default
 * user agent are refused. Bump the version when this script's behaviour changes, so Jolpica could block one bad
 * version rather than the whole app.
 */
const USER_AGENT = 'PitWall/1.0';

async function getJson(url, timeout = TIMEOUT_MS) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fromJolpica(pq) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const wait = lastCall + SPACING_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      return await getJson(`${API}/${pq}`);
    } catch (err) {
      // A gateway timeout already took a minute: Jolpica is down, so stop asking it for this run.
      if (/^(403|429|504) /.test(err.message) || err.name === 'TimeoutError') throw err;
      if (attempt) throw err;
      await sleep(3_000);
    }
  }
}

let previous = null;
async function previousCopy(key) {
  if (!previous?.keys.includes(key)) return undefined;
  try {
    return await getJson(`${SITE}data/jolpica/${key}`, 15_000);
  } catch {
    return undefined;
  }
}

function store(pq, data) {
  const key = mirrorKey(pq);
  keys.set(key, data);
  const file = join(OUT, key);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return data;
}

/** Jolpica's answer, or the live site's copy if Jolpica fails. Once Jolpica is known to be down, only copies are used. */
let jolpicaDown = false;
async function get(pq, { reuseOnly = false } = {}) {
  if (!jolpicaDown && !reuseOnly) {
    try {
      const data = await fromJolpica(pq);
      fetched++;
      return store(pq, data);
    } catch (err) {
      console.log(`Jolpica: ${err.message}`);
      // Refused, timed out or unreachable: stop asking Jolpica for this run and keep the earlier copy instead.
      // (A 429 means this run has used up Jolpica's hourly allowance: the next run, 3 hours later, fills any gaps.)
      if (/^(403|429|504) /.test(err.message) || err.name === 'TimeoutError' || /fetch failed/.test(err.message)) jolpicaDown = true;
    }
  }
  const old = await previousCopy(mirrorKey(pq));
  if (old !== undefined) {
    reused++;
    return store(pq, old);
  }
  missing++;
  return undefined;
}

const racesOf = (d) => d?.MRData?.RaceTable?.Races ?? [];

/** All pages of a paged list (limit 100), as the app requests them; returns the races merged by round. */
async function paged(path, key, opts) {
  const first = await get(`${path}/?limit=100&offset=0`, opts);
  if (!first) return null;
  const total = Math.min(Number(first.MRData.total) || 0, 2000);
  const pages = [first];
  for (let offset = 100; offset < total; offset += 100) {
    const page = await get(`${path}/?limit=100&offset=${offset}`, opts);
    if (!page) return null;
    pages.push(page);
  }
  const byRound = new Map();
  for (const p of pages) {
    for (const r of racesOf(p)) {
      const had = byRound.get(r.round);
      if (had) had[key] = [...(had[key] ?? []), ...(r[key] ?? [])];
      else byRound.set(r.round, { ...r });
    }
  }
  return { season: first.MRData.RaceTable?.season, races: [...byRound.values()] };
}

/** A one-round answer in Jolpica's shape, made from the season's lists (no extra requests). */
function roundAnswer(season, round, race) {
  return { MRData: { limit: '100', offset: '0', total: race ? '1' : '0', RaceTable: { season, round, Races: race ? [race] : [] } } };
}

/** Everything for one season, under the label the app uses ("current" or the year). */
async function season(label, { reuseOnly = false } = {}) {
  const opts = { reuseOnly };
  const schedule = await get(`${label}/races/?limit=100`, opts);
  if (!schedule) return null;
  const year = schedule.MRData.RaceTable.season;
  const results = await paged(`${label}/results`, 'Results', opts);
  const sprints = await paged(`${label}/sprint`, 'SprintResults', opts);
  const quali = await paged(`${label}/qualifying`, 'QualifyingResults', opts);
  await get(`${label}/driverstandings/?limit=100`, opts);
  await get(`${label}/constructorstandings/?limit=100`, opts);
  const done = (results?.races ?? []).filter((r) => r.Results?.length).map((r) => Number(r.round));
  const last = Math.max(0, ...done);
  for (const round of done) {
    // Standings after older rounds no longer change, so the live copy is reused for them. Only for files the live
    // copy actually has: one it lacks (for example after a rate-limited run) is fetched from Jolpica this time.
    const old = round < last - 1;
    for (const kind of ['driverstandings', 'constructorstandings']) {
      const pq = `${label}/${round}/${kind}/?limit=100`;
      await get(pq, { reuseOnly: reuseOnly || (old && !!previous?.keys.includes(mirrorKey(pq))) });
    }
  }
  // Race pages ask for one round at a time.
  for (const r of racesOf(schedule)) {
    if (results) store(`${label}/${r.round}/results/?limit=100`, roundAnswer(year, r.round, results.races.find((x) => x.round === r.round)));
    if (sprints) store(`${label}/${r.round}/sprint/?limit=100`, roundAnswer(year, r.round, sprints.races.find((x) => x.round === r.round)));
    if (quali) store(`${label}/${r.round}/qualifying/?limit=100`, roundAnswer(year, r.round, quali.races.find((x) => x.round === r.round)));
  }
  const complete = racesOf(schedule).length > 0 && done.length === racesOf(schedule).length;
  return { year, complete };
}

/** The same files under the year as well as "current" (the app asks by year after choosing a season). */
function copyCurrentTo(year) {
  for (const [key, data] of [...keys]) {
    if (!key.startsWith('current/')) continue;
    const file = join(OUT, year + key.slice('current'.length));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data));
    keys.set(year + key.slice('current'.length), data);
  }
}

try {
  if (SITE !== '/') previous = await getJson(`${SITE}data/jolpica/manifest.json`, 15_000).catch(() => null);
  const cur = await season('current');
  if (!cur) {
    console.log('No data from Jolpica and no earlier copy: nothing written, the app will ask Jolpica directly.');
    process.exit(0);
  }
  copyCurrentTo(cur.year);
  const prevYear = String(Number(cur.year) - 1);
  // A finished season never changes: reuse the live copy once it is complete.
  const prevDone = previous?.complete?.includes(prevYear);
  const prev = await season(prevYear, { reuseOnly: !!prevDone });
  const manifest = {
    // Jolpica's data is shared under CC BY-NC-SA 4.0: this copy is credited to Jolpica-F1, non-commercial and under the same licence.
    source: 'Jolpica-F1 (https://github.com/jolpica/jolpica-f1)',
    licence: 'CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)',
    generatedAt: new Date().toISOString(),
    current: cur.year,
    complete: [cur.complete && cur.year, prev?.complete && prevYear].filter(Boolean),
    // When Jolpica was down for this run, the files are the earlier copy: keep its date so the app knows how old it is.
    dataFrom: fetched ? new Date().toISOString() : (previous?.dataFrom ?? previous?.generatedAt ?? null),
    keys: [...keys.keys()].sort(),
  };
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest));
  console.log(`Copy of Jolpica data: ${manifest.keys.length} files (${fetched} fetched, ${reused} reused from the live site, ${missing} missing). Data from ${manifest.dataFrom}.`);
} catch (err) {
  // Never block a deploy: without a manifest the app asks Jolpica directly.
  console.log(`Copy of Jolpica data not made: ${err.message}`);
}
