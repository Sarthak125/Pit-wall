import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Race, Result } from '../api/jolpica';
import { findMeeting, meetingSessions, openf1, type PitDetail, type RaceControlMsg, type Stint } from '../api/openf1';
import { useFavourite } from '../hooks/useFavourite';
import { raceStory, type StoryKind } from '../lib/raceStory';
import { getRacePositions } from '../lib/sectorLines';
import { teamColour } from '../lib/teams';

const KIND: Record<StoryKind, { label: string; tone: string }> = {
  start: { label: 'Start', tone: 'green' },
  lead: { label: 'Lead', tone: 'blue' },
  sc: { label: 'Safety car', tone: 'amber' },
  vsc: { label: 'VSC', tone: 'amber' },
  red: { label: 'Red flag', tone: 'red' },
  pit: { label: 'Pit stop', tone: 'grey' },
  penalty: { label: 'Penalty', tone: 'red' },
  retire: { label: 'Out', tone: 'grey' },
  fastest: { label: 'Fastest lap', tone: 'violet' },
  finish: { label: 'Finish', tone: 'solid' },
};

/**
 * A race told as a timeline (OpenF1, 2023 onward): the start, lead changes, safety cars and red flags, pit stops,
 * penalties, retirements, the fastest lap and the finish. Shares the position and tyre data the charts below load.
 */
export function RaceStory({ race, results, sprint }: { race: Race; results: Result[]; sprint: boolean }) {
  const fav = useFavourite();
  const [everything, setEverything] = useState(false);
  const meeting = useQuery({ queryKey: ['meeting-year', race.season, race.round], staleTime: Infinity, queryFn: ({ signal }) => findMeeting([race.date], signal) });
  const mk = meeting.data?.meeting_key;
  const positions = useQuery({ queryKey: ['race-positions', mk, sprint], enabled: !!mk, staleTime: Infinity, queryFn: ({ signal }) => getRacePositions(mk!, sprint, signal) });
  const extra = useQuery({
    queryKey: ['race-story', mk, sprint],
    enabled: !!mk,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const sessions = await meetingSessions(mk!, signal);
      const s = sessions.find((x) => (sprint ? x.session_name === 'Sprint' : x.session_name === 'Race'));
      if (!s) return null;
      const [raceControl, pits, stints] = await Promise.all([
        openf1<RaceControlMsg>('race_control', { session_key: s.session_key }, signal),
        openf1<PitDetail>('pit', { session_key: s.session_key }, signal),
        openf1<Stint>('stints', { session_key: s.session_key }, signal),
      ]);
      return { raceControl, pits, stints };
    },
  });

  const events = useMemo(
    () => (positions.data && extra.data ? raceStory({ results, traces: positions.data.traces, lapRows: positions.data.lapRows, ...extra.data }) : []),
    [positions.data, extra.data, results],
  );
  const colourOf = useMemo(() => new Map(results.map((r) => [Number(r.number), teamColour(r.Constructor.constructorId)])), [results]);
  const favNum = Number(results.find((r) => r.Driver.code && r.Driver.code === fav?.code)?.number) || null;

  if (meeting.isLoading || positions.isLoading || extra.isLoading) return <div className="empty">Loading the race story…</div>;
  if (!positions.data || !extra.data) return <div className="empty">The race story is not available for this {sprint ? 'sprint' : 'race'}.</div>;
  const hidden = events.filter((e) => e.minor && !e.cars.includes(favNum ?? -1)).length;
  const shown = everything ? events : events.filter((e) => !e.minor || e.cars.includes(favNum ?? -1));

  return (
    <>
      <ol className="story" aria-label={`${sprint ? 'Sprint' : 'Race'} timeline`}>
        {shown.map((e, i) => {
          const k = KIND[e.kind];
          const mine = favNum != null && e.cars.includes(favNum);
          return (
            <li key={i} className={`story-item${mine ? ' story-fav' : ''}`} data-kind={e.kind}>
              <span className="story-lap mono">{e.lap != null ? `L${e.lap}` : 'After'}</span>
              <span className="story-rail" aria-hidden="true"><i style={e.cars[0] != null && (e.kind === 'pit' || e.kind === 'lead' || e.kind === 'start' || e.kind === 'finish') ? { background: colourOf.get(e.cars[0]) } : undefined} /></span>
              <div className="story-body">
                <div className="story-title">
                  <span className={`pill tone-${k.tone}`}>{k.label}</span>
                  <span>{e.title}</span>
                  {mine && <span className="fav-star" role="img" aria-label="Favourite">★</span>}
                </div>
                {e.detail && <div className="muted story-detail">{e.detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <button className="btn" style={{ marginTop: 8 }} onClick={() => setEverything(!everything)} aria-expanded={everything}>
          {everything ? 'Show key moments only' : `Show all pit stops (${hidden} more)`}
        </button>
      )}
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        Worked out from OpenF1's positions, pit stops, tyres and race control messages. Lead changes are positions at the end of each lap, so a pass and re-pass within a lap does not show. Pit stops by drivers outside the top five are hidden unless you ask for them.
      </p>
    </>
  );
}
