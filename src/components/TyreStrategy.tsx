import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { findMeeting, meetingSessions, openf1, type Stint } from '../api/openf1';
import type { Race, Result } from '../api/jolpica';
import { useFavourite } from '../hooks/useFavourite';
import { teamColour } from '../lib/teams';
import { tyre, TYRE } from '../lib/teams';

export interface StrategyDriver {
  num: number;
  code: string;
  colour: string;
}

/**
 * Tyre strategy: one row per driver (in race order) across the race laps, each stint a bar in its compound colour.
 * A used set (fitted with laps already on it) is striped; the joins between bars are pit stops. Hover or tap a stint
 * for its laps and tyre age.
 */
export function TyreStrategy({ stints, drivers, totalLaps, currentLap, favNum }: { stints: Stint[]; drivers: StrategyDriver[]; totalLaps: number | null; currentLap?: number | null; favNum?: number | null }) {
  const [tip, setTip] = useState<{ n: number; s: Stint } | null>(null);
  const lastLap = Math.max(1, totalLaps ?? 0, ...stints.map((s) => s.lap_end ?? s.lap_start ?? 0));
  const byDriver = new Map<number, Stint[]>();
  for (const s of stints) {
    const list = byDriver.get(s.driver_number) ?? [];
    list.push(s);
    byDriver.set(s.driver_number, list);
  }
  const rows = drivers.filter((d) => byDriver.has(d.num));
  if (!rows.length) return <div className="empty">Tyre stints appear here once the race is under way.</div>;
  const used = new Set(stints.filter((s) => s.compound).map((s) => (s.compound ?? '').toUpperCase()));
  const pct = (lap: number) => `${((lap - 1) / lastLap) * 100}%`;
  const ticks = Array.from({ length: Math.floor(lastLap / 10) + 1 }, (_, i) => i * 10).filter((l) => l <= lastLap);

  return (
    <div className="strategy">
      <div className="legend" style={{ marginBottom: 10 }}>
        {Object.entries(TYRE)
          .filter(([k]) => used.has(k))
          .map(([k, t]) => (
            <span key={k}>
              <i className="sw" style={{ background: t.colour }} />
              {t.name}
            </span>
          ))}
        <span>
          <i className="sw used-sw" />
          Used set
        </span>
      </div>
      <div className="strategy-grid" onMouseLeave={() => setTip(null)}>
        {rows.map((d) => {
          const list = [...byDriver.get(d.num)!].sort((a, b) => a.stint_number - b.stint_number);
          return (
            <div key={d.num} className={`strategy-row${d.num === favNum ? ' fav' : ''}`}>
              <span className="strategy-code">
                <i style={{ background: d.colour }} />
                {d.code}
              </span>
              <span className="strategy-track">
                {list.map((s) => {
                  const start = s.lap_start ?? 1;
                  const end = Math.max(start, s.lap_end ?? currentLap ?? start);
                  const t = tyre(s.compound);
                  const isUsed = (s.tyre_age_at_start ?? 0) > 0;
                  const laps = end - start + 1;
                  return (
                    <button
                      key={s.stint_number}
                      className={`strategy-stint${isUsed ? ' used' : ''}`}
                      style={{ left: pct(start), width: `calc(${(laps / lastLap) * 100}% - 2px)`, background: t.colour, color: s.compound?.toUpperCase() === 'HARD' || s.compound?.toUpperCase() === 'MEDIUM' ? '#111' : '#fff' }}
                      aria-label={`${d.code}: ${t.name}, laps ${start} to ${end}${isUsed ? `, used set (${s.tyre_age_at_start} laps old)` : ', new set'}`}
                      onMouseEnter={() => setTip({ n: d.num, s })}
                      onFocus={() => setTip({ n: d.num, s })}
                      onClick={() => setTip({ n: d.num, s })}
                    >
                      {laps >= 4 ? `${t.letter} ${laps}` : ''}
                    </button>
                  );
                })}
              </span>
            </div>
          );
        })}
        <div className="strategy-row axis" aria-hidden="true">
          <span className="strategy-code" />
          <span className="strategy-track">
            {ticks.map((l) => (
              <span key={l} className="strategy-tick" style={{ left: pct(Math.max(1, l)) }}>{l === 0 ? 'Lap 1' : l}</span>
            ))}
          </span>
        </div>
      </div>
      {tip && (() => {
        const d = drivers.find((x) => x.num === tip.n);
        const t = tyre(tip.s.compound);
        const start = tip.s.lap_start ?? 1;
        const end = tip.s.lap_end ?? currentLap ?? start;
        const age = tip.s.tyre_age_at_start ?? 0;
        return (
          <div className="strategy-tip" role="status">
            <b>{d?.code}</b> · stint {tip.s.stint_number}: <b style={{ color: t.colour }}>{t.name}</b>, laps {start} to {end} ({end - start + 1} laps)
            {age > 0 ? ` · used set, ${age} laps old when fitted, ${age + end - start + 1} at the end` : ' · new set'}
          </div>
        );
      })()}
      <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>Each bar is a stint, in race order. Gaps between bars are pit stops; striped bars are sets that had laps on them when fitted.</div>
    </div>
  );
}

/** The race page version: stints from OpenF1 for a finished race or sprint (2023 onward), in finishing order. */
export function RaceTyreStrategy({ race, results, sprint }: { race: Race; results: Result[]; sprint: boolean }) {
  const fav = useFavourite();
  const data = useQuery({
    queryKey: ['race-stints', race.season, race.round, sprint],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const meeting = await findMeeting([race.date], signal);
      if (!meeting) return null;
      const sessions = await meetingSessions(meeting.meeting_key, signal);
      const s = sessions.find((x) => (sprint ? x.session_name === 'Sprint' : x.session_name === 'Race'));
      if (!s) return null;
      return openf1<Stint>('stints', { session_key: s.session_key }, signal);
    },
  });
  if (data.isLoading) return <div className="empty">Loading tyre strategy…</div>;
  if (!data.data?.length) return <div className="empty">Tyre strategy is not available for this {sprint ? 'sprint' : 'race'}.</div>;
  const drivers = [...results]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((r) => ({ num: Number(r.number), code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(), colour: teamColour(r.Constructor.constructorId) }));
  const laps = Math.max(0, ...results.map((r) => Number(r.laps) || 0));
  const favNum = drivers.find((d) => d.code === fav?.code)?.num ?? null;
  return <TyreStrategy stints={data.data} drivers={drivers} totalLaps={laps || null} favNum={favNum} />;
}
