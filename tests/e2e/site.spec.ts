import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

const HAR = 'tests/fixtures/api.har.zip';
const PRACTICE_HAR = 'tests/fixtures/practice.har.zip';
const APIS = /api\.openf1\.org|api\.jolpi\.ca|multiviewer\.app|open-meteo\.com/;
// The recording was made at this moment: after the Las Vegas race, with OpenF1 open again.
const AFTER_RACE = new Date('2026-11-22T08:00:00Z');

async function setUp(page: Page, at = AFTER_RACE, settings?: object) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (settings) await page.addInitScript((s) => localStorage.setItem('pitwall:settings', JSON.stringify(s)), settings);
  await page.clock.install({ time: at });
  await page.routeFromHAR(HAR, { url: APIS, notFound: 'abort' });
  // Practice 3, recorded separately; tried first, anything it lacks falls through to the main recording.
  await page.routeFromHAR(PRACTICE_HAR, { url: /api\.openf1\.org/, notFound: 'fallback' });
  // Standings after round 20, which the provisional Las Vegas results build on (asked for after the recording was made).
  for (const kind of ['driverstandings', 'constructorstandings']) {
    await page.route(`https://api.jolpi.ca/ergast/f1/current/20/${kind}/?limit=100`, (r) => r.fulfill({ path: `tests/fixtures/r20-${kind}.json`, headers: { 'access-control-allow-origin': '*' } }));
  }
  return errors;
}

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

async function pickSession(page: Page, name: string) {
  const sel = page.locator('.session-bar select');
  const value = await sel.locator('option').evaluateAll((os, n) => os.find((o) => (o.textContent ?? '').startsWith(n))!.getAttribute('value'), name);
  await sel.selectOption(value!);
}

for (const [route, text] of [
  ['#/', 'Las Vegas'],
  ['#/standings', "Drivers' Championship"],
  ['#/calendar', 'Calendar'],
  ['#/drivers', 'Drivers'],
  ['#/race/21', 'Las Vegas Grand Prix'],
  ['#/driver/VER', 'Verstappen'],
  ['#/team/ferrari', 'Ferrari'],
  ['#/settings', 'Settings'],
  ['#/help', 'How to use Pit Wall'],
  ['#/review', 'season review'],
] as const) {
  test(`page ${route} loads without errors or sideways scrolling`, async ({ page }) => {
    const errors = await setUp(page);
    await page.goto(route);
    await expect(page.locator('main')).toContainText(text, { timeout: 20_000 });
    await noSidewaysScroll(page);
    expect(errors).toEqual([]);
  });
}

