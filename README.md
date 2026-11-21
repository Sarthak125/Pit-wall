# Pit Wall: F1 dashboard

An installable web app (PWA) for Formula 1: live timing, FIA race control and stewards' messages, standings, calendar and drivers. One codebase runs in a laptop browser and installs on an Android tablet like an app.

## Data sources

Formula 1 has no public official API. This app uses two free community APIs:

| Source | Used for | Notes |
| --- | --- | --- |
| [OpenF1](https://openf1.org) | Live timing, positions, gaps, laps and sectors, tyres, pit stops, race control messages, weather, car data | Historical data is free. Check OpenF1's current terms for real-time access during sessions; if it needs an account, paste your access token in **Settings**. Default budget is 30 requests per minute, adjustable in Settings. |
| [Jolpica-F1](https://github.com/jolpica/jolpica-f1) | Calendar, results, driver and constructor standings | Ergast-compatible. Responses are cached on the device for 10 to 30 minutes. |

FIA message types (penalty, under investigation, noted, no further action, track limits, flags) are worked out from the stewards' standard wording in each message. A message with unusual wording lands in "Other".

All times are shown in the device's local time zone.

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

To install it as an app, the tablet must open it over **HTTPS**. The simplest way is to host it for free (see Deploy below), then on the tablet:

1. Open the site in Chrome.
2. Tap the three-dot menu, then **Install app** (or **Add to Home screen**).
3. Open Pit Wall from the home screen. It runs full screen and opens offline with the last loaded standings.

Quick test without hosting: with `npm run dev` running on the laptop, open `http://<laptop-ip>:3030` on the tablet while both are on the same Wi-Fi. This works in the browser, but Android will not install it as an app over plain HTTP.

## Deploy

The build is a static site in `dist/`:

```bash
npm run build
```

- **GitHub Pages:** push this folder to a GitHub repository, then in the repo go to Settings, Pages, and set Source to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. The site will be at `https://<user>.github.io/<repo>/`.
- **Netlify, Vercel or Cloudflare Pages:** build command `npm run build`, output folder `dist`.

## Project layout

```
src/api/        OpenF1 and Jolpica clients, rate limiter, cache
src/hooks/      Polling and data hooks (live timing is fetched incrementally)
src/lib/        FIA message classifier, formatting, team colours, settings
src/pages/      Dashboard, Live Timing, Standings, Calendar, Drivers, Settings
src/components/ App shell, chart, loading and error states
```

## Notes

- Polling pauses while the app is in the background to save API quota.
- The OpenF1 token is stored only in the device's browser storage and sent only to api.openf1.org.
- Unofficial fan project. Not affiliated with Formula 1, the FIA or any team.
