import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearCache } from '../api/http';
import { Footer } from '../components/Shell';
import { timeZoneLabel } from '../lib/format';
import { updateSettings, useSettings } from '../lib/settings';

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
            <span className="hint">Keep this at or below the limit of your OpenF1 plan. The app queues requests so it stays under this number.</span>
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
      <section className="card">
        <h2 className="h2 sm" style={{ marginBottom: 8 }}>About</h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Times are shown in your device time zone ({timeZoneLabel()}). Standings, results and the calendar come from Jolpica-F1. Live timing, race control
          messages, weather and car data come from OpenF1. FIA message types (penalty, noted, under investigation) are worked out from the official message
          wording, so an unusual message may land in "Other". This is an unofficial fan project and is not affiliated with Formula 1 or the FIA.
        </p>
      </section>
      <Footer />
    </>
  );
}
