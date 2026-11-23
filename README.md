# Pit Wall: F1 dashboard

An installable web app (PWA) for Formula 1: live timing with a moving track map, pit stop predictions and live championship standings, FIA race control and stewards' messages in plain English, team radio, standings, a calendar with a page for every race and circuit (with the race story and a lap time comparison), driver and team pages, and a personal page for your favourite driver and team. One codebase runs in a laptop browser and installs on an Android tablet or phone like an app.

Live site: https://sarthak125.github.io/Pit-wall/

Code: https://github.com/Sarthak125/Pit-wall

Unofficial fan project. Not affiliated with Formula 1, the FIA or any team.

## Recently added

### Latest

- **Sectors on every track map:** every 2026 circuit map now shows its three timing sectors.
  - **Races still to come:** the sector lines come from the latest earlier weekend at the same circuit (for example Qatar's from 2025), and switch to the weekend's own once its first session has run.
  - **Circuits MultiViewer has no layout for:** currently Madring (Spanish Grand Prix) and Sepang (Malaysia). The map is now drawn from where a car actually went on the weekend's fastest lap, instead of saying no layout is available. These maps have no turn numbers.
  - See [Race and circuit pages](#race-and-circuit-pages).
- **Race story:** each race page tells the race as a timeline, worked out from the data: the start, lead changes, safety cars, virtual safety cars and red flags, pit stops with the tyres fitted, stewards' penalties, retirements, the fastest lap and the finish. See [Race and circuit pages](#race-and-circuit-pages).
- **Lap time comparison:** on race pages, pick any session of the weekend (practice, qualifying, sprint or race) and two drivers to see their lap times side by side, with pit stops and tyre changes marked.
- **Light theme:** Settings, Appearance: **Dark** (the default), **Light**, or **Auto** to follow your device. See [Settings](#settings).
- **Faster loading:** the first visit to the Dashboard or Calendar takes about half as long (Calendar about 4 s instead of 9 s, Dashboard about 6 s instead of 11 s), and coming back later downloads much less, because results already shown stay on the device. See [Notes](#notes).
- **Season review:** a page with the season in numbers (`#/review`, linked from Standings): champions, highlights such as most wins, the biggest climb and the closest win, every driver's and team's record, and the team-mate battles. Works for past seasons too. See [Season review](#season-review).
- **Ready for the off-season:** after the final race the Dashboard says the season is over and counts down to the next season's opener once its calendar is out; before a new season's first race, standings, results and the champions show the season before, labelled **Final <year> standings**. See [Between seasons](#between-seasons).
- **Champions banner:** once a title can no longer be lost, the Dashboard names the World Champion and the Constructors' Champions, with when each title was decided (for 2026: Antonelli at the Mexico City Grand Prix, Mercedes at the Brazilian Grand Prix), and the standings tag them as **Champion**.
- **Smaller fixes:** race pages show **Add to calendar** only for races still to come (it showed on past races while their results loaded), times read "India Standard Time" style rather than "Asia/Calcutta", and tyre strategy bars are big enough to tap on phones.
- **Live check script:** `tests/live/check-live.cjs` checks Live Timing on the live site during a real session (see [Tests](#tests)).
- **Dates in schedules:** the Dashboard's weekend schedule and upcoming race pages show each session's weekday and date over its time ("Fri 27 Nov" / "19:00"), and the Calendar shows each weekend's dates ("27 – 29 Nov") with every session's day and time ("Fri 27 · 19:00"), all in your time zone.
- **Standings updated right after a race:** until Jolpica publishes a race (which can take hours), standings, the title chart, the last race card, the Calendar winner and the race page use Formula 1 timing data from OpenF1 (the race classification and OpenF1's championship standings), labelled **Updated after <race> · F1 timing**. Jolpica's confirmed results replace it automatically.
- **Android app:** a free 1 MB app (Android 7 or newer) that opens Pit Wall full screen, downloadable from the How to use page. See [Use it on your Android tablet or phone](#use-it-on-your-android-tablet-or-phone).
- **How to use page:** a guide inside the app (the **?** button next to Settings, or `#/help`): getting started, race day and the feed status pill, reading Live Timing (colours, tags, qualifying, long runs, charts), watching later, planning ahead and common questions.
- **Qualifying knockout view:** Q1, Q2 and Q3 columns in the timing tower, the drop zone shaded with a line at the cut, the current part and cut-off time in the session bar, and OUT Q1 / OUT Q2 tags. See [Qualifying](#live-timing).
- **TV delay:** hold live timing back by up to 2 minutes so overtakes and flags appear when you see them on TV or a stream.
- **Spoiler-free mode:** hides the latest race weekend's results, standings and live timing until you press Reveal.
- **Tyre strategy chart:** every driver's stints as coloured bars across the race, live on Live Timing and on race pages for finished races and sprints.
- **Live history kept across reloads:** during live sessions on F1's feed, the laps recorded so far survive a reload or a dropped connection, so the gap chart and sector colours do not start over.
- **Add to calendar:** download a race weekend, or the rest of the season, as a calendar file for Google Calendar, Apple Calendar or Outlook.
- **Rain watch:** during a live session, whether rain is expected at the circuit in the next 2 hours, in 15-minute steps.
- **Long-run pace in practice:** each driver's longest run on one set of tyres, with average lap, laps and how much time they lost per lap.
- **Feed status:** a pill in the session bar says whether F1's live feed is live, quiet, reconnecting or offline. If the connection drops, the last timing stays on screen while it reconnects.
- **Automated tests before every deploy:** the site only goes live if the unit and browser tests pass. See [Tests](#tests).
### Earlier

- **Positions lap by lap on Live Timing:** during a live race it uses Formula 1's free lap-by-lap positions, so the chart is complete from the start however late you open the page; after the race it comes from OpenF1. See [Positions lap by lap](#live-timing).
- **Pit stops panel:** every stop with its stationary time and pit lane time, the stop number, and the fastest stop highlighted.
- **Clearer title fight chart on the Dashboard:** normal-sized text on any screen, the second car of a team dashed, end labels with points, more round markers, and a hover or tap tooltip with the race, points and gap to the leader.
- **DRS / overtake mode tag:** with live car data, a tag next to the speed shows DRS (open or eligible) for 2025 and earlier. From 2026 DRS was replaced by overtake mode; that tag stays hidden until OpenF1's 2026 data is confirmed to report it.
- **Free live timing during live sessions:** OpenF1 is limited to paying supporters while a session is live, so Live Timing and the Dashboard now read Formula 1's own live timing feed instead, straight from the browser and for free. Timing tower, tyres, FIA messages, weather, lap count and team radio are all live; live car positions and car speed need an F1 TV subscription and fill in from OpenF1 after the session. See [During live sessions](#during-live-sessions).
- **Clear message when OpenF1 is paused:** instead of loading forever, pages say OpenF1 is paused while a session is live, with the time free access should return, and fill in by themselves afterwards.
- **Faster switching:** sessions and pages you have already opened show straight away, and quickly flicking between them no longer uses up the request budget.
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
- Next race card with a live countdown to lights out and the weekend schedule (practice, sprint, qualifying, race), each session with its weekday and date over its time in your time zone ("Fri 27 Nov" / "19:00") and marked Done, Live, Next or Upcoming, and an **Add to calendar** button for the weekend's sessions.
- Next race circuit: track map with S1 / S2 / S3 colours and turn numbers, lap length, turns and race laps, with a link to the full circuit and race page. On laptops the map grows to match the height of the column beside it; on tablets it is sized to the card's width.
- Weekend forecast for the next race (once it is within about 16 days), and the last race podium and fastest lap beside it. Right after a race, before Jolpica has published it, the podium comes from F1 timing data and is labelled **Updated after <race>** (see [Data sources](#data-sources)).
- Track conditions from the latest session: air and track temperature, humidity, wind (km/h and direction), pressure, rain, and track status (green, yellow, safety car, red, chequered) while a session is live, with a compact **rain watch** underneath (see [Live Timing](#live-timing)).
- Drivers' and Constructors' Championship tables, labelled **Updated after <race> · F1 timing** while they include a race Jolpica has not published yet.
- **Champions banner** at the top once a title is decided: the World Champion with team, points and the race where the title was clinched (plus the lead and points still left while races remain), and the Constructors' Champions on a line below. Hidden in spoiler-free mode while the standings are.
- **Title fight chart:** cumulative points after each round for the top four, plus your favourite driver (drawn thicker). Team-mates share their team colour with the second car dashed, each line ends in a label with its points, and hovering or tapping a round shows the race, everyone's points and the gap to the leader. It is drawn at the card's real width, so text stays a normal size on any screen.
- Season calendar strip.
- "Your driver" and "Your team" strips when favourites are set.

### Live Timing

Pick any session of the current race weekend; live sessions update automatically. From top to bottom:

**Session bar**

- Lap. In races and sprints it shows "lap 35/51" and laps left; the total is the distance run in the latest race or sprint at that circuit, since no free source publishes the planned lap count.
- Elapsed time in races, time left in practice and qualifying, or a countdown before the session starts (shown as **UPCOMING**).
- Pit stop time loss at the circuit, normally and under safety car and virtual safety car (MultiViewer's estimate).
- Track and air temperature, humidity, wind speed and direction, rain, and track status.
- In qualifying, **PART** (Q1, Q2 or Q3, with how many cars go through) and **CUT-OFF** (the time of the last car currently through) replace the lap count.
- While timing comes from F1's feed: a **feed status** pill and, with a TV delay set, a **Delayed 30 s** pill (see [During live sessions](#during-live-sessions)).
- **Rain watch** while a session is live: a headline such as "No rain expected in the next 2 hours" or "Rain expected from about 14:45", rain bars for each 15 minutes of the next 2 hours, and the chance of rain for each of the next 3 hours. From Open-Meteo, refreshed every 10 minutes. It is a forecast, not radar.

#### During live sessions

OpenF1 shares data only with paying supporters from 30 minutes before a session until 30 minutes after it ends (past sessions included). Without an OpenF1 token, the app handles that window like this:

- **Live Timing reads Formula 1's own live timing feed**, the source OpenF1 is built on, directly from your browser. No server, no account and none of the OpenF1 request budget. A blue note at the top of the page says so.
- **Live from the feed:** positions, gaps and intervals, last and best laps with personal and overall bests, sectors and mini-sectors, in pit / pit out / stopped / retired, tyres and stint history, grid positions (DIFF), lap X/Y, time left, track status and flags, weather, FIA messages (feed, penalties, track limits, investigations), team radio, PIT NOW and "Championship if it ended now". The Dashboard's LIVE banner and track conditions use it too.
- **Not in the free feed:** live car positions on the track map, live speed and pedals, and pit stop times need an F1 TV subscription. The SPEED and PEDALS columns are hidden, and the track map shows flags and sector times without cars, with a note. The gap chart starts from when the page first connected during the session.
- **Feed status pill** in the session bar: **F1 feed live** (green; hover over it on a laptop for the time of the last update), **No updates for 1 min** (amber: still connected but nothing new for over 45 seconds, normal during a red flag), **Reconnecting in 6 s** (red, with **Retry now**) or **Offline**. While it reconnects, the page keeps showing the last timing it received instead of going blank.
- **History kept across reloads:** laps recorded from the feed (used by the gap chart and last-lap sector colours) are saved on the device for the current session, so a reload, a dropped connection or reopening the app carries on where it left off. Only the latest session is kept.
- **TV delay:** F1's feed is usually 30 to 60 seconds ahead of TV and streams. Pick a delay (off, 10, 20, 30, 45, 60, 90 or 120 seconds) on Live Timing or in Settings and the feed is held back by that much, so overtakes and flags appear when you see them. It applies to timing from F1's feed, not to OpenF1 data.
- **After the session:** about 30 minutes after it ends, OpenF1 opens up again and the page switches back to full OpenF1 data on its own, including the track map replay and the complete gap chart.
- **If F1's feed is unavailable** (it is unofficial and can change), pages show a "paused while the session is live" message with the estimated time free access returns and a countdown, check OpenF1 every 2 minutes, and fill in by themselves.
- **With an OpenF1 token** (paid supporter plan), the app keeps using OpenF1 during live sessions, including live car positions and car data.

**Timing tower** (one table, no separate car data or tyre strategy panels)

- Position, gap and interval (interval only in races), last lap, and best lap, with the session's fastest lap in a purple pill.
- Sector 1, 2 and 3 times for each driver's latest lap, each with a **mini-sector bar** underneath: yellow, green for a personal best, purple for the overall best, blue in the pit lane. While live they fill in as the car goes round. A small coloured marker on each heading matches the sector colours on the track map.
- Status tags in the last-lap column: **IN PIT** and **PIT OUT** while a car is in the pit lane, **STOP** when it is stopped out on track (0 km/h), and **RETIRED**, **DNS** or **DSQ** from the official classification (checked every minute while live). Retired rows are dimmed. In a race, a stopped or parked car that has not started a lap for 4 minutes while others have is marked RETIRED until the official result arrives.
- **Tyre history**: every set used, oldest first, as its age in laps followed by the tyre (for example "3 S  33 M"), with the current set in bold.
- **DIFF** (races and sprints): places gained (green ↑) or lost (red ↓) against the starting grid.
- **Speed** and **pedals** (throttle and brake bars) from live car data; without live data they show 0. Hidden while timing comes from Formula 1's free feed, which does not carry car data.
- **DRS tag** next to the speed when DRS is open (green) or available in the zone (outlined), for 2025 and earlier sessions. DRS no longer exists from 2026 (it was replaced by overtake mode); the tag would then read OVERTAKE, but stays hidden until OpenF1's 2026 car data is confirmed to report overtake mode. Needs live car data, so an OpenF1 token.
- **PIT NOW** (live races and sprints): where each car would rejoin if it pitted this lap, as its position and the car it would be behind (for example "P7 · HAM +1.7"). Worked out from its gap to the leader plus the circuit's pit loss, using the smaller safety car or VSC figure while the race is neutralised. Rejoining within a second of another car shows in amber with a ⚠ (traffic). Cars in the pits, retired cars and lapped cars are left out.
- POS and DRIVER stay pinned when the table scrolls sideways on narrower screens. With every column filled, the whole table fits from about 1366 px wide.
- Before a race or sprint starts, the tower follows the official **starting grid** (penalties included, from the matching qualifying session; the qualifying order until the grid is published) and shows each driver's qualifying lap.

**Qualifying** (qualifying, sprint qualifying and shootouts)

- The timing tower gets **Q1**, **Q2** and **Q3** columns with each driver's best time in each part, and the gap is to the fastest time in the current part (or, once finished, the last part the driver ran).
- While live, the cars in the drop zone are shaded with a line at the cut, so you can see who is out if nothing changes. Knocked-out drivers are dimmed with an **OUT Q1** or **OUT Q2** tag.
- Once finished, lines mark where Q1 and Q2 cut, using the number of cars in each part (22, 16 and 10 in 2026). Live from F1's feed; after the session from OpenF1's classification.

**Championship if it ended now** (live races and sprints)

- Drivers' and constructors' standings recalculated from the current order: points before this session plus what each current position would score (25 to 1, or 8 to 1 in a sprint), with places gained or lost in the championship and the gap to the leader. Retired cars score nothing. Shows the top 10 drivers and top 5 teams plus your favourites, and steps aside once the official standings include the session.

**Gap to leader** (races and sprints)

- Each driver's gap to the leader at the end of every lap, in team colours (the second car of a team dashed), top 10 by default with a button for everyone, and a hover tooltip with every gap on that lap. Pit stops show as jumps and safety cars squeeze the lines together. It uses the lap data Live Timing already loads, so it costs no extra requests.

**Positions lap by lap** (races and sprints)

- One line per driver from the grid to the latest lap, in team colours (the second car of a team dashed), top 10 by default with a button for everyone, and a hover tooltip with the order on that lap. During a live race the lap axis spans the full race distance and fills in from the left.
- Live without an OpenF1 token it comes from Formula 1's free lap-by-lap positions, so it is complete from the start even if you open the page mid-race (the gap chart above only has laps since you opened the page, because the free feed has no lap-by-lap gaps). After the session it comes from OpenF1. Live with an OpenF1 token it appears after the session.

**Pit stops** (races and sprints)

- Every stop, newest first: lap, driver, **stationary** time (standing still in the box), **pit lane** time (entry to exit, the time a stop really costs) and which stop it was for that driver. The fastest stop of the session is in a purple pill and in the panel header. Top 10 with "Show all".
- From OpenF1. Stationary times can arrive a few hours after a 2026 session ("later" until then). Formula 1's free live feed has no pit times, so during a live session without a token the panel says they appear about 30 minutes after the session.

**Tyre strategy** (races and sprints)

- One row per driver in race order, with each stint as a bar in its tyre colour across the race laps, labelled with the tyre and its length (for example "M 18"). Used sets (fitted with laps already on them) are striped, and the joins between bars are pit stops. On touch screens the bars are 24px tall, so they are easy to tap. Hover or tap a stint for its laps and the tyre's age. Live, the current stint grows lap by lap.

**Long-run pace** (practice)

- Each driver's longest run on one set of tyres, fastest average first: tyre, laps in the run, average lap, gap to the fastest average with a bar, time lost per lap over the run, and best lap in the run. Tabs filter by tyre when more than one was used.
- Only representative laps count: the out-lap, in-lap and laps more than 7% slower than the best in the run (traffic, cool-down) are left out, and a run needs at least 5 laps. Long runs are the usual guide to race pace on Fridays, since the fastest single laps are set on low fuel. They do not account for different fuel loads.

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

- **Results:** podium, full race results (grid, places gained or lost, laps, time or status, fastest lap, points), sprint results on sprint weekends and qualifying (Q1, Q2, Q3), with links to the previous and next race. Upcoming races show the weekend schedule instead (each session's weekday and date over its time, in your time zone), with an **Add to calendar** button.
- **Right after a race**, before Jolpica has published it, the results table comes from F1 timing data (OpenF1's classification, with grid positions from its starting grid) and is labelled **Updated after <race> · F1 timing**. A driver who changed team during the season is listed under the team they drove for in that race. Fastest laps and qualifying appear once Jolpica has the round.
- **Circuit overview:**
  - Track map with numbered turns, the three timing sectors in the same colours as on Live Timing (sector lines placed from the fastest lap of that weekend), the start/finish line and the direction of travel.
  - **Before a weekend has run any laps** (an upcoming race), the sector lines come from the latest earlier weekend at the same circuit, and the note under the map names the year (for example "from the fastest lap of the 2025 weekend here, until this weekend's first session"). The app checks again every 30 minutes, so the weekend's own lines replace them after its first session.
  - **A circuit MultiViewer has no layout for** (a new venue such as Madring, or one F1 has not raced at for years such as Sepang) is drawn from OpenF1's recorded car positions on the weekend's fastest lap (qualifying if it has run), with the start/finish line where that lap began. These maps have the sectors and the direction of travel but no turn numbers or pit stop time loss, so those facts show "-". The same outline is used on the Dashboard's next-race card and the Live Timing map, where flags for individual marshal sectors cannot be shown.
  - Lap length (measured along the recorded track outline, so it can be a little off the official figure), number of turns, circuit type (permanent, street or temporary road course), race laps and distance, and pit stop time loss normally and under safety car / VSC.
  - History from every Grand Prix held there: first Grand Prix, how many have been held, how often the pole sitter won, the win from furthest back, the fastest race lap on record (fastest laps are recorded from 2004, and layouts change over the years), most wins by a driver and by a team, and the last six winners with grid slot and pole sitter.
  - A link to a map of the area.
- **Weekend weather:** one card per day, in local track time, with that day's sessions: conditions, high and low temperature, rain and wind. A forecast (with rain chance) once the weekend is within about 16 days, and the recorded weather for past races.
- **Race story** (finished races and sprints from 2023 onward): the race as a timeline, lap by lap, for the race or sprint tab you are on:
  - **Start:** who led lap 1, and from where on the grid.
  - **Lead changes:** the leader is the first car across the line on each lap. Back-and-forth swaps between the same two drivers a few laps apart show as one **Battle for the lead** (for example Russell and Verstappen swapping the lead 6 times from lap 28 to lap 38 in Las Vegas, 2026).
  - **Safety car, virtual safety car and red flag** periods, with the laps they covered.
  - **Pit stops** with the tyres taken off and fitted and the stop time (for example "Soft to Medium · 2.4 s stop"). Stops by drivers outside the top five are hidden behind **Show all pit stops**; your favourite driver's are always shown.
  - **Stewards' penalties** with the reason, **retirements** with the cause where known, the **fastest lap** and the **finish** with the winning margin.
  - Your favourite driver's moments are highlighted. Sources: OpenF1 positions, laps, pit stops, tyres and race control messages, plus the classification.
- **Lap time comparison** (from the first session of a weekend, 2023 onward): pick a session (FP1, FP2, FP3, sprint qualifying, sprint, qualifying or race) and two drivers.
  - One line per driver (the second dashed), lower is faster. Pit stops are marked under the chart, a dot in the tyre's colour marks each new set, and laps far slower than normal pace (safety car, cool-down laps) sit at the top edge so they do not squash the rest.
  - Hover or tap a lap for both drivers' times, the tyre and how many laps old it was, and who was quicker.
  - In races and sprints: the average gap over the laps both drivers did at full pace (pit laps left out). In practice and qualifying, where drivers run different programmes, it compares best laps instead.
  - Drivers are listed in finishing order for races, by best lap otherwise; your favourite is picked first. **Show laps as a table** lists every lap.
- **Tyre strategy** (finished races and sprints from 2023 onward): the same chart as on Live Timing, in finishing order, for the race or sprint tab you are on.
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

- **Standings:** full Drivers' and Constructors' tables, with your favourites highlighted and the flag button to pick a team. Driver and team names open their pages (see below). In the hours after a race, before Jolpica publishes it, the tables come from OpenF1's championship standings after that race and carry an **Updated after <race> · F1 timing** label; hover over it for the details. Jolpica's confirmed standings replace them automatically. Once a title is decided, the champion driver and team carry a gold **Champion** tag; hover over it for when it was decided.
- **Calendar:** every round with its **weekend** dates, from the first session to the race in your time zone ("27 – 29 Nov", "31 Oct – 2 Nov"), every session's weekday, day and time ("Practice 1 Fri 27 · 19:00"), and the winner (and their team) of each finished race. Sessions that fall after midnight where you are show the next day, so a race in the Americas can read "Race Mon 26 · 01:30" in India. Tap a race name for its race and circuit page (see above). Right after a race, the winner shows from F1 timing data before Jolpica has published the result. An **Add remaining 2 races to calendar** button (the number follows the season) (or **Add season to calendar** before the season starts) downloads every session still to come.
- **On phones:** the Drivers' table shows position, driver, gap and points (the colour bar still shows the team), and the Calendar shows round, race, weekend dates and winner. The full session times are on each race page. Wider tables can be swiped sideways.
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

### Watching on TV or later

- **TV delay:** see [During live sessions](#during-live-sessions).
- **Spoiler-free mode** (Settings): hides the latest race weekend until you press **Reveal**. Its sessions on Live Timing, its race page and the Dashboard's last race card are covered, and once its sprint or race has started so are the standings, the title fight chart and the winner on the Calendar. Alerts for your favourite driver are paused too. Reveal opens that weekend only; when the next weekend starts, protection moves on to it. Settings has **Hide it again**.

### Add to calendar

- Buttons on the Dashboard's next race card, upcoming race pages and the Calendar download a standard calendar file (.ics) that Google Calendar, Apple Calendar and Outlook can import. Each session is its own event, with the circuit as the location and a link back to Pit Wall.
- Times are exact start times in UTC, so your calendar shows them in your own time zone. End times are estimates (the usual session length), and the file is a one-off download: if F1 moves a session later, download it again.

### Season review

Open it from **Season review →** on the Standings page (or `#/review`; after the final race, also from the Dashboard). It follows the season picker, so any past season can be reviewed, and for the season in progress it is the story so far ("21 of 23 Grands Prix").

- **Champions:** the same banner as the Dashboard, once a title is decided.
- **Highlights:** how many different Grand Prix winners, most wins, most poles, most podiums, the biggest climb in one race (grid to finish), the closest win (gap to second), most retirements, most one-twos and most sprint wins. Each links to the driver, team or race.
- **Drivers:** every driver's points, wins, podiums, poles, fastest laps, best and average finish, retirements (Grands Prix not classified) and places gained or lost from the grid.
- **Team-mate battles:** for each team's regular pair (the two drivers with the most Grands Prix for it), who finished ahead in races they both started, who qualified ahead, and points, with bars in the team colour.
- **Teams:** points, wins, podiums, one-twos and best result.

Figures are for Grands Prix, except points, which include sprints. A driver who changed team during the season is listed with the team of their latest race.

### Between seasons

- **After the final race:** the Dashboard says the season is complete and links to its review. As soon as the next season's calendar is published, it counts down to the opener instead.
- **Before a new season's first race:** Jolpica moves its "current" season to the new year before any race is run. Until the first race, the standings, results, title chart, last race card, champions banner and season review show the season before, labelled **Final <year> standings** (hover for why), while the Calendar shows the new season. If the new calendar is not out yet, the Dashboard and Calendar say so.
- **Season picker:** labelled from the data (for example "2027 (current)"), so around New Year it never shows the same season twice.

### How to use

The **?** button in the header (next to Settings) opens a guide to the app, also linked from the footer of every page. It covers getting started (favourites, installing, alerts), race day (where live data comes from, the feed status pill, what needs F1 TV), reading Live Timing (mini-sector, sector, tyre and fastest-lap colours, the tags and columns, qualifying, long runs and the race charts), watching later (TV delay and spoiler-free mode), planning ahead and common questions. The examples on it use the same styles as the app.

### Settings

- Favourite driver and favourite team.
- Alerts on or off, and device notifications.
- Live track map on the Favourites driver page on or off (Live Timing always has its own map).
- **Watching on TV or later:** TV delay and spoiler-free mode (see above).
- **Appearance:** **Dark** (the default), **Light**, or **Auto**, which follows your device's light or dark setting and changes with it. Track maps stay dark in both themes, and the hard tyre shows as silver on the light theme so it stands out from the page.
- Optional OpenF1 access token and request budget. OpenF1 allows 30 requests a minute (3 a second) for free use and 60 a minute (6 a second) with its paid supporter plan; the per-second cap follows the per-minute setting. At the default 30 Live Timing stays just under it, and at 60 or more everything updates up to twice as often. Without a token, live sessions use Formula 1's free feed instead (see [During live sessions](#during-live-sessions)).
- Clear cached data.

All settings are saved on each device separately.

### Works everywhere

- Laptop layout with a top menu; tablet and phone layout with a bottom menu and large touch targets.
- **On phones** (screens under 600px wide):
  - The header fits on one row: logo, season picker, refresh, **?** (How to use) and settings, down to 360px wide.
  - The bottom menu uses short labels: Home, Live, Faves, Standings, Calendar, Drivers.
  - Cards, padding and headings are a little tighter, and every page fits the screen width with no sideways scrolling (checked at 390px and 360px wide).
  - Wide tables such as the timing tower swipe sideways, with POS and DRIVER pinned on the left.
  - The FIA feed on Live Timing starts with the newest 15 messages, with a **Show all** button.
- Installable on Android (and desktop Chrome or Edge) and opens offline with the last loaded standings, calendar, circuit layouts and weather. There is also a free **Android app** (see [Use it on your Android tablet or phone](#use-it-on-your-android-tablet-or-phone)).
- The short address https://sarthak125.github.io/ forwards to Pit Wall.
- When a new version is published, a banner says "A new version of Pit Wall is ready" with a **Reload** button (or **Later**). The app checks when you open it, when you come back to it, and every 30 minutes.
- **Light or dark:** pick a theme in Settings (see above). The choice is applied before the page first draws, so there is no flash of the other theme.
- Season picker for standings, results, the calendar and the season review from previous years.
- All times in the device's local time zone, named in everyday words (for example "Times in India Standard Time"); weather days use the circuit's local date.
- Text is about 10% larger on laptops and 5% larger on tablets, for reading from a distance. Phones use the normal size so more fits on screen.

## Design

The screen designs live on a design canvas: [Pit Wall design canvas](https://claude.ai/artifact/UgpQJAyUaffXnHjuGgJke8). The canvas is private to its owner; others can open it only after it is shared from its Share menu. All boards use sample data with Max Verstappen as the favourite driver and Ferrari as the favourite team, and the boards link to each other through their menus. Driver, team and race names on the boards are links too, drawn with the same faint underline as in the app, and open the matching example board (one example driver, team and race).

| Page | Laptop board | Android tablet board (portrait) |
| --- | --- | --- |
| Dashboard (LIVE banner, next race, circuit map and facts, weekend forecast, last race, favourites, standings) | Dashboard (laptop) | Dashboard (Android tablet, portrait) |
| Live Timing (timing tower with mini-sectors, tyre history, DIFF, PIT NOW, speed and pedals; championship if it ended now; track map with sector top 3; team radio cards; FIA feed; track limits and investigations panels) | Live Timing (laptop), and Live Timing before the race starts (laptop) for the starting-grid view | Live Timing (Android tablet, portrait), and Live Timing: track map and team radio (Android tablet, portrait) for the screen further down |
| Live Timing during a live session without an OpenF1 token (timing from Formula 1's feed: note at the top, no SPEED or PEDALS columns, track map with flags and sector top 3 but no cars), and the "OpenF1 paused" notice shown if F1's feed is unavailable | Live Timing from F1's live feed (laptop), and OpenF1 paused during a live session (laptop) | Live Timing (phone) shows the feed note |
| Favourites: Driver tab | Favourites: Driver tab (laptop) | Favourites: Driver tab (Android tablet, portrait) |
| Favourites: Team tab | Favourites: Team tab and where the team appears | Favourites: Team tab (Android tablet, portrait) |
| Standings | Standings (laptop) | Standings (Android tablet, portrait) |
| Calendar | Calendar (laptop) | Calendar (Android tablet, portrait) |
| Race results (opened from Calendar), with the circuit overview, weekend weather and positions lap by lap | Race results (laptop) | Race results (Android tablet, portrait), and Race page: circuit, weather and positions (Android tablet, portrait) for the screen further down |
| Drivers | Drivers (laptop) | Drivers (Android tablet, portrait) |
| Driver page, any driver (opened from Drivers) | Driver page, any driver (laptop) | Driver page, any driver (Android tablet, portrait) |
| Settings, including "Watching on TV or later" (TV delay and spoiler-free mode) | Settings (laptop) | Settings (Android tablet, portrait) |
| Live Timing: qualifying knockout view (Q1 to Q3 columns, drop zone and cut line, PART and CUT-OFF, OUT tags) with rain watch | Live Timing: qualifying knockout view, with rain watch (laptop) | Live Timing: qualifying (phone) |
| Live Timing: tyre strategy chart and the four feed status pills (live, quiet, reconnecting, offline) | Live Timing: tyre strategy and feed status (laptop) | |
| Live Timing: practice long-run pace | Live Timing: practice long-run pace (laptop) | |
| Spoiler-free mode (Standings before Reveal, and what stays hidden) | Spoiler-free mode: Standings before Reveal (laptop) | |
| How to use (getting started, race day, reading Live Timing, watching later, planning ahead, questions) | How to use Pit Wall (laptop) | How to use Pit Wall (phone) |

Every board's header has the **?** button that opens the How to use board, as in the app. The Dashboard board also shows the **Add to calendar** button and a compact rain watch, the Calendar board the **Add remaining races to calendar** button, and the live feed boards the feed status pill and TV delay picker.

There is also a "Favourite driver: where it appears" board that maps every place the favourite driver shows up in the app.

The tablet boards show one screen (800 × 1280) with the bottom menu (Dashboard, Live Timing, Favourites, Standings, Calendar, Drivers). The app's tablet layout is a single scrolling column with the same sections, so some boards note what sits further down the page. Every page also has a phone board (390 × 844, titled "(phone)") in a row below the others: Dashboard, Live Timing, Favourites (Driver and Team tabs), Standings, Calendar, Drivers, Settings, Race results, the driver page, Live Timing in qualifying, and How to use. They use the compact header, the short bottom menu labels and the trimmed tables described under [Works everywhere](#works-everywhere), and their menus link to each other.

## Data sources

Formula 1 has no public official API. This app uses free community APIs:

| Source | Used for | Notes |
| --- | --- | --- |
| [OpenF1](https://openf1.org) | Timing, positions, gaps, laps, sectors and mini-sectors, tyres, pit stops (pit lane and stationary times), race control messages, track weather, car data (speed, throttle, brake, DRS), car positions (track map), overtakes, starting grid, session results (retirements, and the classification with points right after a race), championship standings right after a race, team radio, meetings (circuit type), lap-by-lap positions for the position chart, track outlines for circuits MultiViewer does not have | Historical data (2023 onward) is free: 30 requests a minute, 3 a second. During a live session, from 30 minutes before it starts until 30 minutes after it ends, every request without a token is refused (past sessions included); real-time access needs OpenF1's paid supporter plan (6 a second, 60 a minute), whose token goes in **Settings**. Default budget is 30 requests a minute, adjustable in Settings. |
| Formula 1 live timing (`livetiming.formula1.com`) | During live sessions without an OpenF1 token: timing, gaps, laps, sectors and mini-sectors, pit and retirement flags, tyres, grid positions, lap count, time left, track status, race control messages, weather, team radio and lap-by-lap positions | Unofficial and undocumented; it is the feed OpenF1 and other fan apps are built on. Read directly by your browser over a WebSocket, no account. Live car positions, car data and pit stop times need an F1 TV subscription and are not used. Formula 1 can change or restrict it at any time, and its terms limit how the data may be used; this app is a personal, non-commercial dashboard. |
| [Jolpica-F1](https://github.com/jolpica/jolpica-f1) | Calendar, results, qualifying, sprints, driver and constructor standings (also the starting point for the live championship; for the hours after a race until Jolpica publishes it, OpenF1 fills in), career totals, circuit history (winners, poles, fastest laps), planned race distance | Ergast-compatible. Responses are cached on the device: 10 minutes for standings, 15 minutes for the first page of a season's results, a week for full pages of rounds already run, and 30 days for past seasons. |
| [Open-Meteo](https://open-meteo.com) | Weekend weather on race pages (forecast and recorded), rain watch during live sessions | Free, no key, for non-commercial use. Requests come from your own device. |
| [MultiViewer](https://multiviewer.app) circuit API | Track outlines, turn numbers, marshal sectors and map rotation (Live Timing map and circuit overview), pit stop time loss estimates | Unofficial and free, no key. Layouts are cached on the device for a week. If MultiViewer has no layout for a circuit, the map is drawn from OpenF1's recorded car positions instead (see [Race and circuit pages](#race-and-circuit-pages)); if that is not available either, the map says so and the rest of the page works as normal. |

How some values are worked out:

- **FIA message types** come from the stewards' standard wording in each message. A message with unusual wording lands in "Other".
- **Results before Jolpica has them:** when the latest race or sprint should be over but Jolpica has no results for it yet, Pit Wall reads OpenF1's classification (positions, status and points) for the results, and OpenF1's championship standings (`championship_drivers`, `championship_teams`) for the points and order, ties included. Wins add one for the race winner to Jolpica's count after the previous round. If OpenF1's championship standings are not available, Pit Wall adds the session's points to Jolpica's standings after the previous round itself and orders ties by wins, then the previous order. Grid positions come from OpenF1's starting grid, and a driver who changed team during the season is matched to the team OpenF1 lists for that session (team names are learnt from drivers who drove for one team only). Post-race penalties published later are not reflected until Jolpica's results arrive. If OpenF1 does not answer within 4 seconds, Jolpica's data is shown as it is and the provisional data appears at the next refresh.
- **Finished rounds** are counted from the race results, because Jolpica's standings round can run ahead of the results.
- **When a title is decided:** after each round, the leader's lead is compared with the most a rival could still score (25 for every remaining Grand Prix and 8 for every remaining sprint for drivers; a one-two, 43 and 15, for teams). A title counts as decided once no rival can finish ahead: a rival who could only draw level on points still counts as a threat unless they could not also match the leader's number of wins (the first step of countback). Points are added up from the season's race and sprint results.
- **Title maths** assumes 25 points for a Grand Prix win and 8 for a sprint win (a one-two of 43 and 15 for a team), with no fastest-lap point. Ties decided by countback are not modelled.
- **Overtakes** are as recorded by OpenF1 and only shown for races and sprints.
- **Race distance (lap X/Y)** is the number of laps the winner ran in the latest race (or sprint) at that circuit. It is off if that race was shortened.
- **Sector lines** are not published, so they are placed where a car was when its sector 1 and sector 2 times ended on a fast clean lap. For a race still to come, that lap is from the latest earlier weekend at the circuit, so a layout change since then would put them slightly off until the weekend's first session.
- **Recorded track outlines** (circuits MultiViewer does not have) follow one car's fastest lap, so they show the racing line rather than the track's centre line, and the map is shown north-up rather than in the F1 TV orientation.
- **Lap length** is measured along the track outline the map is drawn from, usually within about 2% of the official figure.
- **From Formula 1's live feed:** gaps, intervals and the personal and overall best highlights are F1's own figures. Lap history (for the gap chart and last-lap sector colours) is recorded from the moment the page connects, because the feed only sends the current state. Wind speed is converted from metres per second.
- **OpenF1 paused window:** worked out from the race calendar as 30 minutes before each session until 30 minutes after its usual length (2 hours for a race, 1 hour for practice, qualifying and sprints, 45 minutes for sprint qualifying). A red flag or long safety car can push the real end back, so the app keeps checking for up to an extra hour.
- **Pit status** comes from OpenF1's pit records and mini-sector codes (a mini-sector flagged as pit lane). **STOP** means live car data shows 0 km/h away from the pit lane.
- **Starting grid** is OpenF1's official grid for the matching qualifying session, which includes grid penalties.
- **Positions lap by lap**: OpenF1 records a row only when a position changes, so each driver's position at the end of a lap is the last change before that lap ended. Formula 1's live feed lists each driver's position at the start and after every lap directly.
- **Pit stop times** use OpenF1's `lane_duration` (pit lane) and `stop_duration` (stationary); the older `pit_duration` is deprecated and only used as a fallback.
- **Weather days** group sessions by the circuit's local date, using the time zone Open-Meteo reports for the location.
- **PIT NOW** adds the circuit's pit loss (MultiViewer's estimate; the safety car or VSC figure while the race is neutralised) to each car's live gap to the leader and places the result among the other cars' gaps. It ignores tyre warm-up, slow stops and the field changing during the stop, so treat it as a guide. Lapped cars have no time gap and are left out.
- **Qualifying cut** uses the number of cars that take part in each part: from F1's feed live, and after the session from how many drivers set a time in Q2 and Q3. Knocked-out drivers are worked out from the classification order, so a grid penalty does not move them.
- **Long-run pace**: the per-lap figure is the slope of a straight line through the run's lap times, so it mixes tyre wear with fuel burning off. Treat comparisons between teams as a guide, since fuel loads are not published.
- **Rain watch** counts 0.1 mm or more in 15 minutes as rain, and mentions the chance of rain when it reaches 40% in the next 3 hours.
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

Or install the **Android app**: on the How to use page, tap **Download for Android** (or open https://sarthak125.github.io/Pit-wall/pit-wall.apk), open the file and allow installs from your browser when asked. It is a Trusted Web Activity: a 1 MB app (Android 7 or newer) that opens this site full screen in Chrome, so it always has the latest version. It is not on the Play Store. How it is built, signed and updated is in [`android/README.md`](android/README.md).

Installing needs the site to be served over **HTTPS**, which GitHub Pages does. For a quick test without hosting, run `npm run dev` on the laptop and open `http://<laptop-ip>:3030` on the tablet or phone while both are on the same Wi-Fi. That works in the browser, but Android will not install it as an app over plain HTTP.

## Tests

```bash
npm test
```

```bash
npm run build
```

```bash
npm run test:e2e
```

- **Unit tests** (Vitest, `tests/unit`): merging F1 feed updates, lap time parsing, turning a real feed snapshot into the timing tower, long-run pace, qualifying knockouts, calendar files, OpenF1's live windows, the request limiter, the cache (shared requests, keeping past results, dropping the oldest entries when storage is full), the race story and the lap time comparison.
- **Browser tests** (Playwright, `tests/e2e`): every page at laptop and phone width with no errors and no sideways scrolling; the finished race (gaps, positions chart, pit stops, tyre strategy), qualifying knockouts, practice long runs, spoiler-free mode, the calendar download, Live Timing on a stand-in F1 feed during a live race, the feed dropping and reconnecting, the race story, the lap time comparison, picking the light theme, and moving between pages showing only the new page.
- The browser tests use recorded API responses from the 2026 Las Vegas weekend (`tests/fixtures`) and a fixed clock, so they do not depend on OpenF1, Jolpica, MultiViewer or Open-Meteo being up or within their limits. If an app change needs data the recordings do not have, the test fails rather than calling the real service; record again in that case, or add the missing response as a file (the standings after round 20, `tests/fixtures/r20-*.json`, were added this way).
- The first time, install the browser with `npx playwright install chromium`.
- **Off-season check** (`tests/manual/offseason.cjs`, not part of the automatic tests): fakes the date and Jolpica's answers for four stages between seasons (season over, next calendar out, new season with no races, new season with no calendar) and reports what the Dashboard, Standings, Calendar, season review and Settings show, with screenshots. Run it against a local build:

```bash
npx vite preview --port 4173
```

```bash
node tests/manual/offseason.cjs offseason-check http://localhost:4173/
```

- **Live check** (`tests/live/check-live.cjs`, not part of the automatic tests): run during a real session to check the live site. It opens Live Timing at laptop and phone size for a minute and reports whether Formula 1's feed connects and sends data, the feed status pill, the timing tower filling in and updating, the Dashboard's LIVE banner, sideways scrolling and errors, with screenshots:

```bash
node tests/live/check-live.cjs https://sarthak125.github.io/Pit-wall/ live-check
```

## Deploy

The build is a static site in `dist/`:

```bash
npm run build
```

- **GitHub Pages:** in the repository go to Settings, Pages, and set Source to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` runs the tests and then builds and publishes on every push to `main`; if any test fails, nothing is published and the live site stays as it was. This adds about 2 minutes to each deploy. The site is served at `https://<user>.github.io/<repo>/` (for this repository, https://sarthak125.github.io/Pit-wall/). The workflow builds with the repository's name as the path, so renaming the repository moves the site to the new address on the next deploy and the old address stops working.
- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output folder `dist`.
- **Android app:** the APK in `public/pit-wall.apk` deploys with the site. The file that lets it open without an address bar (`/.well-known/assetlinks.json`) lives in the separate [`Sarthak125.github.io`](https://github.com/Sarthak125/sarthak125.github.io) repository, which serves https://sarthak125.github.io/ and forwards the home page to Pit Wall. Building and signing new versions: [`android/README.md`](android/README.md).

## Project layout

```
src/api/         OpenF1, Jolpica, MultiViewer (circuits) and Open-Meteo (weather) clients, Formula 1 live timing
                 feed client (f1live), rate limiter, cache
src/hooks/       Polling, live timing, season data and favourites hooks
src/lib/         Race story (raceStory), lap time comparison (lapCompare), theme, title decisions (titles), season review figures (seasonReview), FIA message classifier and plain-English wording, driver stats, alerts, formatting, team colours,
                 calendar files (ics), long runs,
                 settings, routing, track geometry, sector lines, lap-by-lap positions, app updates, OpenF1 live
                 windows (openf1Window), F1 feed to app data adapter (f1adapter)
src/pages/       Dashboard, Live Timing, Favourites (My Driver, My Team), Standings, Calendar, Race results, Drivers, Settings, How to use (Help), Season review
src/components/  App shell, charts, live track map, live championship, gap chart, dashboard extras, circuit overview and outline, weekend weather,
                 position chart, live driver and team views, team radio cards, FIA messages, strips, alerts, update
                 banner, champions banner, feed status, tyre strategy, long-run pace, rain watch, add to calendar, spoiler cover,
                 TV delay picker, race story, lap time comparison, loading and error states
android/         Android app (Trusted Web Activity) project, generator, Digital Asset Links file and build notes
tests/           Unit tests (unit), browser tests (e2e), recorded API responses and feed snapshot (fixtures), and the
                 live session check (live) and off-season check (manual)
```

## Notes

- **Loading:** Jolpica allows about 2 requests a second, so a first visit mostly waits on it. To keep that short: two parts of a page asking for the same data at the same moment share one request; a season's results pages are requested together rather than one after another; results already shown stay on the device (see [Data sources](#data-sources)), and when storage fills up the oldest saved responses are dropped first; and each page's code loads when that page is first opened (all of it is still saved for offline use). Measured on the live site: Calendar about 4 s and Dashboard about 6.5 s on a first visit (before: 9 s and 11 s), a fraction of a second on a repeat visit.
- Live Timing stays under OpenF1's default budget of 30 requests a minute (about 28 with the track map and team radio): gaps every 10 seconds, race control every 20, positions, speed and pedals every 15, track map positions every 12, and laps, tyres, pit stops, radio, weather and the classification less often. Raise the budget in Settings (for example with a paid OpenF1 plan) and everything polls faster, up to twice as often at 60 a minute. Polling pauses while the app is in the background. Replays load a minute of positions at a time. The optional live track map on the driver page (Settings) adds about 15 requests a minute.
- Data already loaded is kept in memory for the visit, so returning to a session or page is instant: a finished session is not downloaded again for 5 minutes, and a live one carries on from where it left off. Requests for a session or page you have already left are cancelled without using any of the budget, and new pages start loading a fraction of a second after you open them, so flicking through sessions costs nothing.
- Formula 1's live feed sends about 180 KB a minute during a race, over one connection that only opens during a session's live window and closes a minute after you leave the live pages.
- If a data service answers "too many requests", the app waits at most 10 seconds before retrying, so a page never stalls; the weather card says the service is not answering instead.
- Rain watch adds one Open-Meteo request every 10 minutes while a session is live, and none to OpenF1.
- Open-Meteo's free tier is for non-commercial use, which fits a personal dashboard.
- Team radio is audio only. Automatic transcripts were tried, but F1's radio file server blocks GitHub's servers, so they cannot be produced without running a machine of your own.
- The OpenF1 token is stored only in the device's browser storage and sent only to api.openf1.org.