test('Live Timing: the finished race has gaps, charts, pit stops and strategy', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/live');
  const rows = page.locator('table.timing tbody tr');
  await expect(rows).toHaveCount(22, { timeout: 30_000 });
  await expect(page.locator('.session-bar')).toContainText('FINISHED');
  await expect(rows.nth(1)).toContainText(/\+\d+\.\d{3}/);
  await expect(page.locator('section[aria-labelledby="positions"] svg.pos-chart path')).toHaveCount(10, { timeout: 20_000 });
  await expect(page.locator('section[aria-labelledby="pitstops"] tbody tr').first()).toBeVisible();
  await expect(page.locator('.strategy-row:not(.axis)')).toHaveCount(22);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('Live Timing: qualifying shows the knockout view', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/live');
  await expect(page.locator('table.timing tbody tr')).toHaveCount(22, { timeout: 30_000 });
  await pickSession(page, 'Qualifying');
  await expect(page.locator('table.timing th', { hasText: 'Q3' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.pit-pill.knocked', { hasText: 'OUT Q1' })).toHaveCount(6);
  await expect(page.locator('.pit-pill.knocked', { hasText: 'OUT Q2' })).toHaveCount(6);
  await expect(page.locator('.session-bar')).toContainText('Final classification');
  expect(errors).toEqual([]);
});

test('Live Timing: practice shows long runs', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/live');
  await expect(page.locator('table.timing tbody tr')).toHaveCount(22, { timeout: 30_000 });
  await pickSession(page, 'Practice 3');
  await expect.poll(() => page.locator('.longruns tbody tr').count(), { timeout: 30_000 }).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('spoiler-free mode covers the weekend until revealed', async ({ page }) => {
  const errors = await setUp(page, AFTER_RACE, { spoilerFree: true });
  await page.goto('#/standings');
  await expect(page.locator('.spoiler-cover').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('.spoiler-cover button').first().click();
  await expect(page.locator('.spoiler-cover')).toHaveCount(0);
  await expect(page.locator('main')).toContainText("Drivers' Championship");
  expect(errors).toEqual([]);
});

test('calendar download is a valid .ics file', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/calendar');
  const button = page.locator('.cal-btn').first();
  await expect(button).toBeVisible({ timeout: 20_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const ics = readFileSync(await download.path(), 'utf8');
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  expect(ics.match(/BEGIN:VEVENT/g)?.length).toBeGreaterThan(0);
  expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  expect(errors).toEqual([]);
});

test('during a live race with OpenF1 paused, Live Timing reads F1\'s feed', async ({ page }) => {
  const snapshot = JSON.parse(readFileSync('tests/fixtures/feed-snapshot.json', 'utf8'));
  // Mid-race: OpenF1 refuses free requests then, so nothing it would be asked for is in the recording.
  const errors = await setUp(page, new Date('2026-11-22T04:30:00Z'));
  await page.routeWebSocket(/livetiming\.formula1\.com/, (ws) => {
    ws.onMessage((msg) => {
      for (const part of String(msg).split('\x1e')) {
        if (!part) continue;
        const m = JSON.parse(part);
        if (m.protocol) ws.send('{}\x1e');
        if (m.target === 'Subscribe') ws.send(JSON.stringify({ type: 3, invocationId: '0', result: snapshot }) + '\x1e');
      }
    });
  });
  await page.goto('#/live');
  await expect(page.locator('.feed-note')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.session-bar')).toContainText('LIVE');
  await expect.poll(() => page.locator('table.timing tbody tr').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(20);
  await expect(page.locator('table.timing th', { hasText: 'SPEED' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('when F1\'s feed drops, the last timing stays up and the status pill offers a retry', async ({ page }) => {
  const snapshot = JSON.parse(readFileSync('tests/fixtures/feed-snapshot.json', 'utf8'));
  const errors = await setUp(page, new Date('2026-11-22T04:30:00Z'));
  const sockets: { close: () => Promise<void> }[] = [];
  await page.routeWebSocket(/livetiming\.formula1\.com/, (ws) => {
    sockets.push(ws);
    ws.onMessage((msg) => {
      for (const part of String(msg).split('\x1e')) {
        if (!part) continue;
        const m = JSON.parse(part);
        if (m.protocol) ws.send('{}\x1e');
        if (m.target === 'Subscribe') ws.send(JSON.stringify({ type: 3, invocationId: '0', result: snapshot }) + '\x1e');
      }
    });
  });
  await page.goto('#/live');
  const pill = page.locator('.feed-status');
  await expect(pill).toHaveText('F1 feed live', { timeout: 30_000 });
  await sockets[0].close();
  await expect(pill).toContainText('Reconnecting');
  await expect(page.locator('table.timing tbody tr')).toHaveCount(22);
  await pill.getByRole('button', { name: 'Retry now' }).click();
  await expect(pill).toHaveText('F1 feed live');
  expect(sockets).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('the Android app download serves the APK', async ({ page, request }) => {
  const errors = await setUp(page);
  await page.goto('#/help');
  const link = page.getByRole('link', { name: /Download for Android/ });
  await expect(link).toBeVisible();
  const res = await request.get(new URL((await link.getAttribute('href'))!, page.url()).href);
  expect(res.status()).toBe(200);
  const body = await res.body();
  expect(body.subarray(0, 2).toString()).toBe('PK');
  expect(body.length).toBeGreaterThan(500_000);
  expect(errors).toEqual([]);
});

test('a decided championship shows the champions on the Dashboard and in the standings', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/');
  const banner = page.locator('.champions');
  await expect(banner).toContainText('World Champion', { timeout: 30_000 });
  await expect(banner).toContainText('Antonelli');
  await expect(banner).toContainText('decided at the Mexico City Grand Prix (round 19)');
  await expect(banner).toContainText("Constructors' Champions");
  await page.goto('#/standings');
  await expect(page.locator('.champion-tag')).toHaveCount(2, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('the season review shows highlights, drivers, team-mate battles and teams', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/review');
  await expect(page.locator('.review-tile').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.review-tiles')).toContainText('Different winners');
  await expect(page.locator('.review-tbl').first().locator('tbody tr')).toHaveCount(25, { timeout: 30_000 });
  await expect(page.locator('.review-battle')).toHaveCount(11);
  expect(errors).toEqual([]);
});

test('moving between pages shows only the new page', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/');
  await expect(page.locator('.champions')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (location.hash = '#/settings'));
  await expect(page.locator('main h1')).toHaveText('Settings');
  await expect(page.locator('.champions')).toHaveCount(0);
  await page.evaluate(() => (location.hash = '#/calendar'));
  await expect(page.locator('main h2', { hasText: 'Appearance' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a race page tells the race story', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/race/21');
  const story = page.locator('.story');
  await expect(story).toContainText('Max Verstappen leads away from pole', { timeout: 60_000 });
  await expect(story).toContainText('Battle for the lead: George Russell and Max Verstappen');
  await expect(story).toContainText('Laps 19 to 25');
  await expect(story).toContainText('+10s for Lewis Hamilton');
  await expect(story).toContainText('Max Verstappen wins');
  const before = await story.locator('li').count();
  await page.getByRole('button', { name: /Show all pit stops/ }).click();
  expect(await story.locator('li').count()).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});

test('lap times of two drivers can be compared in the race', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/race/21');
  const card = page.locator('section:has(#lapcmp)');
  await expect(card.locator('svg[role=img]')).toBeVisible({ timeout: 60_000 });
  await expect(card.getByRole('tab', { name: 'Race' })).toHaveAttribute('aria-selected', 'true');
  await expect(card.locator('select').first()).toHaveValue('3');
  await expect(card.locator('select').nth(1)).toHaveValue('1');
  await expect(card).toContainText('a lap quicker on average');
  await card.locator('select').nth(1).selectOption('81');
  await expect(card).toContainText('PIA');
  await card.getByRole('button', { name: 'Show laps as a table' }).click();
  await expect(card.locator('table tbody tr')).toHaveCount(50);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('the light theme can be picked in Settings and is kept', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/settings');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(11, 13, 16)');
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'light');
  expect(await bg()).toBe('rgb(244, 245, 247)');
  await page.reload();
  expect(await page.locator('html').getAttribute('data-resolved-theme')).toBe('light');
  await page.getByRole('radio', { name: 'Auto' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'auto');
  expect(errors).toEqual([]);
});

/** Responses the recording does not have: car data and positions for both fastest laps, and a Wikipedia summary. */
async function extraFixtures(page: Page) {
  await page.route(/api\.openf1\.org\/v1\/(car_data|location)\?/, (r) => {
    const u = new URL(r.request().url());
    const file = `tests/fixtures/extra/${u.pathname.split('/').pop()}-${u.searchParams.get('driver_number')}.json`;
    // Other car data and positions (such as the sector lines' lap) come from the recording.
    return existsSync(file) && u.searchParams.get('session_key') === '11420' ? r.fulfill({ path: file, headers: { 'access-control-allow-origin': '*' } }) : r.fallback();
  });
  await page.route(/en\.wikipedia\.org\/api\/rest_v1\/page\/summary\//, (r) =>
    /Max_Verstappen/.test(r.request().url()) ? r.fulfill({ path: 'tests/fixtures/extra/wiki-Max_Verstappen.json', headers: { 'access-control-allow-origin': '*' } }) : r.fulfill({ status: 404, body: '{}' }),
  );
  await page.route(/upload\.wikimedia\.org/, (r) => r.abort());
}

test('fastest laps of two drivers can be compared point by point', async ({ page }) => {
  const errors = await setUp(page);
  await extraFixtures(page);
  await page.goto('#/race/21');
  const card = page.locator('section:has(#lapcmp)');
  await card.getByRole('tab', { name: /Fastest laps/ }).click({ timeout: 60_000 });
  await expect(card).toContainText('NOR 0.268 s quicker', { timeout: 60_000 });
  await expect(card.locator('.trace-grid svg')).toHaveCount(2);
  await expect(card.locator('.legend')).toContainText('VER quicker');
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('a race page ranks race pace with each stint and its tyre wear', async ({ page }) => {
  const errors = await setUp(page);
  await page.goto('#/race/21');
  const card = page.locator('section:has(#pace)');
  await expect(card.locator('tbody tr').first()).toContainText('PIA', { timeout: 60_000 });
  await expect(card.locator('tbody tr').first()).toContainText('Best');
  await expect(card.locator('tbody tr')).toHaveCount(10);
  await card.getByRole('button', { name: /Show all/ }).click();
  expect(await card.locator('tbody tr').count()).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('driver pages show a short biography from Wikipedia, with credit', async ({ page }) => {
  const errors = await setUp(page);
  await extraFixtures(page);
  await page.goto('#/driver/VER');
  const about = page.locator('section:has(.wiki)');
  await expect(about).toContainText('Max Emilian Verstappen', { timeout: 60_000 });
  await expect(about.getByRole('link', { name: /Wikipedia/ })).toHaveAttribute('href', /wikipedia\.org\/wiki\/Max_Verstappen/);
  expect(errors).toEqual([]);
});
