import { useState } from 'react';
import type { DriverStanding } from '../api/jolpica';
import { scenario, worstPositionThatWins } from '../lib/titleScenario';

const POSITIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const label = (p: number | null) => (p == null ? 'outside the points' : `P${p}`);
const nameOf = (s: DriverStanding) => s.Driver.familyName;

/**
 * "What if?" on the title maths card: pick a rival and where each of the two finishes in every remaining Grand Prix and
 * sprint, and see who ends the season ahead. Also says where the driver has to finish to win against that rival.
 */
export function TitleScenario({ me, list, gps, sprints }: { me: DriverStanding; list: DriverStanding[]; gps: number; sprints: number }) {
  const others = list.filter((s) => s.Driver.driverId !== me.Driver.driverId);
  // The rival defaults to the championship leader, or to the closest chaser when this driver leads.
  const [rivalId, setRivalId] = useState(others[0]?.Driver.driverId ?? '');
  const [minePos, setMinePos] = useState<number | null>(1);
  const [rivalPos, setRivalPos] = useState<number | null>(2);
  const rival = others.find((s) => s.Driver.driverId === rivalId) ?? others[0];
  if (!rival) return null;
  const input = { mine: Number(me.points), rival: Number(rival.points), gps, sprints };
  const result = scenario({ ...input, minePosition: minePos, rivalPosition: rivalPos });
  const need = worstPositionThatWins({ ...input, rivalPosition: rivalPos });
  const pos = (setter: (p: number | null) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => setter(e.target.value === '0' ? null : Number(e.target.value));
  const options = (
    <>
      {POSITIONS.map((p) => <option key={p} value={p}>P{p}</option>)}
      <option value={0}>Outside the points</option>
    </>
  );
  const who = nameOf(me);
  const them = nameOf(rival);
  const verdict = result.outcome === 'mine' ? `${who} would be champion.` : result.outcome === 'rival' ? `${them} would be champion.` : 'Level on points: the title goes to countback (most wins first), which is not modelled here.';

  return (
    <div className="scenario" role="group" aria-label="Title scenario" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line, #232831)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>What if?</div>
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ minWidth: 110, textAlign: 'left' }}>Rival</span>
          <select aria-label="Rival" value={rival.Driver.driverId} onChange={(e) => setRivalId(e.target.value)}>
            {others.map((s) => <option key={s.Driver.driverId} value={s.Driver.driverId}>{s.Driver.familyName} ({s.points})</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ minWidth: 110, textAlign: 'left' }}>{who} finishes</span>
          <select aria-label={`${who} finishes`} value={minePos ?? 0} onChange={pos(setMinePos)}>{options}</select>
        </label>
        <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ minWidth: 110, textAlign: 'left' }}>{them} finishes</span>
          <select aria-label={`${them} finishes`} value={rivalPos ?? 0} onChange={pos(setRivalPos)}>{options}</select>
        </label>
      </div>
      <p role="status" style={{ margin: '10px 0 0', lineHeight: 1.6 }}>
        In each of the {gps} {gps === 1 ? 'Grand Prix' : 'Grands Prix'}{sprints ? ` and ${sprints} sprint${sprints === 1 ? '' : 's'}` : ''} left: {who} <b className="mono">{result.mine}</b> points, {them} <b className="mono">{result.rival}</b>. <b>{verdict}</b>
      </p>
      <p className="muted" style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6 }}>
        {need == null
          ? `If ${them} finishes ${label(rivalPos)} every time, ${who} cannot finish ahead, even winning every race and sprint.`
          : need === 'outside'
            ? `If ${them} finishes ${label(rivalPos)} every time, ${who} is ahead whatever happens.`
            : `If ${them} finishes ${label(rivalPos)} every time, ${who} needs ${label(need)} or better in every race and sprint.`}
      </p>
      <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
        Both drivers take the same position in every remaining Grand Prix and sprint (25 to 1 points, 8 to 1 in sprints, no fastest-lap point). Real seasons are messier, so treat it as a guide.
      </div>
    </div>
  );
}
