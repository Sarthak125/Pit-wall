import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { DriverPhoto } from '../api/photos';
import { useDriverPhotos } from '../api/photos';
import { useDriverCards } from '../hooks/useDriverCards';
import { compareRows, ratingTier, shortRace, STAT_LABELS, statFigure, type CardData, type CardSnapshot } from '../lib/driverCards';
import { useSettings } from '../lib/settings';
import { teamColour } from '../lib/teams';
import { Empty, ErrorBox, Loading } from './States';

const TIER = { gold: 'dc-g', green: 'dc-gr', amber: 'dc-am', grey: 'dc-lo' } as const;
const NATIONS: Record<string, string> = {
  Italian: 'ITA', Dutch: 'NED', British: 'GBR', Monegasque: 'MON', Spanish: 'ESP', Australian: 'AUS', French: 'FRA', Thai: 'THA', German: 'GER', Canadian: 'CAN',
  Japanese: 'JPN', Mexican: 'MEX', Finnish: 'FIN', Brazilian: 'BRA', Argentine: 'ARG', Chinese: 'CHN', American: 'USA', Danish: 'DEN', 'New Zealander': 'NZL',
};

function Silhouette() {
  return (
    <svg className="dc-silhouette" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx="54" cy="36" r="17" fill="rgba(255,255,255,.14)" />
      <path d="M14 100c2-26 18-36 40-36s38 10 40 36z" fill="rgba(255,255,255,.14)" />
    </svg>
  );
}

/** Championship position after each round, as a small line chart for the back of a card. */
function Trend({ points, colour }: { points: [number, number][]; colour: string }) {
  if (points.length < 2) return <p>The chart appears once there are two rounds.</p>;
  const W = 260, H = 96;
  const maxPos = Math.max(6, ...points.map((p) => p[1]));
  const x0 = points[0][0], x1 = points[points.length - 1][0];
  const X = (r: number) => 32 + (x1 === x0 ? 0 : ((r - x0) / (x1 - x0)) * (W - 32 - 10));
  const Y = (v: number) => 14 + ((v - 1) / (maxPos - 1)) * (H - 38);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg className="dc-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Championship position after each round, ending P${last[1]}`}>
      {[1, Math.ceil(maxPos / 2), maxPos].map((g) => (
        <g key={g}>
          <line x1="30" x2={W - 8} y1={Y(g)} y2={Y(g)} stroke="rgba(255,255,255,.1)" />
          <text x="2" y={Y(g) + 4} fontSize="11" fill="#8B95A5" fontFamily="JetBrains Mono, monospace">P{g}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={colour} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => <circle key={p[0]} cx={X(p[0])} cy={Y(p[1])} r="2.4" fill={colour} />)}
      <circle cx={X(last[0])} cy={Y(last[1])} r="5" fill={colour} stroke="#0A0C10" strokeWidth="2" />
      <text x="32" y={H - 3} fontSize="11" fill="#9AA4B2" fontFamily="JetBrains Mono, monospace">R{x0}</text>
       <text x={W - 8} y={H - 3} fontSize="11" fill="#9AA4B2" textAnchor="end" fontFamily="JetBrains Mono, monospace">R{x1}</text>
    </svg>
  );
}

function DuelRow({ label, a, b }: { label: string; a: number; b: number }) {
  const t = a + b;
  return (
    <div className="dc-row">
      <b>{a}</b>
      <div><small>{label}</small><div className="dc-meter"><i style={{ width: `${t ? (a / t) * 100 : 50}%` }} /></div></div>
      <b>{b}</b>
    </div>
  );
}

interface CardProps {
  card: CardData;
  /** The same driver after the previous round, to show how each rating moved. */
  prev?: CardData | null;
  /** Championship position after each round, for the back. */
  trend: [number, number][];
  photo?: DriverPhoto;
}

/**
 * A driver's card: photo, overall rating, six stat ratings (1 to 99, higher is better) with the real figure under each,
 * and a back with the season's trend, best and lowest results and the head-to-head with the team-mate. Move over it to
 * tilt it; click, or use the turn button, to turn it over.
 */
