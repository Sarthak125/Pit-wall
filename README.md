# Pit Wall: F1 dashboard

An installable web app (PWA) for Formula 1: live timing with a moving track map, pit stop predictions and live championship standings, FIA race control and stewards' messages in plain English, team radio, standings, a calendar with a page for every race and circuit, driver and team pages, and a personal page for your favourite driver and team. One codebase runs in a laptop browser and installs on an Android tablet or phone like an app.

Live site: https://sarthak125.github.io/Sarthak125/

Unofficial fan project. Not affiliated with Formula 1, the FIA or any team.

## Recently added

- **Phone layout:** the whole app now works on phones (see [Works everywhere](#works-everywhere)).
- **Live Timing**
  - **Timing tower:** mini-sector bars, IN PIT / PIT OUT / STOP / RETIRED tags, tyre history, places gained or lost (DIFF), live speed and pedals, a purple fastest lap, and pinned POS and DRIVER columns.
  - **PIT NOW predictor:** where each car would rejoin if it pitted this lap.
  - **Championship if it ended now:** drivers and constructors re-ranked from the current order.
  - **Gap to leader chart:** every driver's gap, lap by lap.
  - **Track map:** every car moving, with S1 / S2 / S3 sector colours, a top 3 per sector, flag highlights, and a replay bar for finished sessions.
  - **Session bar:** lap X/Y, pit stop time loss and fuller weather.
  - **Before a race:** the starting grid with a countdown.
  - **Team radio:** cards with photo, lap, time and a playback timer.
  - **FIA feed:** messages in plain English.
  - **Track limits panel:** session totals, the worst corner, bars that turn amber and red, and badges for black and white flags and penalties actually issued.
  - **Under investigation panel:** each open incident in plain English with the drivers, lap, time and decision status.
- **Race and circuit pages:** a circuit overview (map, facts, history and lap record), weekend weather, and a lap-by-lap position chart.
- **Dashboard:** a LIVE banner during sessions, the next race's circuit map and key facts (the map grows to match the forecast and last race column beside it), the weekend forecast, the last race podium, and wind in km/h.
- **Driver and team pages** use the same team radio cards.
- **Reliability:**
  - Live Timing stays within OpenF1's request budget, and goes faster if you raise it.
  - A banner offers **Reload** when a new version is ready.
  - Rate-limit waits are capped, so a page never stalls.
- **Readability:** larger text on all screens.

## Features

### Dashboard

- A **LIVE** banner at the top while any session is running, with how long it has been going; tap it to open Live Timing.
- Next race card with a live countdown to lights out and the weekend schedule (practice, sprint, qualifying, race) marked Done, Live, Next or Upcoming.
- Next race circuit: track map with S1 / S2 / S3 colours and turn numbers, lap length, turns and race laps, with a link to the full circuit and race page. On laptops the map grows to match the height of the column beside it; on tablets it is sized to the card's width.
- Weekend forecast for the next race (once it is within about 16 days), and the last race podium and fastest lap beside it.
- Track conditions from the latest session: air and track temperature, humidity, wind (km/h and direction), pressure, rain, and track status (green, yellow, safety car, red, chequered) while a session is live.
- Drivers' and Constructors' Championship tables.
- Title fight chart: cumulative points after each round for the top four, plus your favourite driver.
- Season calendar strip.
- "Your driver" and "Your team" strips when favourites are set.

### Live Timing

Pick any session of the current race weekend; live sessions update automatically. From top to bottom:

**Session bar**

- Lap. In races and sprints it shows "lap 35/51" and laps left; the total is the distance run in the latest race or sprint at that circuit, since no free source publishes the planned lap count.
- Elapsed time in races, time left in practice and qualifying, or a countdown before the session starts (shown as **UPCOMING**).
- Pit stop time loss at the circuit, normally and under safety car and virtual safety car (MultiViewer's estimate).
- Track and air temperature, humidity, wind speed and direction, rain, and track status.

**Timing tower** (one table, no separate car data or tyre strategy panels)

- Position, gap and interval (interval only in races), last lap, and best lap, with the session's fastest lap in a purple pill.
- Sector 1, 2 and 3 times for each driver's latest lap, each with a **mini-sector bar** underneath: yellow, green for a personal best, purple for the overall best, blue in the pit lane. While live they fill in as the car goes round. A small coloured marker on each heading matches the sector colours on the track map.
- Status tags in the last-lap column: **IN PIT** and **PIT OUT** while a car is in the pit lane, **STOP** when it is stopped out on track (0 km/h), and **RETIRED**, **DNS** or **DSQ** from the official classification (checked every minute while live). Retired rows are dimmed. In a race, a stopped or parked car that has not started a lap for 4 minutes while others have is marked RETIRED until the official result arrives.
- **Tyre history**: every set used, oldest first, as its age in laps followed by the tyre (for example "3 S  33 M"), with the current set in bold.
- **DIFF** (races and sprints): places gained (green ↑) or lost (red ↓) against the starting grid.
- **Speed** and **pedals** (throttle and brake bars) from live car data; without live data they show 0.
- **PIT NOW** (live races and sprints): where each car would rejoin if it pitted this lap, as its position and the car it would be behind (for example "P7 · HAM +1.7"). Worked out from its gap to the leader plus the circuit's pit loss, using the smaller safety car or VSC figure while the race is neutralised. Rejoining within a second of another car shows in amber with a ⚠ (traffic). Cars in the pits, retired cars and lapped cars are left out.
- POS and DRIVER stay pinned when the table scrolls sideways on narrower screens. With every column filled, the whole table fits from about 1366 px wide.
- Before a race or sprint starts, the tower follows the official **starting grid** (penalties included, from the matching qualifying session; the qualifying order until the grid is published) and shows each driver's qualifying lap.

**Championship if it ended now** (live races and sprints)

- Drivers' and constructors' standings recalculated from the current order: points before this session plus what each current position would score (25 to 1, or 8 to 1 in a sprint), with places gained or lost in the championship and the gap to the leader. Retired cars score nothing. Shows the top 10 drivers and top 5 teams plus your favourites, and steps aside once the official standings include the session.

**Gap to leader** (races and sprints)

- Each driver's gap to the leader at the end of every lap, in team colours (the second car of a team dashed), top 10 by default with a button for everyone, and a hover tooltip with every gap on that lap. Pit stops show as jumps and safety cars squeeze the lines together. It uses the lap data Live Timing already loads, so it costs no extra requests.

**Track map**

- The circuit with numbered turns and the start/finish line, and every car moving on it in team colours: your favourite driver ringed in gold, your team's cars in white. Tap a car to open that driver's page.
- The three timing sectors in their own colours: **S1 red, S2 light blue, S3 yellow**, the same everywhere sectors appear. The sector lines are worked out from where a car crossed them on a clean lap. The Sectors button turns the colours off.
- A top 3 for each sector underneath: each driver's best sector time so far, with a team-coloured driver tile, plus your favourite driver's position and gap if they are outside the top 3.
- Flags stand out: the flagged part of the track glows yellow (or orange for double yellow) with a dashed black stripe, so it still shows on the yellow sector; the whole track pulses red under a red flag and turns dashed amber behind the safety car; and a banner says what is happening and where (for example "Yellow flag · Turn 2").
- Live, it plays about 15 seconds behind (less with a bigger request budget) so cars move smoothly between position updates. For finished sessions, a replay bar lets you scrub to any moment and play at 1×, 4× or 8×.

**Team radio**

- Cards with the driver's photo and a mic button to play, name, the lap it was sent on, date and time, a playback timer (for example 0:04 / 0:09) and a progress bar. One clip plays at a time; audio only.
- Filter by driver, your driver or your team.

**FIA race control and stewards**

- Every official message, newest first, in plain English with the reason underneath (for example "Turn 4 incident involving VER and NOR · Causing a collision"), and the exact official wording one tap away.
- Labelled Penalty, Under Investigation, Noted, No Further Action, Track Limits, Flag, Safety Car, Session or Info. The All tab hides routine sector and blue flag messages unless you choose to show them.
- Filter by type, by driver, by your favourite driver or by your favourite team.
- Penalties this session (with whether each is marked as served).
- **Track limits**: totals for the session (lap times deleted, drivers, the corner with most deletions), then each driver with a bar of deletions (in races it turns amber at 3 and red from 4), the corner where most happened, and badges for a black and white flag or a track limits penalty, shown only when the FIA actually issued them. Top 8 with "Show all".
- **Under investigation**: each open incident in plain English with the reason, lap and time, the drivers in team colours, and whether the decision is pending or comes after the race or session.

### Race and circuit pages

Open any race from the Calendar (or anywhere a race name links). Addresses: `#/race/20` follows the season picker, `#/race/2023/21` is a specific season.

- **Results:** podium, full race results (grid, places gained or lost, laps, time or status, fastest lap, points), sprint results on sprint weekends and qualifying (Q1, Q2, Q3), with links to the previous and next race. Upcoming races show the weekend schedule instead.
- **Circuit overview:**
  - Track map with numbered turns, the three timing sectors in the same colours as on Live Timing (sector lines placed from the fastest lap of that weekend), the start/finish line and the direction of travel.
  - Lap length (measured along the recorded track outline, so it can be a little off the official figure), number of turns, circuit type (permanent, street or temporary road course), race laps and distance, and pit stop time loss normally and under safety car / VSC.
  - History from every Grand Prix held there: first Grand Prix, how many have been held, how often the pole sitter won, the win from furthest back, the fastest race lap on record (fastest laps are recorded from 2004, and layouts change over the years), most wins by a driver and by a team, and the last six winners with grid slot and pole sitter.
  - A link to a map of the area.
- **Weekend weather:** one card per day, in local track time, with that day's sessions: conditions, high and low temperature, rain and wind. A forecast (with rain chance) once the weekend is within about 16 days, and the recorded weather for past races.
- **Positions lap by lap** (finished races and sprints from 2023 onward): one line per driver in team colours (team-mates share a colour, the second car is dashed), the top 10 by default with a button for everyone, and a hover tooltip with the order on each lap. These are positions on track, so post-race penalties are not reflected; the results table has the official classification.

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
- **Calendar:** every round with all session times in your time zone and the winner (and their team) of each finished race. Tap a race name for its race and circuit page (see above).
- **On phones:** the Drivers' table shows position, driver, gap and points (the colour bar still shows the team), and the Calendar shows round, race, date and winner. The full session times are on each race page. Wider tables can be swiped sideways.
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
| Live Timing | Codes in the timing tower, cars on the track map, drivers in the sector top 3, driver chips under FIA messages, names on the team radio cards | | |
| Driver and team pages | Driver names on the team radio cards | | Race names in the race-by-race tables, seasons in the circuit history tables |
| Standings | Driver names | Team names | |
| Calendar | Winner of each finished race | Winner's team | Race names |
| Race and circuit pages | Podium and every driver in the race, sprint and qualifying tables; lap record holder; recent winners and pole sitters | Podium teams, team names in those tables, recent winners' teams | Previous and next race; seasons in the recent winners table |
| Drivers | Each driver card (the star stays separate) | | |

Notes:

- Race results addresses come in two forms. `#/race/20` follows the season picker (used by the Dashboard and Calendar). `#/race/2023/21` carries its own season (used by the circuit history tables), and its previous and next links stay in that season.
- Every link has a faint underline, so it is clear what you can tap (there is no hover on a tablet); the underline brightens on hover or keyboard focus.

### Settings

- Favourite driver and favourite team.
- Alerts on or off, and device notifications.
- Live track map on the Favourites driver page on or off (Live Timing always has its own map).
- Optional OpenF1 access token and request budget. The budget sets how often live data is fetched: at the default 30 requests a minute Live Timing stays just under it, and at 60 or more everything updates up to twice as often.
- Clear cached data.

All settings are saved on each device separately.

### Works everywhere

- Laptop layout with a top menu; tablet and phone layout with a bottom menu and large touch targets.
- **On phones** (screens under 600px wide):
  - The header fits on one row: logo, season picker, refresh and settings.
  - The bottom menu uses short labels: Home, Live, Faves, Standings, Calendar, Drivers.
  - Cards, padding and headings are a little tighter, and every page fits the screen width with no sideways scrolling (checked at 390px and 360px wide).
  - Wide tables such as the timing tower swipe sideways, with POS and DRIVER pinned on the left.
  - The FIA feed on Live Timing starts with the newest 15 messages, with a **Show all** button.
- Installable on Android (and desktop Chrome or Edge) and opens offline with the last loaded standings, calendar, circuit layouts and weather.
- When a new version is published, a banner says "A new version of Pit Wall is ready" with a **Reload** button (or **Later**). The app checks when you open it, when you come back to it, and every 30 minutes.
- Season picker for standings, results and calendar from previous years.
- All times in the device's local time zone (weather days use the circuit's local date).
- Text is about 10% larger on laptops and 5% larger on tablets, for reading from a distance. Phones use the normal size so more fits on screen.

## Design

The screen designs live on a design canvas: [Pit Wall design canvas](https://claude.ai/artifact/UgpQJAyUaffXnHjuGgJke8). The canvas is private to its owner; others can open it only after it is shared from its Share menu. All boards use sample data with Max Verstappen as the favourite driver and Ferrari as the favourite team, and the boards link to each other through their menus. Driver, team and race names on the boards are links too, drawn with the same faint underline as in the app, and open the matching example board (one example driver, team and race).

| Page | Laptop board | Android tablet board (portrait) |
| --- | --- | --- |
| Dashboard (LIVE banner, next race, circuit map and facts, weekend forecast, last race, favourites, standings) | Dashboard (laptop) | Dashboard (Android tablet, portrait) |
| Live Timing (timing tower with mini-sectors, tyre history, DIFF, PIT NOW, speed and pedals; championship if it ended now; track map with sector top 3; team radio cards; FIA feed; track limits and investigations panels) | Live Timing (laptop), and Live Timing before the race starts (laptop) for the starting-grid view | Live Timing (Android tablet, portrait), and Live Timing: track map and team radio (Android tablet, portrait) for the screen further down |
| Favourites: Driver tab | Favourites: Driver tab (laptop) | Favourites: Driver tab (Android tablet, portrait) |
| Favourites: Team tab | Favourites: Team tab and where the team appears | Favourites: Team tab (Android tablet, portrait) |
| Standings | Standings (laptop) | Standings (Android tablet, portrait) |
| Calendar | Calendar (laptop) | Calendar (Android tablet, portrait) |
| Race results (opened from Calendar), with the circuit overview, weekend weather and positions lap by lap | Race results (laptop) | Race results (Android tablet, portrait), and Race page: circuit, weather and positions (Android tablet, portrait) for the screen further down |
| Drivers | Drivers (laptop) | Drivers (Android tablet, portrait) |
| Driver page, any driver (opened from Drivers) | Driver page, any driver (laptop) | Driver page, any driver (Android tablet, portrait) |
| Settings | Settings (laptop) | Settings (Android tablet, portrait) |

There is also a "Favourite driver: where it appears" board that maps every place the favourite driver shows up in the app.

The tablet boards show one screen (800 × 1280) with the bottom menu (Dashboard, Live Timing, Favourites, Standings, Calendar, Drivers). The app's tablet layout is a single scrolling column with the same sections, so some boards note what sits further down the page. There are no phone boards yet; the phone layout follows the tablet one with the changes listed under [Works everywhere](#works-everywhere).

## Data sources

Formula 1 has no public official API. This app uses free community APIs:

| Source | Used for | Notes |
| --- | --- | --- |
| [OpenF1](https://openf1.org) | Live timing, positions, gaps, laps, sectors and mini-sectors, tyres, pit stops, race control messages, track weather, car data (speed, throttle, brake), car positions (track map), overtakes, starting grid, session results (retirements), team radio, meetings (circuit type), lap-by-lap positions for the position chart | Historical data is free. Check OpenF1's current terms for real-time access during sessions; if it needs an account, paste your access token in **Settings**. Default budget is 30 requests per minute, adjustable in Settings. |
| [Jolpica-F1](https://github.com/jolpica/jolpica-f1) | Calendar, results, qualifying, sprints, driver and constructor standings (also the starting point for the live championship), career totals, circuit history (winners, poles, fastest laps), planned race distance | Ergast-compatible. Responses are cached on the device, from 10 minutes for standings up to a week for past seasons. |
| [Open-Meteo](https://open-meteo.com) | Weekend weather on race pages (forecast and recorded) | Free, no key, for non-commercial use. Requests come from your own device. |
| [MultiViewer](https://multiviewer.app) circuit API | Track outlines, turn numbers, marshal sectors and map rotation (Live Timing map and circuit overview), pit stop time loss estimates | Unofficial and free, no key. Layouts are cached on the device for a week. If a layout is missing, the map says so and the rest of the page works as normal. |

How some values are worked out:

- **FIA message types** come from the stewards' standard wording in each message. A message with unusual wording lands in "Other".
- **Finished rounds** are counted from the race results, because Jolpica's standings round can run ahead of the results.
- **Title maths** assumes 25 points for a Grand Prix win and 8 for a sprint win (a one-two of 43 and 15 for a team), with no fastest-lap point. Ties decided by countback are not modelled.
- **Overtakes** are as recorded by OpenF1 and only shown for races and sprints.
- **Race distance (lap X/Y)** is the number of laps the winner ran in the latest race (or sprint) at that circuit. It is off if that race was shortened.
- **Sector lines** are not published, so they are placed where a car was when its sector 1 and sector 2 times ended on a fast clean lap.
- **Lap length** is measured along the track outline the map is drawn from, usually within about 2% of the official figure.
- **Pit status** comes from OpenF1's pit records and mini-sector codes (a mini-sector flagged as pit lane). **STOP** means live car data shows 0 km/h away from the pit lane.
- **Starting grid** is OpenF1's official grid for the matching qualifying session, which includes grid penalties.
- **Positions lap by lap**: OpenF1 records a row only when a position changes, so each driver's position at the end of a lap is the last change before that lap ended.
- **Weather days** group sessions by the circuit's local date, using the time zone Open-Meteo reports for the location.
- **PIT NOW** adds the circuit's pit loss (MultiViewer's estimate; the safety car or VSC figure while the race is neutralised) to each car's live gap to the leader and places the result among the other cars' gaps. It ignores tyre warm-up, slow stops and the field changing during the stop, so treat it as a guide. Lapped cars have no time gap and are left out.
- **Championship if it ended now** adds the points for each current race position (25 to 1, or 8 to 1 in a sprint) to the standings before the session. It only shows while the session is live and Jolpica's standings do not yet include it; ties keep the earlier order.

## Run on your laptop

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (http://localhost:3030).

## Use it on your Android tablet or phone

Open the live site above in Chrome, tap the three-dot menu, then **Install app** (or **Add to Home screen**). Pit Wall then opens from the home screen, full screen like a normal app.

Installing needs the site to be served over **HTTPS**, which GitHub Pages does. For a quick test without hosting, run `npm run dev` on the laptop and open `http://<laptop-ip>:3030` on the tablet or phone while both are on the same Wi-Fi. That works in the browser, but Android will not install it as an app over plain HTTP.

## Deploy

The build is a static site in `dist/`:

```bash
npm run build
```

- **GitHub Pages:** in the repository go to Settings, Pages, and set Source to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. The site is served at `https://<user>.github.io/<repo>/`.
- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output folder `dist`.

## Project layout

```
src/api/         OpenF1, Jolpica, MultiViewer (circuits) and Open-Meteo (weather) clients, rate limiter, cache
src/hooks/       Polling, live timing, season data and favourites hooks
src/lib/         FIA message classifier and plain-English wording, driver stats, alerts, formatting, team colours,
                 settings, routing, track geometry, sector lines, lap-by-lap positions, app updates
src/pages/       Dashboard, Live Timing, Favourites (My Driver, My Team), Standings, Calendar, Race results, Drivers, Settings
src/components/  App shell, charts, live track map, live championship, gap chart, dashboard extras, circuit overview and outline, weekend weather,
                 position chart, live driver and team views, team radio cards, FIA messages, strips, alerts, update
                 banner, loading and error states
```

## Notes

- Live Timing stays under OpenF1's default budget of 30 requests a minute (about 28 with the track map and team radio): gaps every 10 seconds, race control every 20, positions, speed and pedals every 15, track map positions every 12, and laps, tyres, pit stops, radio, weather and the classification less often. Raise the budget in Settings (for example with a paid OpenF1 plan) and everything polls faster, up to twice as often at 60 a minute. Polling pauses while the app is in the background. Replays load a minute of positions at a time. The optional live track map on the driver page (Settings) adds about 15 requests a minute.
- If a data service answers "too many requests", the app waits at most 10 seconds before retrying, so a page never stalls; the weather card says the service is not answering instead.
- Open-Meteo's free tier is for non-commercial use, which fits a personal dashboard.
- Team radio is audio only. Automatic transcripts were tried, but F1's radio file server blocks GitHub's servers, so they cannot be produced without running a machine of your own.
- The OpenF1 token is stored only in the device's browser storage and sent only to api.openf1.org.
