import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Accessibility: every page, in the dark and light themes, checked with axe against WCAG 2.1 A and AA. */
const HAR = 'tests/fixtures/api.har.zip';
const PRACTICE_HAR = 'tests/fixtures/practice.har.zip';
const APIS = /api\.openf1\.org|api\.jolpi\.ca|multiviewer\.app|open-meteo\.com/;
const AFTER_RACE = new Date('2026-11-22T08:00:00Z');

async function setUp(page: Page, theme: string) {
  await page.addInitScript((t) => localStorage.setItem('pitwall:settings', JSON.stringify({ theme: t, favoriteDriver: 'HAM', favoriteName: 'Lewis Hamilton', favoriteTeam: 'ferrari', favoriteTeamName: 'Ferrari' })), theme);
  await page.clock.install({ time: AFTER_RACE });
  await page.routeFromHAR(HAR, { url: APIS, notFound: 'abort' });
  await page.routeFromHAR(PRACTICE_HAR, { url: /api\.openf1\.org/, notFound: 'fallback' });
  for (const kind of ['driverstandings', 'constructorstandings']) {
    await page.route(`https://api.jolpi.ca/ergast/f1/current/20/${kind}/?limit=100`, (r) => r.fulfill({ path: `tests/fixtures/r20-${kind}.json`, headers: { 'access-control-allow-origin': '*' } }));
  }
}

const PAGES: [string, string, string?][] = [
  ['Dashboard', '#/'],
  ['Live Timing', '#/live'],
  ['Standings', '#/standings'],
  ['Calendar', '#/calendar'],
  ['Calendar Month', '#/calendar', 'Month'],
  ['Calendar Table', '#/calendar', 'Table'],
  ['Drivers', '#/drivers'],
  ['Driver page', '#/driver/HAM'],
  ['Team page', '#/team/ferrari'],
  ['Race page', '#/race/21'],
  ['Settings', '#/settings'],
  ['How to use', '#/help'],
  ['Season review', '#/review'],
];

for (const theme of ['dark', 'light']) {
  for (const [name, hash, tab] of PAGES) {
    test(`${name} (${theme}) has no WCAG A or AA problems axe can find`, async ({ page }) => {
      await setUp(page, theme);
      await page.goto(hash);
      await page.locator('main').waitFor();
      if (tab) await page.getByRole('tab', { name: tab, exact: true }).click({ timeout: 40_000 });
      // Let the data arrive and the page settle.
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const found = res.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.slice(0, 20).map((n) => `    ${n.target.join(' ')}  ${n.failureSummary?.split('\n').slice(1, 2).join('') ?? ''}`).join('\n')}${v.nodes.length > 20 ? `\n    …and ${v.nodes.length - 20} more` : ''}`);
      expect(found, found.join('\n')).toEqual([]);
    });
  }
}
