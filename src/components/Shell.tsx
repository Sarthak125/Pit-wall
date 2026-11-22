import { useEffect, type ReactNode } from 'react';
import { useSchedule } from '../hooks/useSeason';
import { activeWindow, getBlocked, setLiveWindows } from '../lib/openf1Window';
import { openf1 } from '../api/openf1';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { href, useRouteParam, type Route } from '../lib/router';
import { getSettings, updateSettings, useSettings } from '../lib/settings';
import { CalendarIcon, DashIcon, GearIcon, HelmetIcon, RefreshIcon, StarIcon, TimerIcon, TrophyIcon } from './Icons';

const NAV: { route: Route; label: string; short?: string; icon: () => ReactNode }[] = [
  { route: 'dashboard', label: 'Dashboard', short: 'Home', icon: DashIcon },
  { route: 'live', label: 'Live Timing', short: 'Live', icon: TimerIcon },
  { route: 'driver', label: 'Favourites', short: 'Faves', icon: () => <StarIcon size={20} /> },
  { route: 'standings', label: 'Standings', icon: TrophyIcon },
  { route: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { route: 'drivers', label: 'Drivers', icon: HelmetIcon },
];

export function Shell({ route, live, children }: { route: Route; live: boolean; children: ReactNode }) {
  const { season, favoriteDriver, favoriteTeam } = useSettings();
  const param = useRouteParam();
  // A driver page for someone other than the favourite belongs under Drivers.
  // Pages for drivers or teams other than the favourites belong under Drivers or Standings.
  const active: Route =
    route === 'driver' && param && param !== favoriteDriver
      ? 'drivers'
      : route === 'team' && param && param !== favoriteTeam
        ? 'standings'
        : route === 'team'
          ? 'driver'
          : route === 'race'
            ? 'calendar'
            : route;
  // The current calendar tells the OpenF1 client when a live session's window is open (see lib/openf1Window).
  const calendar = useSchedule('current');
  useEffect(() => {
    setLiveWindows(calendar.data ?? []);
    // Inside a live window without a token, check OpenF1 straight away (it answers fast now), so the "paused"
    // notice shows without waiting for slower requests that started before the calendar was known.
    if (!getSettings().openf1Token.trim() && activeWindow() && !getBlocked()) openf1('sessions', { meeting_key: 'latest' }).catch(() => undefined);
  }, [calendar.data]);
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const year = new Date().getFullYear();
  const seasons = ['current', ...Array.from({ length: 4 }, (_, i) => String(year - 1 - i))];

  return (
    <>
      <header className="topbar">
        <a className="brand" href={href('dashboard')} aria-label="Pit Wall home">
          <span className="brand-mark" />
          <span className="brand-name">PIT WALL</span>
        </a>
        <nav className="topnav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.route} href={href(n.route)} aria-current={active === n.route ? 'page' : undefined}>
              {n.route === 'driver' && <span className="fav-star"><StarIcon filled size={14} /></span>}
              {n.label}
              {n.route === 'live' && live && <span className={`live-dot on`} aria-label="Session live" />}
            </a>
          ))}
        </nav>
        <div className="topbar-tools">
          <label className="field">
            <span className="field-label">Season</span>
            <select className="select" value={season} onChange={(e) => updateSettings({ season: e.target.value })}>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s === 'current' ? `${year} (current)` : s}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-btn"
            aria-label="Refresh data"
            title={fetching ? 'Refreshing' : 'Refresh data'}
            onClick={() => qc.invalidateQueries()}
          >
            <RefreshIcon />
          </button>
          <a className="icon-btn" href={href('settings')} aria-label="Settings" aria-current={route === 'settings' ? 'page' : undefined}>
            <GearIcon />
          </a>
        </div>
      </header>

      <main className="main">{children}</main>

      <nav className="bottomnav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.route} href={href(n.route)} aria-current={active === n.route ? 'page' : undefined}>
            <n.icon />
            <span className="bn-label">
              <span className={n.short ? 'bn-long' : undefined}>{n.label}</span>
              {n.short && <span className="bn-short" aria-hidden="true">{n.short}</span>}
              {n.route === 'live' && live ? ' ●' : ''}
            </span>
          </a>
        ))}
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      Data: <a href="https://openf1.org" target="_blank" rel="noreferrer">OpenF1</a> (live timing) and{' '}
      <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noreferrer">Jolpica-F1</a> (results and standings). Times
      are in your local time zone. Unofficial fan project, not affiliated with Formula 1.
    </footer>
  );
}
