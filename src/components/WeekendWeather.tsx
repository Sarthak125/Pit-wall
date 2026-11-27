import { useQuery } from '@tanstack/react-query';
import { describeWeather, getWeekendWeather } from '../api/weather';
import { SESSION_FIELDS, type Race } from '../api/jolpica';
import { raceStart, toDate } from '../lib/format';
import { weekendDays } from '../lib/weatherKey';

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const copyTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Weather for each day of a race weekend: a forecast before it, the recorded weather after it. */
export function WeekendWeather({ race, now }: { race: Race; now: number }) {
  const loc = race.Circuit.Location;
  const sessions = [
    ...SESSION_FIELDS.map((f) => ({ label: f.label, d: toDate(race[f.key] as Race['FirstPractice']) })),
    { label: 'Race', d: raceStart(race) },
  ].filter((s): s is { label: string; d: Date } => !!s.d);
  const first = Math.min(...sessions.map((s) => s.d.getTime()));
  const last = Math.max(...sessions.map((s) => s.d.getTime()));
  // Forecasts reach about 16 days ahead.
  const tooFar = first - now > 15 * DAY;
  const enabled = !!loc.lat && !!loc.long && sessions.length > 0 && !tooFar;
  const wx = useQuery({
    queryKey: ['weekend-weather', race.season, race.round],
    enabled,
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: () => {
      const { start, end } = weekendDays([first, last]);
      return getWeekendWeather(loc.lat!, loc.long!, start, end, { season: race.season, round: race.round });
    },
  });

  if (!loc.lat || !loc.long || !sessions.length) return null;
  const past = last < now;

  // Group sessions by the circuit's local date, using the offset Open-Meteo reports for the location.
  const offset = (wx.data?.utcOffsetSeconds ?? 0) * 1000;
  const byDay = new Map<string, string[]>();
  for (const s of sessions.sort((a, b) => a.d.getTime() - b.d.getTime())) {
    const key = iso(s.d.getTime() + offset);
    byDay.set(key, [...(byDay.get(key) ?? []), s.label]);
  }

  return (
    <section className="card" aria-labelledby="weather">
      <div className="card-head">
        <div>
          <h2 className="h2" id="weather">{past ? 'Weekend weather' : 'Weekend forecast'}</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {past ? 'Recorded weather at the circuit' : 'Forecast for the circuit'} · days in local track time ·{' '}
            {wx.data?.copySource === 'metno' ? (
              <>
                <a className="name-link" style={{ fontWeight: 400 }} href="https://www.met.no/en" target="_blank" rel="noreferrer">MET Norway</a> (<a className="name-link" style={{ fontWeight: 400 }} href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>)
              </>
            ) : (
              'Open-Meteo'
            )}
          </div>
          {wx.data?.copiedAt && (
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }} role="status">
              Open-Meteo is not answering, so this is the forecast Pit Wall saved at {copyTime.format(new Date(wx.data.copiedAt))}
              {wx.data.copySource === 'metno' ? ', from MET Norway, which has no chance of rain here, so expected rain is shown instead.' : '.'}
            </div>
          )}
        </div>
      </div>
      {tooFar ? (
        <div className="empty">The forecast appears about 16 days before the weekend, from {dayFmt.format(new Date(first - 15 * DAY))}.</div>
      ) : wx.isLoading ? (
        <div className="empty">Loading the weather…</div>
      ) : wx.error || !wx.data ? (
        <div className="empty">The weather service is not answering right now, and Pit Wall has no saved forecast for this weekend. Try again later.</div>
      ) : (
        <div className="wx-days">
          {[...byDay.entries()].map(([day, labels]) => {
            const w = wx.data!.days.get(day);
            const d = describeWeather(w?.code ?? null);
            return (
              <div className="wx-day inset" key={day}>
                <div className="muted" style={{ fontSize: 12 }}>{dayFmt.format(new Date(`${day}T12:00:00Z`))}</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{labels.join(', ')}</div>
                {w ? (
                  <>
                    <div className="wx-main">
                      <span className="wx-icon" aria-hidden="true">{d.icon}</span>
                      <span>
                        <span className="mono" style={{ fontSize: 20 }}>{w.tMax != null ? `${Math.round(w.tMax)}°` : '-'}</span>
                        <span className="muted mono"> / {w.tMin != null ? `${Math.round(w.tMin)}°C` : '-'}</span>
                        <div className="muted" style={{ fontSize: 12 }}>{d.text}</div>
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {w.rainChance != null ? `Rain chance ${w.rainChance}%` : w.rain != null ? `Rain ${w.rain.toFixed(1)} mm` : ''}
                      {w.windMax != null ? ` · Wind up to ${Math.round(w.windMax)} km/h` : ''}
                    </div>
                  </>
                ) : (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>No data for this day yet.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
