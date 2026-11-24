/**
 * Pit Wall's copy of the driver photos used on driver cards: each driver's lead photo on Wikipedia when it is a freely
 * licensed image on Wikimedia Commons, saved at 500 px with its author and licence. Published with the site under
 * data/photos/, so cards do not ask Wikipedia and Commons for 25 photos on every visit.
 *
 *   node scripts/mirror-photos.mjs <output folder> [live site URL] [Jolpica copy folder]
 *
 * The driver list comes from the Jolpica copy made just before (current driver standings, which also link each
 * driver's Wikipedia article). Photos already on the live site are reused, so a normal run only looks for new drivers.
 * A photo is kept only when Commons names a licence that allows reuse with credit (Creative Commons, public domain or
 * the Open Government Licence); anything else is left out and the card shows a silhouette. Never stops a deploy.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'dist/data/photos';
const SITE = (process.argv[3] ?? '').replace(/\/?$/, '/');
const JOLPICA = process.argv[4] ?? 'dist/data/jolpica';
const USER_AGENT = 'PitWall/1.0 (https://github.com/Sarthak125/Pit-wall; fan project, non-commercial)';
const SPACING_MS = 1200;
const LIMIT = Number(process.env.PHOTOS_LIMIT ?? 100);
const ALLOWED = /^(CC BY|CC BY-SA|CC0|Public domain|PD|OGL)/i;

const sleep = (ms) => new Promise((f) => setTimeout(f, ms));
let last = 0;
async function polite(url, { binary = false, timeout = 30_000 } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = last + SPACING_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: binary ? 'image/*' : 'application/json' }, signal: AbortSignal.timeout(timeout) });
    if (res.status === 429 && attempt < 3) { await sleep(10_000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return binary ? Buffer.from(await res.arrayBuffer()) : res.json();
  }
}

const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function previousManifest() {
  if (SITE === '/') return null;
  try {
    return await (await fetch(`${SITE}data/photos/manifest.json`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) })).json();
  } catch {
    return null;
  }
}

async function findPhoto(wikiUrl) {
  const title = wikiUrl?.match(/wikipedia\.org\/wiki\/([^?#]+)/)?.[1];
  if (!title) return null;
  const summary = await polite(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const thumb = summary?.thumbnail?.source;
  const file = thumb?.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//)?.[1];
  if (!file) return null; // no lead photo, or one that is not on Commons (so not freely licensed)
  const name = decodeURIComponent(file);
  const meta = await polite(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist%7CLicenseShortName&titles=${encodeURIComponent(`File:${name}`)}`);
  const md = Object.values(meta?.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata;
  const licence = strip(md?.LicenseShortName?.value);
  if (!licence || !ALLOWED.test(licence)) return { skipped: `licence "${licence || 'unknown'}"` };
  const image = await polite(thumb.split('?')[0].replace(/\/\d+px-/, '/500px-'), { binary: true });
  if (image.length < 2_000) return { skipped: 'image too small' };
  return { image, entry: { title: name.replace(/_/g, ' '), artist: strip(md?.Artist?.value).slice(0, 80), licence, page: `https://commons.wikimedia.org/wiki/File:${file}` } };
}

try {
  const standings = JSON.parse(readFileSync(join(JOLPICA, 'current/driverstandings/limit-100.json'), 'utf8'));
  const drivers = (standings.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings ?? []).map((s) => s.Driver).slice(0, LIMIT);
  const previous = await previousManifest();
  mkdirSync(OUT, { recursive: true });
  const photos = {};
  let fetched = 0, reused = 0, skipped = 0, failures = 0;
  for (const d of drivers) {
    const old = previous?.photos?.[d.driverId];
    if (old) {
      try {
        const res = await fetch(`${SITE}data/photos/${d.driverId}.jpg`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
        if (res.ok) { writeFileSync(join(OUT, `${d.driverId}.jpg`), Buffer.from(await res.arrayBuffer())); photos[d.driverId] = old; reused++; continue; }
      } catch { /* fall through and look for it again */ }
    }
    if (failures >= 3) { skipped++; continue; }
    try {
      const found = await findPhoto(d.url);
      if (found?.image) {
        writeFileSync(join(OUT, `${d.driverId}.jpg`), found.image);
        photos[d.driverId] = { file: `${d.driverId}.jpg`, ...found.entry };
        fetched++;
        failures = 0;
      } else {
        skipped++;
        if (found?.skipped) console.log(`No photo for ${d.driverId}: ${found.skipped}`);
      }
    } catch (err) {
      failures++;
      skipped++;
      console.log(`Photo for ${d.driverId} not fetched: ${err.message}`);
    }
  }
  if (!Object.keys(photos).length) {
    console.log('No driver photos and no earlier copy: nothing written, cards show silhouettes.');
    process.exit(0);
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
    // Each photo is credited to its author under its own licence (listed per photo); the files come from Wikimedia Commons.
    source: 'Wikimedia Commons (https://commons.wikimedia.org)',
    generatedAt: new Date().toISOString(),
    photos,
  }));
  console.log(`Driver photos: ${Object.keys(photos).length} (${fetched} fetched, ${reused} reused from the live site, ${skipped} without a freely licensed photo or not fetched).`);
} catch (err) {
  console.log(`Driver photos not made: ${err.message}`);
}
