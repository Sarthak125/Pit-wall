import { DelayPicker } from '../components/DelayPicker';
import { useSpoilers } from '../hooks/useSpoilers';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearCache } from '../api/http';
import { Footer } from '../components/Shell';
import { timeZoneLabel } from '../lib/format';
import { applyTheme, type ThemeChoice } from '../lib/theme';
import { setFavorite, setFavoriteTeam, updateSettings, useSettings } from '../lib/settings';
import { useConstructorStandings, useDriverStandings } from '../hooks/useSeason';

export function Settings() {
  const s = useSettings();
  const qc = useQueryClient();
  const [token, setToken] = useState(s.openf1Token);
  const [perMinute, setPerMinute] = useState(String(s.openf1PerMinute));
  const [saved, setSaved] = useState(false);

  return (
    <>
      <section className="card">
        <h1 className="h2" style={{ marginBottom: 16 }}>Settings</h1>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.min(600, Math.max(5, Math.round(Number(perMinute) || 30)));
            updateSettings({ openf1Token: token.trim(), openf1PerMinute: n });
            setPerMinute(String(n));
            setSaved(true);
            qc.invalidateQueries();
          }}
        >
          <label>
            OpenF1 access token (optional)
            <span className="hint">
              Historical data works without an account. If OpenF1 requires an account for real-time data during sessions, paste your access token here. It is
              stored only on this device and sent only to api.openf1.org.
            </span>
            <input className="input" type="password" autoComplete="off" value={token} onChange={(e) => { setToken(e.target.value); setSaved(false); }} />
          </label>
          <label>
            OpenF1 requests per minute
            <span className="hint">OpenF1 allows 30 a minute for free use and 60 with a paid OpenF1 account (paste its access token above). Keep this at or below your limit; the app queues requests so it stays under this number.</span>
            <input className="input" type="number" min={5} max={600} inputMode="numeric" value={perMinute} onChange={(e) => { setPerMinute(e.target.value); setSaved(false); }} style={{ maxWidth: 160 }} />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button className="btn primary" type="submit">Save</button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                clearCache();
                qc.clear();
                qc.invalidateQueries();
              }}
            >
              Clear cached data
            </button>
            {saved && <span className="muted" role="status">Saved.</span>}
          </div>
        </form>
      </section>
      <FavouriteSettings />
      <WatchingLater />
      <Appearance />
      <section className="card">
        <h2 className="h2 sm" style={{ marginBottom: 8 }}>About</h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Times are shown in your device time zone ({timeZoneLabel()}). Standings, results, the calendar and circuit history come from Jolpica-F1. Live
          timing, race control messages, track weather, car data and team radio come from OpenF1. Track layouts and pit stop time loss come from MultiViewer,
          and weekend weather forecasts on race pages from Open-Meteo. FIA message types (penalty, noted, under investigation) are worked out from the official
          message wording, so an unusual message may land in "Other". This is an unofficial fan project and is not affiliated with Formula 1 or the FIA.
        </p>
      </section>
      <Footer />
    </>
  );
}

