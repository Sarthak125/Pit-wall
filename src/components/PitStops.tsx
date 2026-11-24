import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Race, RaceWithResults, Result } from '../api/jolpica';
import { findMeeting, meetingSessions, openf1, type PitDetail, type Session, type Stint } from '../api/openf1';
import { useFavourite } from '../hooks/useFavourite';
import { median, rankStops, raceStops, SLOW_STOP, teamPitSummary } from '../lib/pitStops';
import { teamColour, tyre } from '../lib/teams';

async function raceSession(race: Race, sprint: boolean, signal?: AbortSignal): Promise<Session | null> {
  const m = await findMeeting([race.date], signal);
  if (!m) return null;
  const sessions = await meetingSessions(m.meeting_key, signal);
  return sessions.find((x) => (sprint ? x.session_name === 'Sprint' : x.session_name === 'Race')) ?? null;
}

const seconds = (v: number) => `${v.toFixed(1)} s`;

/**
 * A race's pit stops (OpenF1, 2023 onward), fastest first: how long each car stood still, the lap and the tyres taken
 * off and fitted. Stops that took 6 seconds or more (repairs, problems) are shown but left out of the typical time.
 */
export function RacePitStops({ race, results, sprint }: { race: Race; results: Result[]; sprint: boolean }) {
  const fav = useFavourite();
  const [all, setAll] = useState(false);
  const data = useQuery({
    queryKey: ['race-pit-stops', race.season, race.round, sprint],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const s = await raceSession(race, sprint, signal);
      if (!s) return null;
      const [pits, stints] = await Promise.all([
        openf1<PitDetail>('pit', { session_key: s.session_key }, signal),
        openf1<Stint>('stints', { session_key: s.session_key }, signal),
      ]);
      return { pits, stints };
    },
  });
  const byNum = useMemo(() => new Map(results.map((r) => [Number(r.number), r])), [results]);
  const view = useMemo(() => {
    if (!data.data?.pits.length) return null;
    const stops = raceStops(data.data.pits, data.data.stints).filter((s) => byNum.has(s.driver));
    const ranked = rankStops(stops);
    if (!ranked.length) return null;
    const kind = ranked[0].kind;
    const ok = ranked.filter((x) => x.time < (kind === 'stop' ? SLOW_STOP : Infinity)).map((x) => x.time);
    return { ranked, kind, typical: median(ok), slow: ranked.length - ok.length, untimed: stops.length - ranked.length, stops: stops.length };
  }, [data.data, byNum]);

  if (data.isLoading) return <div className="empty">Loading pit stops…</div>;
  if (!view) return <div className="empty">Pit stop times are not available for this {sprint ? 'sprint' : 'race'}.</div>;
  const best = view.ranked[0];
  const bestDriver = byNum.get(best.stop.driver)!;
  const shown = all ? view.ranked : view.ranked.filter((x, i) => i < 10 || byNum.get(x.stop.driver)?.Driver.code === fav?.code);
  const label = view.kind === 'stop' ? 'Stationary' : 'Pit lane';

  return (
    <>
      <p style={{ margin: '0 0 10px' }}>
        Fastest {view.kind === 'stop' ? 'stop' : 'pit lane time'}: <b>{bestDriver.Driver.code ?? bestDriver.Driver.familyName}</b> in <b className="mono">{seconds(best.time)}</b> on lap {best.stop.lap}.
        {view.typical != null && <> Typical {view.kind === 'stop' ? 'stop' : 'pit lane time'}: <b className="mono">{seconds(view.typical)}</b> across {view.ranked.length - view.slow} stops.</>}
      </p>
      <div className="scroll-x">
        <table className="tbl pit-tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Driver</th>
              <th className="r">Lap</th>
              <th>Tyres</th>
              <th className="r" title={view.kind === 'stop' ? 'Seconds the car stood still' : 'Seconds from pit lane entry to exit'}>{label}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => {
              const r = byNum.get(x.stop.driver)!;
              const idx = view.ranked.indexOf(x);
              return (
                <tr key={`${x.stop.driver}-${x.stop.lap}`} className={r.Driver.code === fav?.code ? 'fav' : undefined}>
                  <td className="mono muted">{idx + 1}</td>
                  <td>
                    <div className="who">
                      <span className="team-bar" style={{ background: teamColour(r.Constructor.constructorId) }} />
                      <span style={{ fontWeight: 600 }}>{r.Driver.code ?? r.Driver.familyName}</span>
                      {r.Driver.code === fav?.code && <span className="fav-star" aria-label="Favourite">★</span>}
                    </div>
                  </td>
                  <td className="r mono">{x.stop.lap}</td>
                  <td>
                    <span className="pace-stints">
                      {x.stop.from && <span className="chip"><i style={{ background: tyre(x.stop.from).colour }} />{tyre(x.stop.from).letter}</span>}
                      {x.stop.from && x.stop.to && <span className="muted" role="img" aria-label="to">→</span>}
                      {x.stop.to && <span className="chip"><i style={{ background: tyre(x.stop.to).colour }} />{tyre(x.stop.to).letter}</span>}
                    </span>
                  </td>
                  <td className="r mono">
                    {seconds(x.time)}
                    {view.kind === 'stop' && x.time >= SLOW_STOP && <span className="muted"> slow</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {view.ranked.length > 10 && (
        <button className="btn" style={{ marginTop: 8 }} onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Show fastest 10' : `Show all ${view.ranked.length} stops`}</button>
      )}
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        {view.kind === 'stop'
          ? `Stationary time is how long the car stood still, from OpenF1. Stops of ${SLOW_STOP} seconds or more (repairs, problems, a penalty served) are marked slow and left out of the typical time.`
          : 'OpenF1 has no stationary times for this race, so stops are ranked by time in the pit lane, which includes the drive through the lane and depends on the circuit.'}
        {view.untimed > 0 && ` ${view.untimed} ${view.untimed === 1 ? 'stop has' : 'stops have'} no time recorded and ${view.untimed === 1 ? 'is' : 'are'} not listed.`}
      </p>
    </>
  );
}

/**
 * A season's pit stops per team: fastest stop, typical stop (the middle time, without slow stops) and the number of
 * stops, from every finished race. Loads one request per race, so it fills in as the races arrive.
 */
export function SeasonPitStops({ races }: { races: RaceWithResults[] }) {
  const finished = useMemo(() => races.filter((r) => r.Results?.length), [races]);
  const year = finished[0]?.season;
  const sessions = useQuery({
    queryKey: ['season-race-sessions', year],
    enabled: !!year && Number(year) >= 2023,
    staleTime: 60 * 60_000,
    queryFn: async ({ signal }) => (await openf1<Session>('sessions', { year: Number(year), session_name: 'Race' }, signal)).sort((a, b) => a.date_start.localeCompare(b.date_start)),
  });
  // Each finished race's OpenF1 session: the one that started closest to the race's date.
  const sessionOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of finished) {
      const t = Date.parse(`${r.date}T12:00:00Z`);
      const near = (sessions.data ?? []).map((s) => ({ s, d: Math.abs(Date.parse(s.date_start) - t) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 2 * 86_400_000) map.set(r.round, near.s.session_key);
    }
    return map;
  }, [finished, sessions.data]);
  const pits = useQueries({
    queries: finished.map((r) => ({
      queryKey: ['race-pit-rows', sessionOf.get(r.round)],
      enabled: sessionOf.has(r.round),
      staleTime: Infinity,
      queryFn: ({ signal }: { signal?: AbortSignal }) => openf1<PitDetail>('pit', { session_key: sessionOf.get(r.round)! }, signal),
    })),
  });
  const loaded = pits.filter((p) => p.data).length;
  const expected = sessionOf.size;
  const rows = useMemo(() => {
    const tagged: { team: string; id: string; stop: number | null }[] = [];
    finished.forEach((r, i) => {
      const team = new Map((r.Results ?? []).map((x) => [Number(x.number), x.Constructor]));
      for (const p of pits[i]?.data ?? []) {
        const c = team.get(p.driver_number);
        if (c) tagged.push({ team: c.name, id: c.constructorId, stop: p.stop_duration ?? null });
      }
    });
    const ids = new Map(tagged.map((t) => [t.team, t.id]));
    return teamPitSummary(tagged).map((t) => ({ ...t, id: ids.get(t.team)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, pits.map((p) => p.dataUpdatedAt).join()]);

  if (!finished.length || Number(year) < 2023) return <div className="empty">Pit stop times are available for 2023 onward.</div>;
  if (sessions.isLoading) return <div className="empty">Loading pit stops…</div>;
  if (!rows.length) return <div className="empty">{loaded < expected ? 'Loading pit stops…' : 'Pit stop times are not available for this season.'}</div>;
  const fastest = Math.min(...rows.map((r) => r.fastest));

  return (
    <>
      <div className="scroll-x">
        <table className="tbl pit-tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th className="r" title="The middle stationary time of the team's stops, without stops of 6 seconds or more">Typical</th>
              <th className="r">Fastest</th>
              <th className="r" title="Stops with a time, and how many of them took 6 seconds or more">Stops (slow)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.team}>
                <td className="mono muted">{i + 1}</td>
                <td className="wrap">
                  <div className="who">
                    <span className="team-bar" style={{ background: teamColour(t.id) }} />
                    <span style={{ fontWeight: 600 }}>{t.team}</span>
                  </div>
                </td>
                <td className="r mono">{t.typical == null ? '-' : seconds(t.typical)}</td>
                <td className="r mono" style={t.fastest === fastest ? { fontWeight: 700 } : undefined} title={t.fastest === fastest ? 'Fastest stop of the season' : undefined}>{seconds(t.fastest)}</td>
                <td className="r mono">{t.stops}<span className="muted"> ({t.slow})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        {loaded < expected ? `Loaded ${loaded} of ${expected} races so far. ` : `All ${expected} races. `}
        Stationary times from OpenF1 (how long the car stood still), for races only, not sprints. The fastest stop of the season is in bold. Teams are ordered by their typical stop; stops of {SLOW_STOP} seconds or more are counted as slow and left out of it. Stops with no recorded time are not counted. Season totals include only what OpenF1 recorded, so a few stops may be missing.
      </p>
    </>
  );
}
