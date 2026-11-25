# Pit Wall: F1 dashboard

An installable web app (PWA) for Formula 1: live timing with a moving track map, pit stop predictions and live championship standings, FIA race control and stewards' messages in plain English, team radio, standings, a calendar with a page for every race and circuit (with the race story and a lap time comparison), driver and team pages, and a personal page for your favourite driver and team. One codebase runs in a laptop browser and installs on an Android tablet or phone like an app.

Live site: https://sarthak125.github.io/Pit-wall/

Code: https://github.com/Sarthak125/Pit-wall

Unofficial fan project. Not affiliated with Formula 1, the FIA or any team.

## Recently added

### Latest

- **Driver page: the biography sits beside the card:** the Wikipedia summary now appears next to the driver's card (above "How to read the card", or under the card on a phone) instead of in a separate About section with a second photo. The card already carries the photo, with its credit on the back. A driver without a card still gets the summary on its own. See [Driver cards](#driver-cards).
- **Cards after any round:** a **Cards after** picker on the Cards view, the Compare view and the card on each driver page shows the cards as they were after an earlier round (the latest is the default). The change arrows compare with the round before the chosen one, and the position chart on the back stops at it. After round 1 every card is still "building". See [Driver cards](#driver-cards).
- **Licensed photos on driver pages:** the driver page header now uses the same licensed Commons photo as the cards (a plain placeholder when there is none), while the team radio cards keep the OpenF1 headshots (formula1.com images) with initials as the fallback, so the Drivers page and driver pages no longer load formula1.com headshots.
- **Drivers page is now the driver cards:** the page opens on the card grid (4 columns on a laptop, one per row on a phone), sortable by standing, overall rating or any stat and filterable by team. Under every card there is an **Open <driver> profile** link and the favourite star. The old List tab is gone, since each card already shows team, number, standing, points and recent form, and the formula1.com headshots are replaced by the freely licensed photos. Compare stays as the second tab. See [Driver cards](#driver-cards).
- **Compare two drivers:** a **Compare** tab on the Drivers page puts two drivers' cards side by side, with a table below showing each one's overall rating and six stat ratings next to the real figures. The higher rating on each line is marked in gold. See [Driver cards](#driver-cards).
- **Cleaner card chart:** on the back of a driver card, the position chart's axis labels now sit in their own column instead of on top of the line.
- **Driver cards:** every driver has a collectible card built from this season's results: a photo, an overall rating, six stat ratings from 1 to 99 (higher is always better) with the real figure under each, and a back with the season trend, best and lowest results and the head-to-head with the team-mate. It is on every driver page, and the Drivers page has a **Cards** view you can sort and filter by team. The ratings move after every race. See [Driver cards](#driver-cards).
- **Title what-if on driver pages:** when a driver can still win the title (or leads and could still lose it), the Title maths card has a **What if?**: pick a rival and where each of the two finishes in every remaining Grand Prix and sprint, and see who ends the season ahead, plus the lowest finish the driver can afford. See [Driver and team pages](#driver-and-team-pages).
- **Data copy fix:** the Jolpica copy job had left out 54 files of the 2025 season (including its final standings), so the app asked Jolpica for them. It now fetches any file the live copy lacks, even for a finished season, and names any that stay missing in its log.
- **Pit stops:** every race page has a Pit stops card ranking each stop by how long the car stood still, with the lap and the tyres taken off and fitted. Standings has a **Pit stops by team** table (typical stop, fastest stop and number of stops), loaded when you ask for it. See [Race and circuit pages](#race-and-circuit-pages).
- **Qualifying gap between team-mates:** each team-mate battle in the Season review now shows the typical gap between the pair's qualifying laps, in percent and seconds.
- **Pit Wall's own copy of finished OpenF1 sessions:** laps, stints, pit stops, race control messages, drivers, results and grids of this season's finished sessions are copied onto the site, so race pages open at once, spend none of OpenF1's request budget and keep working while OpenF1 is slow or refusing requests. See [Our own copy of the OpenF1 data](#our-own-copy-of-the-openf1-data).
- **Data copy status and alert:** Settings has a Data copy card saying how old the Jolpica copy is, with a warning when refreshes have stopped. If the copy is more than 12 hours old, the deploy workflow opens a GitHub issue (and closes it once the copy is fresh again).
- **Pit Wall's own copy of the Jolpica data:** the calendar, results and standings are refreshed every 3 hours and published with the site, and the app reads that copy first. First visits are faster (Calendar about 1.9 s and Dashboard about 1.7 s, from 3.9 s and 6.0 s) and these pages keep working when Jolpica is slow or down. See [Our own copy of the Jolpica data](#our-own-copy-of-the-jolpica-data).
- **Slow servers no longer stall pages:** if a source has not answered after 5 seconds and the device has a saved copy, the page shows that copy with a yellow note and refreshes itself when the source answers. A gateway timeout is no longer retried straight away.
- **Several missing races covered:** if Jolpica is behind by more than one race, every missing weekend (up to four) is filled in from OpenF1 timing data, with the standings built across them. See [Between a race and Jolpica](#between-a-race-and-jolpica).
- **Live Timing for any earlier weekend:** a Weekend picker next to the Session picker opens any weekend of the chosen season (2023 onward) with its full timing tower, tyres, sectors, track map replay, FIA messages and team radio.
- **Fastest laps compared point by point:** a second view in the race page's lap time comparison: speed, the gap between two drivers, throttle and braking along their fastest laps, and a track map coloured by who was quicker where.
- **Race pace and tyre wear:** a card on race pages ranking each driver's typical race-pace lap, with every stint's tyre and time lost per lap.
- **About cards from Wikipedia:** a short summary on driver, team and circuit pages, with credit and a link (on a driver page it sits beside the driver's card, which carries the photo).
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
- **Any earlier weekend:** a **Weekend** picker next to the Session picker lists every weekend of the chosen season that has started (2023 onward, newest first, pre-season testing left out). Pick one and the Session picker switches to that weekend's sessions, opened on its last one (usually the race), with the same timing tower, tyres, sectors, track map replay, FIA messages, team radio and charts as for the latest weekend. While a session is live, Live Timing still opens on it.
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
- **Fastest laps compared** (the lap time comparison's second view, "Fastest laps: speed and gap"): the same two drivers and session, their fastest laps point by point from OpenF1 car data (about 4 readings a second). A track map coloured by who was quicker in each of 25 parts of the lap, and charts along the lap for speed, the gap between them, throttle and braking, with a hover or tap tooltip showing both speeds, gears and who was ahead there. Distance is worked out from speed and both laps are scaled to the same length, so the gap matches the official lap times at the line but is an estimate in between (about a tenth of a second at worst).
- **Pit stops** (finished races and sprints from 2023 onward): every stop ranked by stationary time, fastest first, with the lap and the tyres taken off and fitted (for example soft to medium). A line above the table gives the fastest stop and the typical stop (the middle time). Stops of 6 seconds or more are marked long and left out of the typical time, so one unusually long stop does not decide it; OpenF1 does not record why a stop was long. The top 10 and your favourite are shown, with a button for all stops. If OpenF1 has no stationary times for a race, stops are ranked by time in the pit lane instead, and the card says so (pit lane time depends on the circuit, so it is only used within one race).
- **Race pace and tyre wear** (finished races and sprints from 2023 onward): drivers ranked by their typical lap at race pace (the middle lap time, leaving out the first lap, pit laps and laps more than 7% slower than that tyre set's best: safety car, virtual safety car and traffic), with the gap to the best and, for every stint, the tyre, the laps that count and the time lost per lap (a straight-line fit over 5 or more laps; fuel burning off makes cars faster, so it can be below zero). The top 10 and your favourite are shown, with a button for everyone. A leader managing the gap often looks slower than the cars fighting behind, so treat small gaps with care.
- **About the circuit:** a short Wikipedia summary at the bottom of the circuit card (named by the article Jolpica links to, which for some circuits is the race's article).
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
- **Drivers:** every driver of the season as a card (see [Driver cards](#driver-cards)), with a link under it to the driver's page (see below) and the star to pick your favourite.
- **Pit stops by team** (2023 onward): below the standings, a button loads every finished race's pit stops and shows each team's typical stop (the middle stationary time, without stops of 6 seconds or more), fastest stop and number of stops. It reads one request per race, so it loads only when asked, and fills quickly for races held in Pit Wall's own OpenF1 copy. Hidden in spoiler-free mode while the standings are. Sprints are not included.

### Driver cards

- **Where:** a **Driver card** section on every driver page (with the explanation beside it), and the Drivers page, which shows every driver's card (tabs **Cards** and **Compare**), sortable by championship standing, overall rating or any one stat, and filterable by team. Under each card are an **Open <driver> profile** link and the favourite star; clicking the card itself turns it over. In spoiler-free mode the cards are covered, because they are worked out from the results, and the page lists only the drivers' names with the same link and star.
- **Compare:** pick any two drivers (by default your favourite, or the leader, against the next driver) to see their two cards side by side and a table with the overall rating and each stat: the 1 to 99 rating in bold with the real figure beside it (for example "19.5 pts" or "15 of 19 rounds"). Gold marks the higher rating; a line is left unmarked when the ratings are level or a driver does not yet have three starts.
- **The six stats** (this season so far, from Jolpica results): points per race, qualifying (average position), race finish (average position when classified), points finishes (share of starts in the top 10), finish rate (share of starts classified) and team-mate duel (rounds qualified ahead of the team-mate).
- **Ratings:** each stat is turned into a rating from 1 to 99 showing where the driver stands among everyone with at least three starts: 99 is the best of the field and higher is always better (gold 85 and up, green 70 and up, amber 50 and up). A rating follows the order of the field, not the size of the gaps. The real figure sits under it, and a small arrow shows how the rating moved since the previous round. Until a driver has three starts the card shows how many races are missing instead of ratings.
- **Overall rating:** the big number is a weighted mix of the six ratings: points per race 30%, race finish 20%, qualifying 15%, team-mate duel 15%, points finishes 10%, finish rate 10%. The weights are Pit Wall's own choice, not an official measure, so the order can differ from the championship (the card also shows the real position and points). The card says so.
- **Frame:** gold for the championship leader, silver for the rest of the top three, team colour for everyone else, and a plain frame for a driver still building.
- **Back of the card** (click, or the turn button for keyboards): the championship position after each round, best and lowest finish with the race, wins, podiums, poles and retirements, and the head-to-head with the team-mate (races ahead, qualifying ahead, points). It also credits the photo.
- **Photos:** each driver's lead Wikipedia photo when it is a freely licensed image on Wikimedia Commons (Creative Commons, public domain or the Open Government Licence), saved with its author and licence, credited on the back with a link to the licence. A driver without one gets a silhouette. Photos from formula1.com, teams or agencies are not used: a credit does not give permission to use them. See [Our own copy of the driver photos](#our-own-copy-of-the-driver-photos).
- **Earlier rounds:** the **Cards after** picker shows every card as it stood after a chosen round, worked out from the results up to that round. Arrows compare with the round before it and the back's position chart ends there. It does not change the official standings: only the latest round uses them.
- **Motion:** the card tilts and a soft foil shimmer follows the pointer; it is off for touch and when the device asks for reduced motion.

### Driver and team pages

Every driver and team has its own page, with the same layout as the Favourites tabs:

- **About cards:** driver, team and circuit pages show a short summary from Wikipedia (the article Jolpica links to). On a driver page the text sits beside the driver's card, which carries the photo (see [Driver cards](#driver-cards)), so there is no second photo; other pages use a photo from Wikimedia Commons only where there is a freely licensed one (logos and fair-use images are left out). Each card links to its Wikipedia article (and the photo's Commons page where there is a photo), notes the text licence (CC BY-SA 4.0) and that it may not include the latest results, and in spoiler-free mode driver and team cards are hidden until the weekend is revealed. If Wikipedia cannot be reached the card simply does not appear.
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
| Drivers | The favourite's star under their card is filled | | |

Notes:

- Race results addresses come in two forms. `#/race/20` follows the season picker (used by the Dashboard and Calendar). `#/race/2023/21` carries its own season (used by the circuit history tables), and its previous and next links stay in that season.
- Every link has a faint underline, so it is clear what you can tap (there is no hover on a tablet); the underline brightens on hover or keyboard focus.
- **Title what-if:** under Title maths, shown while the title is still open for the driver (a rival can still be caught, or the driver leads by less than the points left). Choose a rival (the leader, or the closest chaser for the leader) and a finishing position for each driver, from P1 to outside the points. Both take that position in every remaining Grand Prix and sprint (25 to 1 points, 8 to 1 in sprints, no fastest-lap point), and the card shows each driver's final points, who would be champion, and the lowest position the driver can have and still finish ahead. A tie on points is reported as level, because countback (most wins first) is not modelled. It is a guide: real seasons are messier.

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
- **Team-mate battles:** for each team's regular pair (the two drivers with the most Grands Prix for it), who finished ahead in races they both started, who qualified ahead, and points, with bars in the team colour, plus the typical qualifying gap between the pair: the middle of the per-round gaps, each taken in the last qualifying session both drivers set a time in, as a share of the lap and in seconds. The middle is used so one wet session or crash does not decide it.
- **Teams:** points, wins, podiums, one-twos and best result.

Figures are for Grands Prix, except points, which include sprints. A driver who changed team during the season is listed with the team of their latest race.

### Between a race and Jolpica

Jolpica can take hours to publish a race, or longer when it is having trouble. Until it does, standings, the title chart, the last race card, the Calendar winner and the race page use Formula 1 timing data from OpenF1 (the official classification, the starting grid and OpenF1's championship standings), marked **Updated after <race> · F1 timing**. If Jolpica is behind by more than one race, every missing weekend (up to four) is filled in, oldest first, with the points added up across them and OpenF1's own championship table correcting the final totals; the note then names every race it covers. Jolpica's confirmed data replaces all of this automatically as soon as it has it. Only OpenF1's data from 2023 onward can be used this way.

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
- **Data copy:** how long ago Pit Wall's own copy of the Jolpica data was fetched, and a note when it is more than 12 hours old (the refresh has missed several runs).
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
| Drivers (the card grid, with a profile link and favourite star under each card) | Drivers page: cards with a profile link and favourite star (laptop) | Drivers page: cards with a profile link and favourite star (Android tablet, portrait) |
| Driver page, any driver (opened from Drivers) | Driver page, any driver (laptop) | Driver page, any driver (Android tablet, portrait) |
| Settings, including "Watching on TV or later" (TV delay and spoiler-free mode) | Settings (laptop) | Settings (Android tablet, portrait) |
| Live Timing: qualifying knockout view (Q1 to Q3 columns, drop zone and cut line, PART and CUT-OFF, OUT tags) with rain watch | Live Timing: qualifying knockout view, with rain watch (laptop) | Live Timing: qualifying (phone) |
| Live Timing: tyre strategy chart and the four feed status pills (live, quiet, reconnecting, offline) | Live Timing: tyre strategy and feed status (laptop) | |
| Live Timing: practice long-run pace | Live Timing: practice long-run pace (laptop) | |
| Spoiler-free mode (Standings before Reveal, and what stays hidden) | Spoiler-free mode: Standings before Reveal (laptop) | |
| How to use (getting started, race day, reading Live Timing, watching later, planning ahead, questions) | How to use Pit Wall (laptop) | How to use Pit Wall (phone) |

Every board's header has the **?** button that opens the How to use board, as in the app. The Dashboard board also shows the **Add to calendar** button and a compact rain watch, the Calendar board the **Add remaining races to calendar** button, and the live feed boards the feed status pill and TV delay picker.

There is also a "Favourite driver: where it appears" board that maps every place the favourite driver shows up in the app.

Newer boards, added as features arrived (laptop unless marked phone):

- **Race story and lap time comparison** (also phone), **Race pace and tyre wear, and fastest laps compared** (also phone), and **Pit stops** (also phone): the cards on race pages.
- **Light theme: Dashboard and the Appearance setting** (also phone).
- **Track maps:** sectors for upcoming races and for circuits without a MultiViewer layout.
- **About cards from Wikipedia:** driver, team and circuit summaries (the driver one has no photo of its own, since the card carries it; the photo placeholder remains only where a page shows a Commons photo). Also a phone board for the card layout. The driver card boards show the biography beside the card.
- **Live Timing: pick any earlier weekend:** the Weekend picker.
- **When a source is slow or down:** the yellow saved-data note and Pit Wall's own data copy.
- **Data copy status and alerts:** the Settings card in its three states, the OpenF1 copy and the freshness check.
- **Team-mate qualifying gap:** the Season review battle cards with the new gap line.
- **Title what-if on driver pages** (also phone): shown with example standings (Antonelli's points cut), because the real 2026 title is already decided and the card does not appear on the live site.
- **Driver cards:** the Drivers page as a grid of cards, on laptop, Android tablet and phone (the Drivers boards in the table above), with the driver page's card shown front and back (also phone), and the Compare view (also phone). The old List view no longer has a board. These boards also show the **Cards after** round picker, and one more laptop board shows the cards after round 8 next to the same driver's card now.

Several of the newest boards (Pit stops, Team-mate qualifying gap, Data copy, the driver card boards and the race analysis boards) use real values read from the app on 2026 data (the Las Vegas Grand Prix and the season to 24 November) instead of the sample data used elsewhere (the Data copy board labels which of its example times are made up). Photos on the About boards are placeholders, while the driver card boards use the real licensed photos (credited on the back of each card).

The tablet boards show one screen (800 × 1280) with the bottom menu (Dashboard, Live Timing, Favourites, Standings, Calendar, Drivers). The app's tablet layout is a single scrolling column with the same sections, so some boards note what sits further down the page. Every page also has a phone board (390 × 844, titled "(phone)") in a row below the others: Dashboard, Live Timing, Favourites (Driver and Team tabs), Standings, Calendar, Drivers, Settings, Race results, the driver page, Live Timing in qualifying, and How to use. They use the compact header, the short bottom menu labels and the trimmed tables described under [Works everywhere](#works-everywhere), and their menus link to each other.

## Data sources

Formula 1 has no public official API. This app uses free community APIs:

| Source | Used for | Notes |
| --- | --- | --- |
| [OpenF1](https://openf1.org) | Timing, positions, gaps, laps, sectors and mini-sectors, tyres, pit stops (pit lane and stationary times), race control messages, track weather, car data (speed, throttle, brake, DRS), car positions (track map), overtakes, starting grid, session results (retirements, and the classification with points right after a race), championship standings right after a race, team radio, meetings (circuit type), lap-by-lap positions for the position chart, track outlines for circuits MultiViewer does not have, car data and positions for the fastest-laps comparison, laps and tyre stints for race pace | Historical data (2023 onward) is free: 30 requests a minute, 3 a second. During a live session, from 30 minutes before it starts until 30 minutes after it ends, every request without a token is refused (past sessions included); real-time access needs OpenF1's paid supporter plan (6 a second, 60 a minute), whose token goes in **Settings**. Default budget is 30 requests a minute, adjustable in Settings. Finished sessions of this season are also read from Pit Wall's own copy first (see [Our own copy of the OpenF1 data](#our-own-copy-of-the-openf1-data)); OpenF1's site states its content is licensed CC BY-NC-SA 4.0. |
| Formula 1 live timing (`livetiming.formula1.com`) | During live sessions without an OpenF1 token: timing, gaps, laps, sectors and mini-sectors, pit and retirement flags, tyres, grid positions, lap count, time left, track status, race control messages, weather, team radio and lap-by-lap positions | Unofficial and undocumented; it is the feed OpenF1 and other fan apps are built on. Read directly by your browser over a WebSocket, no account. Live car positions, car data and pit stop times need an F1 TV subscription and are not used. Formula 1 can change or restrict it at any time, and its terms limit how the data may be used; this app is a personal, non-commercial dashboard. |
| [Jolpica-F1](https://github.com/jolpica/jolpica-f1) (and Pit Wall's own copy of it) | Calendar, results, qualifying, sprints, driver and constructor standings (also the starting point for the live championship; for the hours after a race until Jolpica publishes it, OpenF1 fills in), career totals, circuit history (winners, poles, fastest laps), planned race distance | Ergast-compatible. Responses are cached on the device: 10 minutes for standings, 15 minutes for the first page of a season's results, a week for full pages of rounds already run, and 30 days for past seasons. The calendar, results and standings are read from Pit Wall's own refreshed copy first (see [Our own copy of the Jolpica data](#our-own-copy-of-the-jolpica-data)). A saved copy of any age is shown if Jolpica has not answered after 5 seconds. Data under CC BY-NC-SA 4.0 (non-commercial use, credit Jolpica-F1). |
| [Open-Meteo](https://open-meteo.com) | Weekend weather on race pages (forecast and recorded), rain watch during live sessions | Free, no key, for non-commercial use. Requests come from your own device. |
| [Wikipedia](https://en.wikipedia.org/api/rest_v1/) REST API (page summaries) | The About cards: a short summary for drivers, teams and circuits (and a photo where a page shows a freely licensed one), found through the Wikipedia link Jolpica gives for each | Free, no key, allowed from the browser. Text under CC BY-SA 4.0; photos only from Wikimedia Commons, each with its own author and licence (linked). Cached for a week. The driver cards use the same lead photos, but from Pit Wall's own copy (see [Our own copy of the driver photos](#our-own-copy-of-the-driver-photos)). |
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

- **Unit tests** (Vitest, `tests/unit`): merging F1 feed updates, lap time parsing, turning a real feed snapshot into the timing tower, long-run pace, qualifying knockouts, calendar files, OpenF1's live windows, the request limiter, the cache (shared requests, keeping past results, dropping the oldest entries when storage is full), the race story, the lap time comparison, telemetry and race pace calculations, the file names of the Jolpica and OpenF1 copies and the OpenF1 backup across several missing weekends, the age of the data copy, driver card ratings, overall rating and the compare table, the copy job itself (run against a stand-in Jolpica), pit stop ranking and team summaries, the qualifying gap between team-mates and title what-if scenarios.
- **Browser tests** (Playwright, `tests/e2e`): every page at laptop and phone width with no errors and no sideways scrolling; the finished race (gaps, positions chart, pit stops, tyre strategy), qualifying knockouts, practice long runs, spoiler-free mode, the calendar download, Live Timing on a stand-in F1 feed during a live race, the feed dropping and reconnecting, the race story, the lap time comparison, picking the light theme, moving between pages showing only the new page, fastest laps compared, race pace, the Wikipedia cards, a page showing saved data within seconds when Jolpica is slow, and pages loading from Pit Wall's own copy with Jolpica down.
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

- **GitHub Pages:** in the repository go to Settings, Pages, and set Source to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` runs the tests and then builds and publishes on every push to `main`; if any test fails, nothing is published and the live site stays as it was. The tests take about 4.5 minutes and the build with the data copies 1 to 2 minutes, so a deploy takes about 6 to 7 minutes in all (measured on 24 Nov 2026); a run that has a lot of OpenF1 data to copy for the first time can take 10 minutes or more, because the copy job is allowed up to 14 minutes. Scheduled runs skip the tests. The site is served at `https://<user>.github.io/<repo>/` (for this repository, https://sarthak125.github.io/Pit-wall/). The workflow builds with the repository's name as the path, so renaming the repository moves the site to the new address on the next deploy and the old address stops working.
- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output folder `dist`.
- **Android app:** the APK in `public/pit-wall.apk` deploys with the site. The file that lets it open without an address bar (`/.well-known/assetlinks.json`) lives in the separate [`Sarthak125.github.io`](https://github.com/Sarthak125/sarthak125.github.io) repository, which serves https://sarthak125.github.io/ and forwards the home page to Pit Wall. Building and signing new versions: [`android/README.md`](android/README.md).

## Project layout

```
src/api/         OpenF1, Jolpica, MultiViewer (circuits) and Open-Meteo (weather) clients, Formula 1 live timing
                 feed client (f1live), rate limiter, cache
src/hooks/       Polling, live timing, season data and favourites hooks
src/lib/         Race story (raceStory), lap time comparison (lapCompare), telemetry and race pace (telemetry, racePace), copy file names (mirrorKey), theme, title decisions (titles), season review figures (seasonReview), FIA message classifier and plain-English wording, driver stats, alerts, formatting, team colours,
                 calendar files (ics), long runs,
                 settings, routing, track geometry, sector lines, lap-by-lap positions, app updates, OpenF1 live
                 windows (openf1Window), F1 feed to app data adapter (f1adapter)
src/pages/       Dashboard, Live Timing, Favourites (My Driver, My Team), Standings, Calendar, Race results, Drivers, Settings, How to use (Help), Season review
src/components/  App shell, charts, live track map, live championship, gap chart, dashboard extras, circuit overview and outline, weekend weather,
                 position chart, live driver and team views, team radio cards, FIA messages, strips, alerts, update
                 banner, champions banner, feed status, tyre strategy, long-run pace, rain watch, add to calendar, spoiler cover,
                 TV delay picker, race story, lap time comparison, fastest laps compared, race pace, Wikipedia cards, slow-server note, loading and error states
scripts/         Data copy jobs (mirror-jolpica.mjs, mirror-openf1.mjs, mirror-photos.mjs) and the copy freshness check (check-copy.mjs), run by the deploy workflow every 3 hours
android/         Android app (Trusted Web Activity) project, generator, Digital Asset Links file and build notes
tests/           Unit tests (unit), browser tests (e2e), recorded API responses and feed snapshot (fixtures), and the
                 live session check (live) and off-season check (manual)
```

## Our own copy of the Jolpica data

Jolpica is a free, volunteer-run service and can be slow or down (it was for about 20 hours after the 2026 Las Vegas Grand Prix). To keep Pit Wall working:

- **What is copied:** the calendar, race, sprint and qualifying results and the driver and constructor standings (after every round too) of the current and previous season. About 350 small files, published under `data/jolpica/` with the site, with an index (`manifest.json`) saying when the data was fetched.
- **How it is refreshed:** the deploy workflow runs every 3 hours (and on every push). Scheduled runs only refresh the data and republish; they skip the tests because no code changed. The job (`scripts/mirror-jolpica.mjs`) asks Jolpica politely: about 2 requests a second, under its 500 an hour limit, named `PitWall/1.0` as Jolpica's documentation requires. Older rounds' standings and finished seasons are reused rather than fetched again, so a normal run makes about 20 requests. A file the live copy lacks is fetched even for a finished season (the job once left out 54 files of 2025 this way, which the app then asked Jolpica for), and any file still missing is named in the job's log ("Missing from the copy").
- **If Jolpica fails:** a timeout, a refusal or a rate limit stops the run's requests, and the copy already on the live site is kept file by file. A run never makes the copy worse, and any gaps fill in on the next run.
- **How the app uses it:** it reads the copy first. A copy fetched within the last 12 hours is used as it is; an older one gives Jolpica 6 seconds to answer first. Anything the copy does not hold (career and circuit history, older seasons) still comes from Jolpica, with the saved-copy fallback above. The race that finished most recently is filled in from OpenF1 until the next refresh has it.
- **Licence:** Jolpica's data is shared under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): free to share with credit, for non-commercial use, under the same licence. The copy's index file says so, and Pit Wall must stay a non-commercial project to keep using it.

## Our own copy of the driver photos

The driver cards show each driver's lead photo from Wikipedia when it is freely licensed. Asking Wikipedia and Commons for 25 photos on every visit would be slow and would run into their rate limits, so the deploy workflow keeps a copy:

- **What is copied:** for each driver in the current season, the lead photo of their English Wikipedia article, when it is a file on Wikimedia Commons whose licence is Creative Commons, public domain or the Open Government Licence, saved at 500 px with its author, licence and Commons page. Published under `data/photos/` with an index (`manifest.json`). Drivers without such a photo are left out and get a silhouette.
- **How it is refreshed:** the same workflow run (`scripts/mirror-photos.mjs`, after the Jolpica and OpenF1 copies) works from the Jolpica copy's driver list. Files already on the live site are reused, so a normal run only looks for new drivers; it asks Wikipedia and Commons one request every 1.2 seconds, named `PitWall/1.0` with the project address, backs off on a rate limit and gives up after three failures in a row. The step never stops a deploy.
- **Licences:** each photo stays under its own licence and is credited to its author on the card, with a link to its Commons page. Photos from other sources are not used.

## Our own copy of the OpenF1 data

OpenF1 allows 30 requests a minute, refuses unauthenticated requests during live sessions and, like any free service, can be slow. A finished session never changes, so Pit Wall keeps a copy of it:

- **What is copied:** for this season's finished sessions (ended at least 3 hours ago), the drivers, laps, stints, pit stops, race control messages and results of races and sprints, the drivers, results, starting grid, laps and race control messages of qualifying, the drivers, stints and laps of practice, and each finished weekend's session list. Car data and car positions are not copied (too large); they are still asked of OpenF1 when needed. Published under `data/openf1/` with an index (`manifest.json`).
- **How it is refreshed:** the same workflow run (every 3 hours and on every push) runs `scripts/mirror-openf1.mjs` after the Jolpica copy, at one request every 2.2 seconds (under OpenF1's 30 a minute). It works newest weekend first, races first. Files already on the live site are reused when the session ended more than 2 days ago, so a normal run only fetches what is new. A run stops after 14 minutes, or when OpenF1 refuses (401, 403, 429) or fails, and the next run carries on; the first runs fill the season in over a day or two. The step never stops a deploy, and a failed run keeps the copy already on the site.
- **How the app uses it:** a request for a whole finished session (laps, stints, pit stops, race control, drivers, results, starting grid, or a weekend's session list) is answered from the copy when the copy has it, with no request to OpenF1, even during a live session's refusal window. Anything else (live polling, newer sessions, the current weekend, car data, location, older seasons) goes to OpenF1 as before.
- **Licence:** OpenF1's website states its content is licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The copy's index file credits OpenF1 and says so. OpenF1 describes itself as an unofficial, community project that is not meant to replace official data feeds; Pit Wall is a non-commercial fan project, and it is worth checking OpenF1's current terms before relying on this long term.
- **Freshness check:** after every run a job (`scripts/check-copy.mjs`) looks at the Jolpica copy on the live site. If it is more than 12 hours old, or missing, it opens a GitHub issue titled "Jolpica data copy is out of date" (and comments on it while that stays true); when the copy is fresh it closes the issue. If Issues are switched off for the repository (they are for Pit Wall's), the job fails instead, which shows as a red run and a failure email. Settings shows the same age.

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
