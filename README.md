# Pit Wall: F1 dashboard

An installable web app (PWA) for Formula 1: live timing, FIA race control and stewards' messages, standings, calendar, drivers, and a personal page for your favourite driver and team. One codebase runs in a laptop browser and installs on an Android tablet like an app.

Live site: https://sarthak125.github.io/Sarthak125/

Unofficial fan project. Not affiliated with Formula 1, the FIA or any team.

## Features

### Dashboard

- Next race card with a live countdown to lights out and the weekend schedule (practice, sprint, qualifying, race) marked Done, Live, Next or Upcoming.
- Track conditions from the latest session: air and track temperature, humidity, wind, pressure, rain, and track status (green, yellow, safety car, red, chequered) while a session is live.
- Drivers' and Constructors' Championship tables.
- Title fight chart: cumulative points after each round for the top four, plus your favourite driver.
- Last race podium and fastest lap.
- Season calendar strip.
- "Your driver" and "Your team" strips when favourites are set.

### Live Timing

- Pick any session of the current race weekend; live sessions update automatically.
- Session bar: lap (in races, "lap 35/51" and laps left; the total is the distance run in the latest race or sprint at that circuit, since no free source publishes the planned lap count), elapsed time in races or time left in practice and qualifying, pit stop time loss at this circuit (normal, and under safety car and virtual safety car; MultiViewer's estimate), track and air temperature, humidity, wind speed and direction, rain, and track status.
- Before a race or sprint starts, the session shows as **UPCOMING** with a countdown, and the tower lists the official starting grid (penalties included, from the matching qualifying session; qualifying results until the grid is published) with each driver's qualifying lap. Once the race is running, the **DIFF** column shows places gained (green ↑) or lost (red ↓) against the starting grid.
- Timing tower, all in one table: position, gap, interval, last lap, best lap (the session's fastest lap highlighted in purple), and each sector time with a mini-sector bar underneath (yellow, green for a personal best, purple for the overall best, blue in the pit lane). While live, the sectors fill in as each car goes round, the last-lap column shows **IN PIT** or **PIT OUT** when a car is in the pit lane and **STOP** when it is stopped out on track (0 km/h), and each row shows the car's current speed with throttle and brake bars. **RETIRED**, **DNS** and **DSQ** come from the official classification (checked every minute while live), and those rows are dimmed; in a race, a stopped or parked car that has not started a lap for 4 minutes while others have is also marked RETIRED until the official result arrives. The INT column only appears in races. After a session, the sectors show each driver's last lap. Speed and pedals come only from live data; with none, they show 0. The tyre history column lists every set used, oldest first, each as its age in laps followed by the tyre (for example "3 S  33 M"), with the current set in bold.
- **Track map**: the circuit with numbered turns and the start/finish line, and every car moving on it in team colours (your favourite driver ringed in gold, your team's cars in white). The three timing sectors are drawn in their own colours (S1 red, S2 light blue, S3 yellow, used the same way everywhere sectors appear; flagged stretches get a dashed black stripe so a yellow flag still stands out on the yellow sector; the sector lines are worked out from where a car crossed them on a clean lap), with a top 3 for each sector underneath: each driver's best sector time so far, shown with a team-coloured driver tile (and your favourite driver's position and gap if they are outside the top 3). Flags stand out: the flagged part of the track glows yellow or orange under yellow and double yellow flags, the whole track pulses red under a red flag and turns dashed amber behind the safety car, and a banner over the map says what is happening and where (for example "Yellow flag · Turn 2"). The Sectors button turns the sector colours off. Live, it plays about 6 seconds behind so cars move smoothly; for finished sessions, a replay bar lets you scrub to any moment and play at 1×, 4× or 8×. Tap a car to open that driver's page.
- Team radio for the session as cards: driver photo with a mic button, name, the lap it was sent on, date and time, a playback timer (for example 0:04 / 0:09), and a progress bar while it plays (one clip at a time, audio only). Filterable by driver, your driver or your team.
- **FIA race control and stewards** feed: every official message, newest first, in plain English with the reason underneath (for example "Turn 4 incident involving VER and NOR · Causing a collision"), and the exact official wording one tap away. Labelled as Penalty, Under Investigation, Noted, No Further Action, Track Limits, Flag, Safety Car, Session or Info. The All tab hides routine sector and blue flag messages unless you choose to show them. Filter by type, by driver, by your favourite driver or by your favourite team.
- Penalties this session (with whether each is marked as served), track limits count per driver, and open investigations.

### Race and circuit pages

Opened from a race name on the Calendar (or anywhere a race links): results for the race, sprint and qualifying, and a **circuit overview**:

- Track map with numbered turns, the three timing sectors in the same colours as on Live Timing (sector lines placed from the fastest lap of that weekend), the start/finish line and the direction of travel (layout from MultiViewer).
- Lap length (measured along the recorded track outline, so it can be a little off the official figure), number of turns, circuit type (permanent, street or temporary road course, from OpenF1), race laps and distance, and pit stop time loss normally and under safety car / VSC.
- History from every Grand Prix held there (Jolpica-F1): first Grand Prix, how many have been held, how often the pole sitter won, the win from furthest back, the fastest race lap on record (fastest laps are recorded from 2004, and layouts change over the years), most wins by a driver and by a team, and the last six winners with grid slot and pole sitter.
- A link to a map of the area.
- **Weekend weather** for each day of the weekend, with the sessions on that day (in local track time): a forecast once the weekend is within about 16 days, and the recorded weather for past races. From Open-Meteo (free, no key, for non-commercial use).
- **Positions lap by lap** for finished races and sprints from 2023 onward (OpenF1): one line per driver in team colours (team-mates share a colour, the second car is dashed), the top 10 by default with a button for everyone, and a hover tooltip with the order on each lap. These are positions on track, so post-race penalties are not reflected.

### Favourites: Driver tab

Pick a favourite driver with the star on the Drivers page or in Settings. They are highlighted in the standings, Live Timing and the FIA feed, and the **Favourites** page shows:

- Championship position, points and gaps to the drivers around them.
- Season stats: wins, podiums, poles, front-row starts, fastest laps, points finishes, average finish, average grid, positions gained, DNFs, sprint points and points per race.
- Grid vs finish chart for every round, with DNFs marked.
- Compare with the team-mate or any other driver: points, ahead in races, ahead in qualifying, wins and podiums.
- Title maths: whether they can still win the championship with the points left.
- Career totals: starts, wins, podiums, poles, fastest laps, titles and career points.
- History at the next circuit.
- Race-by-race results for Grands Prix, sprints and qualifying.
- This weekend's session results and the latest team radio, as the same cards used on Live Timing (photo, play button, lap, date and time).
- **Live section** during any session: position, gaps to the cars ahead and behind with the change over the last lap, tyre, pit stops, lap time chart, sector times, car data, overtakes made and lost (races), FIA messages about them and team radio. An optional live track map (Settings) shows where they are on the circuit.

### Favourites: Team tab

Pick a favourite team with the flag button in the Constructors' standings or in Settings. Its drivers are tinted in the standings and Live Timing, and the **Team** tab shows:

- Constructors' position, points and gaps.
- Season stats: wins, podiums, one-two finishes, double points finishes, poles, front-row starts, fastest laps, DNFs, best result, average finish, points per race and sprint points.
- Points per round, split between the two drivers.
- Team-mate comparison and constructors' title maths.
- The team's history at the next circuit.
- Race-by-race results for both cars.
- This weekend's session results for both drivers and their team radio, as radio cards.
- **Live view** during sessions: both cars side by side, team FIA messages and team radio.

### Alerts

While the app is open and a session is live, pop-up alerts tell you when your favourite driver changes position, pits, or gets an FIA decision (penalty, investigation, noted, no further action, track limits). You can also turn on device notifications in Settings; they arrive while the app is open or in the background, not after it has been closed.

### Standings, Calendar and Drivers

- **Standings:** full Drivers' and Constructors' tables, with your favourites highlighted and the flag button to pick a team. Driver and team names open their pages (see below).
- **Calendar:** every round with all session times in your time zone and the winner (and their team) of each finished race. Tap a race name for its results page.
- **Race results** (`#/race/20` for the season in the season picker, or `#/race/2023/21` for a specific season): podium, full race results (grid, places gained or lost, laps, time or status, fastest lap, points), sprint results on sprint weekends and qualifying (Q1, Q2, Q3), with links to the previous and next race. Upcoming races show the weekend schedule instead.
- **Drivers:** the current grid with photos, numbers, teams and championship position, and the star to pick your favourite. Tap a driver to open their page (see below).

### Driver and team pages

Every driver and team has its own page, with the same layout as the Favourites tabs:

- **Driver page** (`#/driver/VER`, by three-letter code): season stats, grid vs finish, compare with any driver, title maths, career totals, history at the next circuit, race-by-race results, this weekend's sessions and team radio, plus the live section during sessions.
- **Team page** (`#/team/ferrari`, by team id): season stats, points per round, team-mate comparison, constructors' title maths, history at the next circuit, race-by-race results for both cars, this weekend's sessions and team radio, plus both cars live during sessions.

For a driver or team that isn't your favourite, the page has a back link instead of the Driver | Team tabs, highlights Drivers or Standings in the menu, and shows an empty ☆ or ⚑ to make it your favourite. Only your favourite driver triggers alerts. Each page has its own address, so you can bookmark or share it, and it follows the season picker (for example 2024 stats).

Where names link to (driver page, team page or race results page):

| Where | Driver page | Team page | Race results page |
| --- | --- | --- | --- |
| Dashboard | Names in the Drivers' Championship table, Last race podium | Constructors' bars, Team column of the drivers' table, Last race podium | Last race name, each round in the calendar strip |
| Live Timing | Codes in the timing tower, cars on the track map, drivers in the sector top 3, driver chips under FIA messages, team radio codes | | |
| Driver and team pages | Driver names on the team radio cards | | Race names in the race-by-race tables, seasons in the circuit history tables |
| Standings | Driver names | Team names | |
| Calendar | Winner of each finished race | Winner's team | Race names |
| Race results | Podium and every driver in the race, sprint and qualifying tables | Podium teams and team names in those tables | Previous and next race |
| Drivers | Each driver card (the star stays separate) | | |

Notes:

- Race results addresses come in two forms. `#/race/20` follows the season picker (used by the Dashboard and Calendar). `#/race/2023/21` carries its own season (used by the circuit history tables), and its previous and next links stay in that season.
- Every link has a faint underline, so it is clear what you can tap (there is no hover on a tablet); the underline brightens on hover or keyboard focus.

### Settings

- Favourite driver and favourite team.
- Alerts on or off, and device notifications.
- Live track map on or off.
- Optional OpenF1 access token and request budget.
- Clear cached data.

All settings are saved on each device separately.

### Works everywhere

- Laptop layout with a top menu; tablet and phone layout with a bottom menu and large touch targets.
- Installable on Android (and desktop Chrome or Edge) and opens offline with the last loaded standings and calendar.
- Season picker for standings, results and calendar from previous years.
- All times in the device's local time zone.

## Design

The screen designs live on a design canvas: [Pit Wall design canvas](https://claude.ai/artifact/UgpQJAyUaffXnHjuGgJke8). The canvas is private to its owner; others can open it only after it is shared from its Share menu. All boards use sample data with Max Verstappen as the favourite driver and Ferrari as the favourite team, and the boards link to each other through their menus. Driver, team and race names on the boards are links too, drawn with the same faint underline as in the app, and open the matching example board (one example driver, team and race).

| Page | Laptop board | Android tablet board (portrait) |
| --- | --- | --- |
| Dashboard | Dashboard (laptop) | Dashboard (Android tablet, portrait) |
| Live Timing (timing tower with mini-sectors, tyre history, DIFF, speed and pedals; track map with sector top 3; team radio cards; FIA feed) | Live Timing (laptop), and Live Timing before the race starts (laptop) for the starting-grid view | Live Timing (Android tablet, portrait), and Live Timing: track map and team radio (Android tablet, portrait) for the screen further down |
| Favourites: Driver tab | Favourites: Driver tab (laptop) | Favourites: Driver tab (Android tablet, portrait) |
| Favourites: Team tab | Favourites: Team tab and where the team appears | Favourites: Team tab (Android tablet, portrait) |
| Standings | Standings (laptop) | Standings (Android tablet, portrait) |
| Calendar | Calendar (laptop) | Calendar (Android tablet, portrait) |
| Race results (opened from Calendar), with the circuit overview, weekend weather and positions lap by lap | Race results (laptop) | Race results (Android tablet, portrait), and Race page: circuit, weather and positions (Android tablet, portrait) for the screen further down |
| Drivers | Drivers (laptop) | Drivers (Android tablet, portrait) |
| Driver page, any driver (opened from Drivers) | Driver page, any driver (laptop) | Driver page, any driver (Android tablet, portrait) |
| Settings | Settings (laptop) | Settings (Android tablet, portrait) |

There is also a "Favourite driver: where it appears" board that maps every place the favourite driver shows up in the app.

The tablet boards show one screen (800 × 1280) with the bottom menu (Dashboard, Live Timing, Favourites, Standings, Calendar, Drivers). The app's tablet layout is a single scrolling column with the same sections, so some boards note what sits further down the page.

## Data sources

Formula 1 has no public official API. This app uses free community APIs:

| Source | Used for | Notes |
| --- | --- | --- |
| [OpenF1](https://openf1.org) | Live timing, positions, gaps, laps and sectors, tyres, pit stops, race control messages, weather, car data, car positions (track map), overtakes, starting grid, session results, team radio | Historical data is free. Check OpenF1's current terms for real-time access during sessions; if it needs an account, paste your access token in **Settings**. Default budget is 30 requests per minute, adjustable in Settings. |
| [Jolpica-F1](https://github.com/jolpica/jolpica-f1) | Calendar, results, qualifying, sprints, driver and constructor standings, career totals, circuit history | Ergast-compatible. Responses are cached on the device, from 10 minutes for standings up to a week for past seasons. |
| [Open-Meteo](https://open-meteo.com) | Weekend weather on race pages (forecast and recorded) | Free, no key, for non-commercial use. Requests come from your own device. |
| [MultiViewer](https://multiviewer.app) circuit API | Track outlines, turn numbers, marshal sectors and map rotation for the Live Timing track map | Unofficial and free, no key. Layouts are cached on the device for a week. If a layout is missing, the map says so and the rest of the page works as normal. |

How some values are worked out:

- **FIA message types** come from the stewards' standard wording in each message. A message with unusual wording lands in "Other".
- **Finished rounds** are counted from the race results, because Jolpica's standings round can run ahead of the results.
- **Title maths** assumes 25 points for a Grand Prix win and 8 for a sprint win (a one-two of 43 and 15 for a team), with no fastest-lap point. Ties decided by countback are not modelled.
- **Overtakes** are as recorded by OpenF1 and only shown for races and sprints.

## Run on your laptop

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (http://localhost:3030).

## Use it on your Android tablet

Open the live site above in Chrome, tap the three-dot menu, then **Install app** (or **Add to Home screen**). Pit Wall then opens from the home screen, full screen like a normal app.

Installing needs the site to be served over **HTTPS**, which GitHub Pages does. For a quick test without hosting, run `npm run dev` on the laptop and open `http://<laptop-ip>:3030` on the tablet while both are on the same Wi-Fi. That works in the browser, but Android will not install it as an app over plain HTTP.

## Deploy

The build is a static site in `dist/`:

```bash
npm run build
```

- **GitHub Pages:** in the repository go to Settings, Pages, and set Source to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. The site is served at `https://<user>.github.io/<repo>/`.
- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output folder `dist`.

## Project layout

```
src/api/         OpenF1 and Jolpica clients, rate limiter, cache
src/hooks/       Polling, live timing, season data and favourites hooks
src/lib/         FIA message classifier, driver stats, alerts, formatting, team colours, settings, routing
src/pages/       Dashboard, Live Timing, Favourites (My Driver, My Team), Standings, Calendar, Drivers, Settings
src/components/  App shell, charts, track map, live driver and team views, team radio, strips, alerts, loading and error states
```

## Notes

- Polling pauses while the app is in the background to save API quota. The live track map adds about 15 OpenF1 requests a minute, which can slow other live updates on the free tier.
- Team radio is audio only. Automatic transcripts were tried, but F1's radio file server blocks GitHub's servers, so they cannot be produced without running a machine of your own.
- The OpenF1 token is stored only in the device's browser storage and sent only to api.openf1.org.
