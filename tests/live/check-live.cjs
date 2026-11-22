/**
 * Live check: run during a real session to confirm Live Timing works on the live site.
 *
 *   node tests/live/check-live.cjs [site URL] [output folder]
 *
 * Opens Live Timing on a laptop and a phone viewport, watches for a minute, and reports what a visitor would see:
 * whether F1's live feed connects and sends data, the feed status pill, the timing tower filling in and updating,
 * the Dashboard's LIVE banner, sideways scrolling and any errors. Prints a summary and writes screenshots.
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = process.argv[2] || 'https://sarthak125.github.io/Pit-wall/';
const OUT = process.argv[3] || path.join(process.cwd(), 'live-check');
fs.mkdirSync(OUT, { recursive: true });

const tower = (p) => p.locator('table.timing tbody tr').evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, ' ').trim()));

(async () => {
  const browser = await chromium.launch();
  const report = { site: SITE, at: new Date().toISOString(), laptop: {}, phone: {}, problems: [] };

  // Laptop: Live Timing for a minute.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const feed = { opened: 0, frames: 0, closed: 0 };
  p.on('websocket', (ws) => {
    if (!/livetiming\.formula1\.com/.test(ws.url())) return;
    feed.opened++;
    ws.on('framereceived', () => feed.frames++);
    ws.on('close', () => feed.closed++);
  });
  await p.goto(SITE + '#/live');
  await p.waitForTimeout(20_000);
  const bar = (await p.locator('.session-bar').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const pill = await p.locator('.feed-status').innerText().catch(() => '(no feed status pill)');
  const note = await p.locator('.feed-note').count();
  const paused = await p.locator('.of1-blocked').count();
  const t0 = await tower(p);
  await p.screenshot({ path: path.join(OUT, 'live-laptop-start.png') });
  await p.waitForTimeout(60_000);
  const t1 = await tower(p);
  const pill1 = await p.locator('.feed-status').innerText().catch(() => '(no feed status pill)');
  await p.screenshot({ path: path.join(OUT, 'live-laptop-after-1min.png'), fullPage: true });
  const changed = t0.filter((row, i) => row !== t1[i]).length;
  report.laptop = {
    sessionBar: bar.slice(0, 160),
    live: /\bLIVE\b/.test(bar),
    feedNote: note > 0,
    openf1PausedNotice: paused > 0,
    feedStatus: { start: pill.trim(), afterOneMinute: pill1.trim() },
    f1Feed: feed,
    towerRows: { start: t0.length, afterOneMinute: t1.length, rowsChangedInOneMinute: changed },
    overflow: await p.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    errors,
  };

  // Dashboard LIVE banner.
  await p.goto(SITE + '#/');
  await p.waitForTimeout(8_000);
  report.laptop.dashboardLiveBanner = (await p.locator('main').innerText()).includes('LIVE');
  await p.screenshot({ path: path.join(OUT, 'dashboard-laptop.png') });

  // Phone: Live Timing layout.
  const phone = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  const phoneErrors = [];
  phone.on('pageerror', (e) => phoneErrors.push(e.message));
  await phone.goto(SITE + '#/live');
  await phone.waitForTimeout(20_000);
  report.phone = {
    feedStatus: (await phone.locator('.feed-status').innerText().catch(() => '(no feed status pill)')).trim(),
    towerRows: (await tower(phone)).length,
    overflow: await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    headerOverflow: await phone.evaluate(() => { const h = document.querySelector('.topbar'); return h ? h.scrollWidth - h.clientWidth : 0; }),
    errors: phoneErrors,
  };
  await phone.screenshot({ path: path.join(OUT, 'live-phone.png') });

  // What would worry a visitor.
  const L = report.laptop;
  if (!L.live) report.problems.push('Session bar does not show LIVE');
  if (L.openf1PausedNotice) report.problems.push('Shows the "OpenF1 paused" notice instead of live timing (F1 feed not used)');
  if (!L.f1Feed.opened) report.problems.push('F1 live feed connection never opened');
  else if (L.f1Feed.frames < 3) report.problems.push(`F1 live feed opened but sent only ${L.f1Feed.frames} messages`);
  if (!/F1 feed live/.test(L.feedStatus.afterOneMinute)) report.problems.push(`Feed status after a minute: "${L.feedStatus.afterOneMinute}"`);
  if (L.towerRows.start < 15) report.problems.push(`Timing tower has only ${L.towerRows.start} rows`);
  if (!L.towerRows.rowsChangedInOneMinute) report.problems.push('Timing tower did not change in a minute');
  if (!L.dashboardLiveBanner) report.problems.push('Dashboard has no LIVE banner');
  if (L.overflow > 1 || report.phone.overflow > 1 || report.phone.headerOverflow > 1) report.problems.push('Sideways scrolling');
  if (L.errors.length || report.phone.errors.length) report.problems.push('Page errors: ' + [...L.errors, ...report.phone.errors].join(' | ').slice(0, 300));

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(report.problems.length ? `\n${report.problems.length} PROBLEM(S) FOUND` : '\nALL GOOD');
  await browser.close();
})();
