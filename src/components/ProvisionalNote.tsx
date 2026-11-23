import type { ProvisionalTag } from '../hooks/useSeason';

/**
 * Says that the data includes the latest race weekend provisionally: from the official timing classification
 * (OpenF1) while Jolpica has not added it yet. Disappears by itself once Jolpica has the session.
 */
export function ProvisionalNote({ data, block = false }: { data?: ProvisionalTag | null; block?: boolean }) {
  const p = data?.provisional;
  if (!p) return null;
  const what = p.sessions.length === 2 ? 'sprint and race' : p.sessions[0] === 'Sprint' ? 'sprint' : 'race';
  const name = p.raceName.replace(/ Grand Prix$/, '');
  const earlier = p.earlier?.length ? ` and the ${p.earlier.join(', ')}` : '';
  const detail = `Updated after the ${p.raceName} ${what}${earlier} with Formula 1 timing data from OpenF1. Jolpica, Pit Wall's source for confirmed results, has not published ${earlier ? 'them' : 'it'} yet and replaces this automatically when it does. Stewards' decisions after a race can still change it.`;
  if (block) {
    return (
      <div className="provisional-note" role="note">
        <span className="provisional-pill">Updated after {name}</span> {detail}
      </div>
    );
  }
  return (
    <span className="provisional-pill" title={detail} aria-label={detail}>
      Updated after {name} · F1 timing
    </span>
  );
}
