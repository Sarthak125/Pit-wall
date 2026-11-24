import { useState } from 'react';
import { DriverCardGrid, DriverCompare, DriverNameList } from '../components/DriverCard';
import { Footer } from '../components/Shell';
import { SpoilerCover } from '../components/SpoilerCover';
import { useSpoilers } from '../hooks/useSpoilers';
import { useSettings } from '../lib/settings';

/**
 * The drivers of the season as cards, each with a link to the driver's page and the star to pick a favourite; or two
 * of them side by side. The cards are worked out from the results, so in spoiler-free mode they are covered and only
 * the names (with the same link and star) are listed.
 */
export function Drivers() {
  const { season } = useSettings();
  const [view, setView] = useState<'cards' | 'compare'>('cards');
  const spoilers = useSpoilers();
  const covered = season === 'current' && spoilers.standingsHidden;

  return (
    <>
      <section className="card" aria-labelledby="drv">
        <div className="card-head">
          <h1 className="h2" id="drv">Drivers</h1>
          <span className="muted">{view === 'cards' ? "Open a driver's page, or tap the star to pick your favourite" : 'Two drivers side by side'}</span>
          <div className="tabs" role="tablist" aria-label="View" style={{ marginBottom: 0, marginLeft: 'auto' }}>
            <button role="tab" className="tab" aria-selected={view === 'cards'} onClick={() => setView('cards')}>Cards</button>
            <button role="tab" className="tab" aria-selected={view === 'compare'} onClick={() => setView('compare')}>Compare</button>
          </div>
        </div>
        {covered ? (
          <>
            <SpoilerCover what="The driver cards" />
            <DriverNameList season={season} />
          </>
        ) : view === 'cards' ? <DriverCardGrid season={season} /> : <DriverCompare season={season} />}
      </section>
      <Footer />
    </>
  );
}