function FavouriteSettings() {
  const s = useSettings();
  const standings = useDriverStandings('current');
  const drivers = standings.data?.standings ?? [];
  const teamStandings = useConstructorStandings('current');
  const teams = teamStandings.data?.standings ?? [];
  const notifSupported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState(notifSupported ? Notification.permission : 'denied');

  return (
    <section className="card">
      <h2 className="h2 sm" style={{ marginBottom: 16 }}>Favourites</h2>
      <div className="form">
        <label>
          Favourite driver
          <span className="hint">Highlighted across the app and followed on the My Driver page. Saved on this device only.</span>
          <select
            className="input"
            style={{ maxWidth: 360 }}
            value={s.favoriteDriver}
            onChange={(e) => {
              const code = e.target.value;
              if (!code) return updateSettings({ favoriteDriver: '', favoriteName: '' });
              const d = drivers.find((x) => x.Driver.code === code);
              if (d && code !== s.favoriteDriver) setFavorite(code, `${d.Driver.givenName} ${d.Driver.familyName}`);
            }}
          >
            <option value="">None</option>
            {s.favoriteDriver && !drivers.some((d) => d.Driver.code === s.favoriteDriver) && <option value={s.favoriteDriver}>{s.favoriteName || s.favoriteDriver}</option>}
            {drivers.map((d) => (
              <option key={d.Driver.driverId} value={d.Driver.code}>
                {d.Driver.givenName} {d.Driver.familyName} ({d.Constructors[d.Constructors.length - 1]?.name})
              </option>
            ))}
          </select>
        </label>

        <label>
          Favourite team
          <span className="hint">Its drivers are tinted in the standings and Live Timing, and it gets a Team tab under Favourites.</span>
          <select
            className="input"
            style={{ maxWidth: 360 }}
            value={s.favoriteTeam}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return updateSettings({ favoriteTeam: '', favoriteTeamName: '' });
              const t = teams.find((x) => x.Constructor.constructorId === id);
              if (t && id !== s.favoriteTeam) setFavoriteTeam(id, t.Constructor.name);
            }}
          >
            <option value="">None</option>
            {s.favoriteTeam && !teams.some((t) => t.Constructor.constructorId === s.favoriteTeam) && <option value={s.favoriteTeam}>{s.favoriteTeamName || s.favoriteTeam}</option>}
            {teams.map((t) => (
              <option key={t.Constructor.constructorId} value={t.Constructor.constructorId}>{t.Constructor.name}</option>
            ))}
          </select>
        </label>

        <label style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <input type="checkbox" checked={s.alertsEnabled} onChange={(e) => updateSettings({ alertsEnabled: e.target.checked })} style={{ width: 22, height: 22, marginTop: 2 }} />
          <span>
            Alerts while a session is live
            <span className="hint" style={{ display: 'block' }}>Pop-ups when your driver changes position, pits, or gets an FIA decision. Works while the app is open.</span>
          </span>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>System notifications</span>
          <span className="hint">
            Also show alerts as device notifications. They arrive while the app is open or in the background, but not after it has been closed.
          </span>
          {!notifSupported ? (
            <span className="muted">This browser does not support notifications.</span>
          ) : perm === 'denied' ? (
            <span className="muted">Notifications are blocked for this site. Allow them in the browser's site settings to use this.</span>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={s.systemNotifications && perm === 'granted' ? 'btn' : 'btn primary'}
                onClick={async () => {
                  if (s.systemNotifications && perm === 'granted') return updateSettings({ systemNotifications: false });
                  const p = perm === 'granted' ? 'granted' : await Notification.requestPermission();
                  setPerm(p);
                  updateSettings({ systemNotifications: p === 'granted' });
                }}
              >
                {s.systemNotifications && perm === 'granted' ? 'Turn off notifications' : 'Turn on notifications'}
              </button>
              {s.systemNotifications && perm === 'granted' && <span className="muted" role="status">On</span>}
            </div>
          )}
        </div>

        <label style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <input type="checkbox" checked={s.trackMap} onChange={(e) => updateSettings({ trackMap: e.target.checked })} style={{ width: 22, height: 22, marginTop: 2 }} />
          <span>
            Live track map on My Driver
            <span className="hint" style={{ display: 'block' }}>Shows where your driver is on the circuit. Uses about 15 extra OpenF1 requests a minute, which can slow other live updates on the free tier.</span>
          </span>
        </label>
      </div>
    </section>
  );
}

/** TV delay and spoiler-free mode. */
function WatchingLater() {
  const s = useSettings();
  const sp = useSpoilers();
  return (
    <section className="card">
      <h2 className="h2 sm" style={{ marginBottom: 16 }}>Watching on TV or later</h2>
      <div className="form">
        <label>
          TV delay
          <span className="hint">During live sessions, timing comes from Formula 1's feed, which is usually 30 to 60 seconds ahead of TV and streams. Hold it back so overtakes and flags appear when you see them. Also on Live Timing.</span>
          <DelayPicker bare />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <input type="checkbox" checked={s.spoilerFree} onChange={(e) => updateSettings({ spoilerFree: e.target.checked })} style={{ width: 22, height: 22, marginTop: 2 }} />
          <span>
            Spoiler-free mode
            <span className="hint" style={{ display: 'block' }}>
              Hides the latest race weekend until you press Reveal: its sessions on Live Timing, the race page and last race card, and the standings and title fight chart once the sprint or race has started. When the next weekend starts, it moves on to that one.
            </span>
            {s.spoilerFree && sp.weekend && (
              <span className="hint" style={{ display: 'block', marginTop: 6 }}>
                {sp.on ? `Hiding the ${sp.weekend.raceName}.` : `The ${sp.weekend.raceName} is revealed.`}{' '}
                {!sp.on && <button className="link-btn" onClick={() => updateSettings({ revealed: '' })}>Hide it again</button>}
              </span>
            )}
          </span>
        </label>
      </div>
    </section>
  );
}

/** Dark, light, or follow the device. */
function Appearance() {
  const s = useSettings();
  const options: [ThemeChoice, string][] = [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']];
  return (
    <section className="card">
      <h2 className="h2 sm" style={{ marginBottom: 16 }}>Appearance</h2>
      <div className="form">
        <div>
          <div id="theme-label">Theme</div>
          <span className="hint">Auto follows your device's light or dark setting. Track maps stay dark either way. Saved on this device only.</span>
          <div className="tabs" role="radiogroup" aria-labelledby="theme-label" style={{ marginTop: 8, marginBottom: 0 }}>
            {options.map(([v, label]) => (
              <button key={v} role="radio" className="tab" aria-checked={s.theme === v} onClick={() => { updateSettings({ theme: v }); applyTheme(v); }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
