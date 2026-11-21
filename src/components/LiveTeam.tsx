import { FiaText, FiaWhen } from './FiaText';
import { useQuery } from '@tanstack/react-query';
import { openf1, type OF1Driver, type Session, type TeamRadio } from '../api/openf1';
import type { FavouriteTeam } from '../hooks/useFavourite';
import { useLiveTiming } from '../hooks/useLiveTiming';
import { usePoll } from '../hooks/usePoll';
import { fmtGap, fmtLap } from '../lib/format';
import { trackStatus } from '../lib/raceControl';
import { href } from '../lib/router';
import { tyre } from '../lib/teams';
import { RadioList, type DriverLabel } from './RadioList';
import { ErrorBox, Loading } from './States';

/** Both cars of the favourite team during a live session, from one shared set of live data. */
export function LiveTeam({ session, team }: { session: Session; team: FavouriteTeam }) {
  const sk = session.session_key;
  const drivers = useQuery({ queryKey: ['drv', sk], queryFn: () => openf1<OF1Driver>('drivers', { session_key: sk }), staleTime: 10 * 60_000 });
  // Same order as the standings (most points first), so colours match across the page.
  const order = [...team.codes];
  const mine = (drivers.data ?? []).filter((d) => team.codes.has(d.name_acronym)).sort((a, b) => order.indexOf(a.name_acronym) - order.indexOf(b.name_acronym));
  const nums = mine.map((d) => d.driver_number);
  const t = useLiveTiming(session, true, null);
  const isRace = /race|sprint/i.test(session.session_name) && !/qualifying|shootout/i.test(session.session_name);
  const radio = usePoll<TeamRadio[]>(
    nums.length ? `team-radio-${sk}-${nums.join(',')}` : null,
    async (_p, signal) => (await Promise.all(nums.map((n) => openf1<TeamRadio>('team_radio', { session_key: sk, driver_number: n }, signal)))).flat(),
    30_000,
  );
  const status = trackStatus([...t.messages].reverse());
  const msgs = t.messages.filter((m) => m.cars.some((c) => nums.includes(c)));
  const labels = new Map<number, DriverLabel>(mine.map((d, i) => [d.driver_number, { code: d.name_acronym, colour: i === 0 ? team.colour : `color-mix(in srgb, ${team.colour} 45%, white)` }]));

  if (drivers.isLoading || t.loading) return <section className="card live-card"><Loading rows={4} /></section>;
  if (!mine.length) return null;

  return (
    <section className="card live-card" aria-labelledby="team-live">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px' }}>
        <span className="pill tone-solid" style={{ borderRadius: 6, padding: '6px 12px', fontSize: 12, letterSpacing: 1 }}>
          <span className="dot live-dot on" style={{ background: '#fff' }} />
          LIVE
        </span>
        <h2 className="h2" id="team-live" style={{ fontSize: 26 }}>{session.location} · {session.session_name}</h2>
        {status && <span className={`pill tone-${status.tone}`}><span className="dot" />{status.label}</span>}
        <a className="link" href={href('live')} style={{ marginLeft: 'auto' }}>Full timing →</a>
      </div>
      {t.error ? <ErrorBox error={t.error} what="live timing" /> : null}

      <div className="row">
        {mine.map((d) => {
          const i = t.rows.findIndex((r) => r.driver.driver_number === d.driver_number);
          const r = t.rows[i];
          const ty = tyre(r?.stint?.compound);
          return (
            <div key={d.driver_number} className="inset w2" style={{ padding: 16, borderTop: `3px solid ${labels.get(d.driver_number)?.colour}` }}>
              <div className="who" style={{ gap: 12, marginBottom: 12 }}>
                <span className="pos-big" style={{ fontSize: 48 }}>{r?.position ? `P${r.position}` : '-'}</span>
                <div>
                  <div className="code" style={{ fontSize: 22 }}>{d.name_acronym}</div>
                  <div className="muted" style={{ fontSize: 12 }}>#{d.driver_number}</div>
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat inset">
                  <div className="l">{isRace ? 'Gap to leader' : 'Best lap'}</div>
                  <div className="v" style={{ fontSize: 18 }}>{isRace ? (i === 0 ? 'Leader' : fmtGap(r?.gap)) : fmtLap(r?.bestLap)}</div>
                </div>
                <div className="stat inset">
                  <div className="l">{isRace ? 'To car ahead' : 'Last lap'}</div>
                  <div className="v" style={{ fontSize: 18 }}>{isRace ? (i <= 0 ? '-' : fmtGap(r?.interval)) : fmtLap(r?.lastLap?.lap_duration)}</div>
                </div>
                <div className="stat inset">
                  <div className="l">Tyre</div>
                  <div className="who" style={{ gap: 8, marginTop: 4 }}>
                    <span className="tyre" style={{ borderColor: ty.colour }}>{ty.letter}</span>
                    <span className="mono">{r?.tyreAge ?? '-'} laps</span>
                  </div>
                </div>
                <div className="stat inset">
                  <div className="l">{isRace ? 'Pit stops' : 'Pit visits'}</div>
                  <div className="v" style={{ fontSize: 18 }}>{r?.pits ?? 0}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row">
        <div className="inset w3" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>FIA messages for {team.name}</div>
          {msgs.length === 0 ? (
            <span className="muted">No messages about the team this session.</span>
          ) : (
            msgs.slice(0, 6).map((m) => (
              <div className="msg" key={m.id}>
                <FiaWhen m={m} />
                <span className={`badge tone-${m.tone}`}>{m.label}</span>
                <FiaText m={m} />
              </div>
            ))
          )}
        </div>
        <div className="inset w2" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Team radio</div>
          <RadioList clips={radio.data ?? []} labels={labels} limit={6} />
        </div>
      </div>
    </section>
  );
}
