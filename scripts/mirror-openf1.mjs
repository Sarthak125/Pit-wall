/**
 * Pit Wall's own copy of OpenF1 data for sessions that have finished: drivers, laps, stints, pit stops, race control
 * messages, results and starting grids of this season's weekends. Finished sessions never change, so the app reads
 * these files first (src/api/openf1Mirror.ts): race pages open at once, spend none of OpenF1's 30 requests a minute,
 * and still work while OpenF1 is slow or refusing requests. Car data and location (large) are not copied.
 *
 *   node scripts/mirror-openf1.mjs <output folder> [live site URL]
 *
 * Files already on the live site are reused (a session that ended more than 2 days ago is not asked of OpenF1 again),
 * so each run only fetches what is new, newest weekend first. A run stops when OpenF1 refuses (401, 403, 429), is
 * down, or the time budget is spent; the next run, a few hours later, carries on. If nothing can be written, the app
 * simply asks OpenF1 as before.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { openf1Key } from '../src/lib/mirrorKey.ts';

const OUT = process.argv[2] ?? 'dist/data/openf1';
const SITE = (process.argv[3] ?? '').replace(/\/?$/, '/');
/** OPENF1_API: another address for the API (for testing against recorded answers). */
const API = process.env.OPENF1_API ?? 'https://api.openf1.org/v1';
/** Free tier: 3 requests a second and 30 a minute. One every 2.2 s stays under both. */
const SPACING_MS = Number(process.env.OPENF1_SPACING_MS ?? 2200);
/** How long a run may spend asking OpenF1 (the workflow step allows 20 minutes). */
const BUDGET_MS = Number(process.env.OPENF1_BUDGET_MS ?? 14 * 60_000);
const TIMEOUT_MS = 30_000;
/** A session's data is complete this long after it ends; reuse of the live copy starts this long after. */
const SETTLE_MS = 3 * 3_600_000;
const REUSE_AFTER_MS = 2 * 24 * 3_600_000;
const USER_AGENT = 'PitWall/1.0';

const sleep = (ms) => new Promise((f) => setTimeout(f, ms));
const started = Date.now();
const keys = new Set();
let fetched = 0, reused = 0, missing = 0, lastCall = 0, stopped = '';

async function getJson(url, timeout = TIMEOUT_MS) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeout) });
  if (res.status === 404) return []; // OpenF1 answers 404 "No results found" for an empty list
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function store(key, rows) {
  const file = join(OUT, key);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(rows));
  keys.add(key);
}

/** OpenF1's answer. Throws (and sets `stopped`) when it is time to stop asking for this run. */
async function fromOpenF1(endpoint, param, value) {
  if (stopped) throw new Error(stopped);
  if (Date.now() - started > BUDGET_MS) { stopped = 'time budget spent'; throw new Error(stopped); }
  const wait = lastCall + SPACING_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  try {
    return await getJson(`${API}/${endpoint}?${param}=${value}`);
  } catch (err) {
    if (/^(401|403|429|5\d\d) /.test(err.message) || err.name === 'TimeoutError' || /fetch failed/.test(err.message)) {
      stopped = `OpenF1: ${err.message}`;
    }
    throw err;
  }
}

let previous = null;
async function previousCopy(key) {
  if (!previous?.keys.includes(key)) return undefined;
  try {
    return await getJson(`${SITE}data/openf1/${key}`, 15_000);
  } catch {
    return undefined;
  }
}

/** One file: the live copy if the session is old enough, else OpenF1. */
async function get(endpoint, param, value, { reuse }) {
  const key = openf1Key(endpoint, { [param]: value });
  if (reuse) {
    const old = await previousCopy(key);
    if (old !== undefined) { reused++; store(key, old); return old; }
  }
  try {
    const rows = await fromOpenF1(endpoint, param, value);
    fetched++;
    store(key, rows);
    return rows;
  } catch (err) {
    if (!stopped) console.log(`OpenF1 ${endpoint} ${param}=${value}: ${err.message}`);
    // Keep the earlier copy of a file that could not be refreshed, whatever the session's age.
    const old = await previousCopy(key);
    if (old !== undefined) { reused++; store(key, old); return old; }
    missing++;
    return undefined;
  }
}

