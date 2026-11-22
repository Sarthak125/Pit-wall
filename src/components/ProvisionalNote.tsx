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
  const detail = `Includes the ${p.raceName} ${what} from the official timing classification (via OpenF1). Pit Wall's usual source, Jolpica, has not published it yet; its confirmed results replace this automatically when they arrive. Post-race penalties may still change it.`;
  if (block) {
    return (
      <div className="provisional-note" role="note">
        <span className="provisional-pill">Provisional</span> {detail}
      </div>
    );
  }
  return (
    <span className="provisional-pill" title={detail} aria-label={`Provisional: ${detail}`}>
      Provisional · incl. {name}
    </span>
  );
}
