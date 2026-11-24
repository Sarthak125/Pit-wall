import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { openf1, type OF1Driver } from '../api/openf1';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Footer } from '../components/Shell';
import { useDriverStandings } from '../hooks/useSeason';
import { useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';
import { niceName } from '../lib/format';
import { driverHref } from '../lib/router';
import { setFavorite } from '../lib/settings';
import { StarIcon } from '../components/Icons';
import { DriverCardGrid } from '../components/DriverCard';
import { SpoilerCover } from '../components/SpoilerCover';
import { useSpoilers } from '../hooks/useSpoilers';

export function Drivers() {
  const { season, favoriteDriver } = useSettings();
  const standings = useDriverStandings(season);
  const [view, setView] = useState<'list' | 'cards'>('list');
  const spoilers = useSpoilers();
  const grid = useQuery({
    queryKey: ['of1-drivers-latest'],
    queryFn: () => openf1<OF1Driver>('drivers', { session_key: 'latest' }),
    staleTime: 30 * 60_000,
  });
  const byCode = new Map((standings.data?.standings ?? []).map((s) => [s.Driver.code, s]));
  const drivers = [...(grid.data ?? [])].sort((a, b) => (a.team_name ?? '').localeCompare(b.team_name ?? '') || a.driver_number - b.driver_number);

  return (
    <>
      <section className="card" aria-labelledby="drv">
        <div className="card-head">
          <h1 className="h2" id="drv">Drivers</h1>
          <span className="muted">{view === 'list' ? 'Tap a driver for full stats, or the star to pick your favourite' : 'Ratings from this season so far'}</span>
          <div className="tabs" role="tablist" aria-label="View" style={{ marginBottom: 0, marginLeft: 'auto' }}>
            <button role="tab" className="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>List</button>
            <button role="tab" className="tab" aria-selected={view === 'cards'} onClick={() => setView('cards')}>Cards</button>
          </div>
        </div>
        {view === 'cards' ? (
          season === 'current' && spoilers.standingsHidden ? <SpoilerCover what="The driver cards" /> : <DriverCardGrid season={season} />
        ) : grid.error ? <ErrorBox error={grid.error} what="drivers" /> : grid.isLoading ? <Loading rows={8} /> : drivers.length === 0 ? <Empty>No driver data yet.</Empty> : (
          <div className="driver-grid">
            {drivers.map((d) => {
              const s = byCode.get(d.name_acronym);
              const colour = teamColour(d.team_name, d.team_colour);
              return (
                <article className={`inset driver-card${favoriteDriver === d.name_acronym ? ' is-fav' : ''}`} key={d.driver_number} style={{ borderTopColor: colour }}>
                  <a className="card-link" href={driverHref(d.name_acronym)} aria-label={`${niceName(d.full_name)}: full stats`}>
                  {d.headshot_url ? <img src={d.headshot_url} alt="" loading="lazy" /> : <div className="num" style={{ width: 64, textAlign: 'center', color: colour }}>{d.driver_number}</div>}
                  <div style={{ minWidth: 0 }}>
                    <div className="num" style={{ fontSize: 22, color: colour }}>{d.driver_number}</div>
                    <div className="dname" style={{ fontWeight: 600 }}>{niceName(`${d.first_name ?? ''} ${d.last_name ?? ''}`)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{d.team_name}</div>
                    {s && (
                      <div className="mono" style={{ fontSize: 12, marginTop: 4 }}>
                        P{s.position ?? s.positionText} · {s.points} pts · {s.wins} wins
                      </div>
                    )}
                  </div>
                  </a>
                  <button
                    className="star-btn"
                    style={{ marginLeft: 'auto' }}
                    aria-pressed={favoriteDriver === d.name_acronym}
                    aria-label={favoriteDriver === d.name_acronym ? `Remove ${niceName(d.full_name)} as favourite` : `Make ${niceName(d.full_name)} your favourite`}
                    onClick={() => setFavorite(d.name_acronym, niceName(`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || d.full_name))}
                  >
                    <StarIcon filled={favoriteDriver === d.name_acronym} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}