/** The files each kind of session gets: what the race, qualifying and practice pages use. */
function endpointsFor(name) {
  if (/qualifying|shootout/i.test(name)) return ['drivers', 'session_result', 'starting_grid', 'laps', 'race_control'];
  if (/race|sprint/i.test(name)) return ['drivers', 'session_result', 'laps', 'stints', 'pit', 'race_control'];
  return ['drivers', 'stints', 'laps'];
}
const order = (name) => (/^race$/i.test(name) ? 0 : /qualifying/i.test(name) && !/sprint/i.test(name) ? 1 : /sprint/i.test(name) ? 2 : 3);

try {
  if (SITE !== '/') previous = await getJson(`${SITE}data/openf1/manifest.json`, 15_000).catch(() => null);
  const year = new Date().getUTCFullYear();
  let sessions = [];
  for (const y of [year, year - 1]) {
    try {
      sessions = (await fromOpenF1('sessions', 'year', y)).filter((s) => s.session_key && s.date_end);
    } catch (err) {
      console.log(`OpenF1 sessions for ${y}: ${err.message}`);
    }
    if (sessions.some((s) => Date.parse(s.date_end) + SETTLE_MS < Date.now())) break;
  }
  if (!sessions.length && previous) {
    // OpenF1 cannot be reached: carry the live site's copy over file by file, so a run never makes the copy worse.
    const todo = [...previous.keys];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let key; (key = todo.shift()); ) {
        const old = await previousCopy(key);
        if (old !== undefined) { reused++; store(key, old); } else missing++;
      }
    }));
  }
  const finished = sessions.filter((s) => Date.parse(s.date_end) + SETTLE_MS < Date.now());
  // Weekends newest first; within a weekend the race first.
  const byMeeting = new Map();
  for (const s of finished) byMeeting.set(s.meeting_key, [...(byMeeting.get(s.meeting_key) ?? []), s]);
  const meetings = [...byMeeting.entries()].sort((a, b) => b[1][0].date_start.localeCompare(a[1][0].date_start));
  for (const [meetingKey, list] of meetings) {
    list.sort((a, b) => order(a.session_name) - order(b.session_name) || a.date_start.localeCompare(b.date_start));
    for (const s of list) {
      const reuse = Date.now() - Date.parse(s.date_end) > REUSE_AFTER_MS;
      for (const endpoint of endpointsFor(s.session_name)) await get(endpoint, 'session_key', s.session_key, { reuse });
    }
    // A weekend's session list only once every session of the weekend has finished (so it is complete).
    const all = sessions.filter((s) => s.meeting_key === meetingKey);
    if (all.length === list.length) {
      const key = openf1Key('sessions', { meeting_key: meetingKey });
      store(key, all);
    }
  }
  if (!keys.size) {
    console.log('No OpenF1 data and no earlier copy: nothing written, the app will ask OpenF1 directly.');
    process.exit(0);
  }
  const manifest = {
    // OpenF1 states on its site that its content is licensed CC BY-NC-SA 4.0; this copy is credited to OpenF1 and non-commercial.
    source: 'OpenF1 (https://openf1.org)',
    licence: 'CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)',
    generatedAt: new Date().toISOString(),
    keys: [...keys].sort(),
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest));
  console.log(`Copy of OpenF1 data: ${keys.size} files (${fetched} fetched, ${reused} reused from the live site, ${missing} missing)${stopped ? `; stopped early: ${stopped}` : ''}.`);
} catch (err) {
  // Never block a deploy: without a manifest the app asks OpenF1 directly.
  console.log(`Copy of OpenF1 data not made: ${err.message}`);
}
