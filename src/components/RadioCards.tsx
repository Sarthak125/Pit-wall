import { useEffect, useRef, useState } from 'react';
import type { OF1Driver, TeamRadio } from '../api/openf1';
import { fmtClock, niceName } from '../lib/format';
import { driverHref } from '../lib/router';
import { teamColour } from '../lib/teams';

const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Team radio as cards: driver photo with a mic badge, name, when it was sent,
 * and a play button. One clip plays at a time.
 */
export function RadioCards({ clips, drivers, favNum, teamNums, limit = 8 }: { clips: TeamRadio[]; drivers: Map<number, OF1Driver>; favNum: number | null; teamNums: number[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => audio.current?.pause(), []);

  if (!clips.length) return <span className="muted">No team radio published yet.</span>;
  const list = [...clips].sort((a, b) => b.date.localeCompare(a.date));
  const shown = all ? list : list.slice(0, limit);

  const toggle = (url: string) => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.preload = 'none';
      audio.current.addEventListener('timeupdate', () => {
        const a = audio.current!;
        setProgress(a.duration ? a.currentTime / a.duration : 0);
      });
      audio.current.addEventListener('ended', () => {
        setPlaying(null);
        setProgress(0);
      });
    }
    const a = audio.current;
    if (playing === url) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = url;
    setProgress(0);
    a.play().then(() => setPlaying(url)).catch(() => setPlaying(null));
  };

  return (
    <div>
      <div className="rcards">
        {shown.map((c) => {
          const d = drivers.get(c.driver_number);
          const colour = teamColour(d?.team_name, d?.team_colour);
          const name = d ? niceName(d.full_name) : `Car ${c.driver_number}`;
          const at = new Date(c.date);
          const on = playing === c.recording_url;
          const mark = c.driver_number === favNum ? ' fav' : teamNums.includes(c.driver_number) ? ' team' : '';
          return (
            <div className={`rcard${mark}`} key={c.recording_url}>
              <button className="rcard-face" style={{ '--team': colour } as React.CSSProperties} onClick={() => toggle(c.recording_url)} aria-label={`${on ? 'Pause' : 'Play'} team radio from ${name} at ${fmtClock(at)}`}>
                {d?.headshot_url ? <img src={d.headshot_url} alt="" loading="lazy" /> : <span className="rcard-init">{d?.name_acronym ?? c.driver_number}</span>}
                <span className={`rcard-mic${on ? ' on' : ''}`} aria-hidden="true">
                  {on ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                  )}
                </span>
              </button>
              <div className="rcard-body">
                {d ? <a className="name-link rcard-name" href={driverHref(d.name_acronym)}>{name}</a> : <span className="rcard-name">{name}</span>}
                <div className="rcard-when">{dayFmt.format(at)}, {fmtClock(at)}</div>
                <div className="rcard-bar" aria-hidden="true"><i style={{ width: `${on ? progress * 100 : 0}%`, background: colour }} /></div>
              </div>
            </div>
          );
        })}
      </div>
      {list.length > limit && (
        <button className="btn" style={{ marginTop: 10 }} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${list.length} clips`}
        </button>
      )}
    </div>
  );
}
