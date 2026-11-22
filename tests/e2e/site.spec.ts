import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

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
