import { useEffect, useRef, useState } from 'react';
import type { Lap, OF1Driver, TeamRadio } from '../api/openf1';
import { fmtClock, niceName } from '../lib/format';
import { driverHref } from '../lib/router';
import { teamColour } from '../lib/teams';

const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Team radio as cards: driver photo with a mic badge, name, when it was sent,
 * and a play button. One clip plays at a time.
 */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function RadioCards({ clips, drivers, favNum, teamNums, laps = [], limit = 8 }: { clips: TeamRadio[]; drivers: Map<number, OF1Driver>; favNum: number | null; teamNums: number[]; laps?: Lap[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState<{ cur: number; dur: number }>({ cur: 0, dur: 0 });
  // Clip lengths learnt while playing, so they stay shown afterwards.
  const [lengths, setLengths] = useState<Record<string, number>>({});

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
        setTime({ cur: a.currentTime, dur: Number.isFinite(a.duration) ? a.duration : 0 });
      });
      audio.current.addEventListener('loadedmetadata', () => {
        const a = audio.current!;
        if (Number.isFinite(a.duration)) setLengths((l) => ({ ...l, [a.src]: a.duration }));
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
          // The lap the driver was on when the message was sent.
          const lap = laps
            .filter((l) => l.driver_number === c.driver_number && l.date_start && l.date_start <= c.date)
            .reduce<number | null>((m, l) => (m == null || l.lap_number > m ? l.lap_number : m), null);
          const len = lengths[c.recording_url];
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
                <div className="rcard-when">
                  {lap != null && <span className="rcard-lap">Lap {lap}</span>}
                  {dayFmt.format(at)}, {fmtClock(at)}
                  <span className="mono rcard-time">{on ? `${mmss(time.cur)} / ${time.dur ? mmss(time.dur) : '…'}` : len ? mmss(len) : ''}</span>
                </div>
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