export function DriverCard({ card, prev, trend, photo }: CardProps) {
  const [flipped, setFlipped] = useState(false);
  const flipRef = useRef<HTMLDivElement>(null);
  const colour = teamColour(card.teamId || card.team);
  const building = !card.ratings;
  const rarity = building ? 'dc-building' : card.pos === 1 ? 'dc-gold' : card.pos <= 3 ? 'dc-silver' : '';
  const rareLabel = building ? 'Building' : card.pos === 1 ? 'Leader' : card.pos <= 3 ? 'Top 3' : '';
  const overall = card.overall;

  const turn = () => {
    const f = flipRef.current;
    if (f) { f.style.transition = ''; f.style.transform = ''; }
    setFlipped((v) => !v);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const f = flipRef.current; if (!f) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    f.querySelectorAll<HTMLElement>('.dc-face').forEach((face) => { face.style.setProperty('--mx', String(Math.round(x * 100))); face.style.setProperty('--my', String(Math.round(y * 100))); });
    f.style.transition = 'transform .08s linear';
    f.style.transform = `rotateY(${(flipped ? 180 : 0) + (x - 0.5) * 16}deg) rotateX(${-(y - 0.5) * 14}deg)`;
  };
  const onLeave = () => { const f = flipRef.current; if (f) { f.style.transition = ''; f.style.transform = ''; } };

  const cells = STAT_LABELS.map((label, k) => {
    const v = card.ratings ? card.ratings[k] : null;
    const before = prev?.ratings?.[k];
    const d = v != null && before != null ? v - before : 0;
    return (
      <div className="dc-cell" key={label}>
        <b className={`dc-r ${TIER[ratingTier(v)]}`}>{v ?? '-'}</b>
        <div className="dc-m">
          <span className="dc-l">{label}</span>
          <span className="dc-v">
            <span>{building ? '' : statFigure(k, card)}</span>
            {d !== 0 && <em className={`dc-ar ${d > 0 ? 'dc-up' : 'dc-down'}`} title={`${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)} rating points since the previous round`}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</em>}
          </span>
          <i className="dc-bar"><u style={{ width: `${v ?? 0}%` }} /></i>
        </div>
      </div>
    );
  });

  const m = card.mate;
  const label = `${card.given} ${card.family}`;
  return (
    <div className="dc" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="dc-tilt">
        <div ref={flipRef} className={`dc-flip${flipped ? ' dc-is-flipped' : ''}`} onClick={turn} data-testid="driver-card">
          <div className={`dc-face dc-front ${rarity}`} style={{ '--tc': colour } as CSSProperties} aria-hidden={flipped}>
            <div className="dc-poly dc-a" /><div className="dc-poly dc-b" /><div className="dc-poly dc-c" />
            <div className={`dc-ghost${card.number.length > 2 ? ' dc-wide' : ''}`}>{card.number}</div>
            <div className="dc-photo">{photo ? <img src={photo.url} alt="" loading="lazy" decoding="async" /> : <Silhouette />}</div>
            <div className="dc-badge">
              {overall != null ? (
                <>
                  <div className="dc-ovr"><b className={TIER[ratingTier(overall)]} aria-label={`Overall rating ${overall}`}>{overall}</b><span>OVR</span></div>
                  <div className="dc-meta">P{card.pos} · {card.points} {card.points === 1 ? 'pt' : 'pts'}</div>
                </>
              ) : (
                <>
                  <div className="dc-pos">P{card.pos}</div>
                  <div className="dc-pts">{card.points} {card.points === 1 ? 'pt' : 'pts'}</div>
                </>
              )}
              <div className="dc-rule" />
              <div className="dc-team">{card.team}</div>
              <div className="dc-nat">{NATIONS[card.nationality] ?? card.nationality} · #{card.number}</div>
              {rareLabel && <div className="dc-rare">{rareLabel}</div>}
            </div>
            <div className="dc-name"><small>{card.given}</small><b>{card.family}</b><i /></div>
            {building ? (
              <div className="dc-building-note">
                <div className="dc-big">{card.starts}<small> / 3</small></div>
                <div className="dc-segs">{[1, 2, 3].map((n) => <i key={n} className={card.starts >= n ? 'dc-on' : ''} />)}</div>
                <div>races started. Ratings appear after the third.</div>
              </div>
            ) : (
              <div className="dc-grid">{cells}</div>
            )}
            <div className="dc-foot">
              <div className="dc-form" title="Last five results">
                {card.form.map((f, i) => <i key={i} className={f === 1 ? 'dc-w' : f != null && f <= 3 ? 'dc-p' : f == null ? 'dc-x' : ''}>{f == null ? 'OUT' : `P${f}`}</i>)}
              </div>
              <button type="button" className="dc-turn" aria-label={`Turn ${label}'s card over`} onClick={(e) => { e.stopPropagation(); turn(); }}>↻</button>
            </div>
            <div className="dc-grain" /><div className="dc-foil" /><div className="dc-foil dc-edge" /><div className="dc-glare" /><div className="dc-sweep" /><div className="dc-ring" />
          </div>

          <div className="dc-face dc-back" style={{ '--tc': colour } as CSSProperties} aria-hidden={!flipped}>
            <div className="dc-grain" />
            <div className="dc-bk">
              <h3>{card.family}</h3>
              <div><h4>Championship position</h4><Trend points={trend} colour={colour} /></div>
              <div className="dc-tiles">
                <div className="dc-tile"><b>{card.best ? `P${card.best.pos}` : '-'}</b><span>{card.best ? `Best, ${shortRace(card.best.race)}` : 'No finish yet'}</span></div>
                <div className="dc-tile"><b>{card.worst ? `P${card.worst.pos}` : '-'}</b><span>{card.worst ? `Lowest, ${shortRace(card.worst.race)}` : 'No finish yet'}</span></div>
                <div className="dc-tile"><b>{card.wins} W · {card.podiums} PD</b><span>{card.starts} starts</span></div>
                <div className="dc-tile"><b>{card.poles} P · {card.dnfs} DNF</b><span>Poles and retirements</span></div>
              </div>
              {m && card.starts >= 1 ? (
                <div>
                  <h4>Against {m.family}</h4>
                  <div className="dc-duel">
                    <DuelRow label="Races ahead" a={m.races[0]} b={m.races[1]} />
                    <DuelRow label="Qualifying ahead" a={m.quali[0]} b={m.quali[1] - m.quali[0]} />
                    <DuelRow label="Points" a={m.points[0]} b={m.points[1]} />
                  </div>
                </div>
              ) : (
                <div><h4>Team-mate</h4><p>No team-mate comparison yet.</p></div>
              )}
              <div className="dc-credit">
                {photo
                  ? <>Photo: {photo.artist || 'unknown author'}, <a href={photo.page} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{photo.licence}</a>, via Wikimedia Commons. </>
                  : 'No freely licensed photo, so a silhouette is shown. '}
                Ratings compare the driver with everyone who has started at least 3 races.
              </div>
              <button type="button" className="dc-turn dc-turn-back" aria-label={`Turn ${label}'s card back over`} onClick={(e) => { e.stopPropagation(); turn(); }}>↻</button>
            </div>
            <div className="dc-ring" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** What the ratings mean, shown beside a card. */
export function CardHowTo() {
  return (
    <div className="dc-howto">
      <h3>How to read the card</h3>
      <p>Each stat is a rating from 1 to 99 showing where the driver stands among everyone with at least three starts this season. 99 is the best in the field and higher is always better. Gold is 85 and up, green 70 and up, amber 50 and up. The small figure under a stat is the real number, and the arrow shows how the rating moved since the previous round.</p>
      <dl>
        <dt>Points / race</dt><dd>Championship points divided by races started.</dd>
        <dt>Qualifying</dt><dd>Average qualifying position.</dd>
        <dt>Race finish</dt><dd>Average finishing position when classified.</dd>
        <dt>Points finishes</dt><dd>Share of starts finished in the top 10.</dd>
        <dt>Finish rate</dt><dd>Share of starts that were classified.</dd>
        <dt>Team-mate duel</dt><dd>Rounds qualified ahead of the team-mate.</dd>
      </dl>
      <p>The big number is an overall rating: points per race 30%, race finish 20%, qualifying 15%, team-mate duel 15%, points finishes 10% and finish rate 10%. The weights are Pit Wall's own choice, not an official measure, so it can differ from the championship order. Photos are freely licensed images from Wikimedia Commons, credited on the back of each card.</p>
    </div>
  );
}

function pick(snapshots: CardSnapshot[]) {
  const last = snapshots[snapshots.length - 1];
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const trend = (id: string): [number, number][] => snapshots.filter((s) => s.cards[id]).map((s) => [s.round, s.cards[id].pos]);
  return { last, prev, trend };
}

/** The card of one driver (by Jolpica driver id), with the explanation beside it. */
export function DriverCardSection({ season, driverId }: { season: string; driverId: string }) {
  const { snapshots, isLoading } = useDriverCards(season);
  const photos = useDriverPhotos();
  const { last, prev, trend } = useMemo(() => pick(snapshots), [snapshots]);
  const card = last?.cards[driverId];
  if (isLoading || !card) return null;
  return (
    <section className="card" aria-labelledby="driver-card">
      <div className="card-head">
        <h2 className="h2" id="driver-card">Driver card</h2>
        <span className="muted">After round {last.round}{last.race ? `: ${shortRace(last.race)}` : ''}</span>
      </div>
      <div className="dc-driver">
        <DriverCard card={card} prev={prev?.cards[driverId]} trend={trend(driverId)} photo={photos[driverId]} />
        <CardHowTo />
      </div>
    </section>
  );
}

type SortKey = 'standing' | 'overall' | number;

/** Every driver's card, sortable by standing, overall rating or any stat, and filtered by team. */
export function DriverCardGrid({ season }: { season: string }): ReactNode {
  const { snapshots, isLoading, error } = useDriverCards(season);
  const photos = useDriverPhotos();
  const [sort, setSort] = useState<SortKey>('standing');
  const [team, setTeam] = useState('all');
  const { last, prev, trend } = useMemo(() => pick(snapshots), [snapshots]);
  if (error) return <ErrorBox error={error} what="driver cards" />;
  if (isLoading) return <Loading rows={6} />;
  if (!last) return <Empty>Cards appear after the first race.</Empty>;
  const all = Object.values(last.cards);
  const teams = [...new Set(all.map((c) => c.team))].sort();
  const key = (c: CardData) => (sort === 'standing' ? c.pos : sort === 'overall' ? (c.overall == null ? 1e6 + c.pos : 100 - c.overall) : c.ratings?.[sort] == null ? 1e6 + c.pos : 100 - (c.ratings[sort] as number));
  const shown = all.filter((c) => team === 'all' || c.team === team).sort((a, b) => key(a) - key(b));
  return (
    <>
      <div className="dc-toolbar">
        <label>Sort by
          <select value={String(sort)} onChange={(e) => setSort(e.target.value === 'standing' || e.target.value === 'overall' ? e.target.value : Number(e.target.value))} aria-label="Sort cards by">
            <option value="standing">Championship standing</option>
            <option value="overall">Overall rating</option>
            {STAT_LABELS.map((l, i) => <option key={l} value={i}>{l} (highest first)</option>)}
          </select>
        </label>
        <label>Team
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Show team">
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <span className="muted" style={{ fontSize: 12 }}>After round {last.round}. Click a card to turn it over.</span>
      </div>
      <div className="dc-collection">
        {shown.map((c) => <DriverCard key={c.driverId} card={c} prev={prev?.cards[c.driverId]} trend={trend(c.driverId)} photo={photos[c.driverId]} />)}
      </div>
    </>
  );
}



/** Two drivers side by side: their cards, then each rating and real figure line by line. */
export function DriverCompare({ season }: { season: string }): ReactNode {
  const { snapshots, isLoading, error } = useDriverCards(season);
  const photos = useDriverPhotos();
  const { favoriteDriver } = useSettings();
  const { last, prev, trend } = useMemo(() => pick(snapshots), [snapshots]);
  const [chosen, setChosen] = useState<[string | null, string | null]>([null, null]);
  if (error) return <ErrorBox error={error} what="driver cards" />;
  if (isLoading) return <Loading rows={6} />;
  if (!last) return <Empty>Cards appear after the first race.</Empty>;
  const cards = Object.values(last.cards).sort((x, y) => x.pos - y.pos);
  const byId = last.cards;
  // By default the favourite driver (or the leader) against the closest other driver at the top.
  const first = (chosen[0] && byId[chosen[0]] ? chosen[0] : cards.find((c) => c.code === favoriteDriver)?.driverId) ?? cards[0].driverId;
  const second = (chosen[1] && byId[chosen[1]] && chosen[1] !== first ? chosen[1] : cards.find((c) => c.driverId !== first)?.driverId) ?? first;
  const a = byId[first], b = byId[second];
  const rows = compareRows(a, b);
  const options = cards.map((c) => <option key={c.driverId} value={c.driverId}>{c.given} {c.family}</option>);
  return (
    <>
      <div className="dc-toolbar">
        <label>First driver<select value={first} onChange={(e) => setChosen([e.target.value, second])} aria-label="First driver">{options}</select></label>
        <label>Second driver<select value={second} onChange={(e) => setChosen([first, e.target.value])} aria-label="Second driver">{options}</select></label>
        <span className="muted" style={{ fontSize: 12 }}>After round {last.round}.</span>
      </div>
      <div className="dc-compare-cards">
        {[a, b].map((c) => <DriverCard key={c.driverId} card={c} prev={prev?.cards[c.driverId]} trend={trend(c.driverId)} photo={photos[c.driverId]} />)}
      </div>
      <div className="scroll-x">
        <table className="dc-vs" aria-label={`${a.family} compared with ${b.family}`}>
          <thead><tr><th scope="col" className="l">{a.family}</th><th scope="col" /><th scope="col" className="r">{b.family}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className={`l${r.better === 'a' ? ' dc-win' : ''}`} data-better={r.better === 'a' ? 'true' : undefined}>{r.a.rating != null && <b>{r.a.rating}</b>} <span>{r.a.figure}</span></td>
                <th scope="row" className="lab">{r.label}</th>
                <td className={`r${r.better === 'b' ? ' dc-win' : ''}`} data-better={r.better === 'b' ? 'true' : undefined}><span>{r.b.figure}</span> {r.b.rating != null && <b>{r.b.rating}</b>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Each line shows the 1 to 99 rating in bold and the real figure beside it. Gold marks the higher rating. Ratings need three races.</p>
    </>
  );
}
