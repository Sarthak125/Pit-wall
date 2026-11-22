/**
 * Off-season check: how the site behaves between seasons, with the date and Jolpica's answers faked for each stage
 * (everything else is real data). Needs the built site running (for example `npx vite preview --port 4173`) and
 * network access.
 *
 *   node tests/manual/offseason.cjs [output folder] [site URL, default http://localhost:4173/]
 *
 * A:  8 Dec 2026, the season is over and there is no 2027 calendar yet.
 * A2: 15 Dec 2026, the 2027 calendar is out (the 2026 one moved a year on, as sample data).
 * B:  20 Jan 2027, Jolpica's "current" season is 2027, with a calendar but no races run.
 * C:  5 Jan 2027, "current" is 2027 and has no calendar yet.
 *
 * Prints what the Dashboard, Standings, Calendar and Settings show at each stage and saves screenshots.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'offseason-check';
const SITE = process.argv[3] || 'http://localhost:4173/';
fs.mkdirSync(OUT, { recursive: true });

const SESSIONS = ['FirstPractice', 'SecondPractice', 'ThirdPractice', 'Qualifying', 'Sprint', 'SprintQualifying', 'SprintShootout'];
const nextYear = (d) => d && { ...d, date: String(Number(d.date.slice(0, 4)) + 1) + d.date.slice(4) };
const emptyRaces = (season) => ({ MRData: { limit: '100', offset: '0', total: '0', RaceTable: { season, Races: [] } } });
const emptyStandings = (season) => ({ MRData: { limit: '100', offset: '0', total: '0', StandingsTable: { season, StandingsLists: [] } } });

(async () => {
  const base = await (await fetch('https://api.jolpi.ca/ergast/f1/2026/races/?limit=100')).json();
  const races2027 = base.MRData.RaceTable.Races.map((r) => {
    const o = { ...r, season: '2027', date: nextYear({ date: r.date }).date };
    for (const k of SESSIONS) if (r[k]) o[k] = nextYear(r[k]);
    return o;
  });
  const calendar2027 = { MRData: { limit: '100', offset: '0', total: String(races2027.length), RaceTable: { season: '2027', Races: races2027 } } };
  const stages = {
    A: { at: '2026-12-08T10:00:00Z', current: null, y2027: emptyRaces('2027') },
    A2: { at: '2026-12-15T10:00:00Z', current: null, y2027: calendar2027 },
    B: { at: '2027-01-20T10:00:00Z', current: 'with-calendar', y2027: calendar2027 },
    C: { at: '2027-01-05T10:00:00Z', current: 'no-calendar', y2027: emptyRaces('2027') },
  };

  const browser = await chromium.launch();
  for (const [name, st] of Object.entries(stages)) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.clock.install({ time: new Date(st.at) });
    await p.route(/api\.jolpi\.ca\/ergast\/f1\//, (route) => {
      const m = new URL(route.request().url()).pathname.match(/\/ergast\/f1\/(current|2027)\/(.*)$/);
      if (!m) return route.continue();
      const [, season, rest] = m;
      if (season === '2027' && rest.startsWith('races')) return route.fulfill({ json: st.y2027 });
      if (season === 'current' && st.current) {
        if (rest.startsWith('races')) return route.fulfill({ json: st.current === 'with-calendar' ? calendar2027 : emptyRaces('2027') });
        return route.fulfill({ json: /standings/.test(rest) ? emptyStandings('2027') : emptyRaces('2027') });
      }
      if (season === '2027') return route.fulfill({ json: /standings/.test(rest) ? emptyStandings('2027') : emptyRaces('2027') });
      return route.continue();
    });
    const visit = async (hash, file, wait) => {
      await p.goto(SITE + hash);
      await p.waitForTimeout(wait);
      await p.screenshot({ path: path.join(OUT, `${name}-${file}.png`) });
      return (await p.locator('main').innerText()).replace(/\s+/g, ' ');
    };
    const dashboard = await visit('#/', 'dashboard', 14_000);
    const picker = await p.locator('.topbar select').first().evaluate((s) => [...s.options].map((o) => o.text).join(', '));
    const standings = await visit('#/standings', 'standings', 9_000);
    const calendar = await visit('#/calendar', 'calendar', 6_000);
    const review = await visit('#/review', 'review', 12_000);
    await p.goto(SITE + '#/settings');
    await p.waitForTimeout(5_000);
    const selects = await p.locator('select').evaluateAll((ss) => ss.map((s) => s.options.length));
    console.log(`\n=== ${name} (${st.at})`);
    console.log('season picker:', picker);
    console.log('dashboard:', dashboard.slice(0, 420));
    console.log('standings:', standings.slice(0, 200));
    console.log('calendar:', calendar.slice(0, 160));
    console.log('review:', review.slice(0, 200));
    console.log('settings select sizes:', selects.join(','), '| errors:', errors.length ? errors : 'none');
    await ctx.close();
  }
  await browser.close();
})();
