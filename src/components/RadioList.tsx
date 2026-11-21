import { useState } from 'react';
import type { TeamRadio } from '../api/openf1';
import { useTranscripts } from '../hooks/useTranscripts';
import { fmtClock } from '../lib/format';

export interface DriverLabel {
  code: string;
  colour: string;
}

/** Team radio clips, newest first, each with its automatic transcript when ready. */
export function RadioList({ clips, sessionKey, live, labels, limit = 8 }: { clips: TeamRadio[]; sessionKey: number | undefined; live: boolean; labels?: Map<number, DriverLabel>; limit?: number }) {
  const tx = useTranscripts(sessionKey, live);
  const [all, setAll] = useState(false);
  if (!clips.length) return <span className="muted">No team radio published yet.</span>;
  const list = [...clips].sort((a, b) => b.date.localeCompare(a.date));
  const shown = all ? list : list.slice(0, limit);
  return (
    <div>
      <div className="faint" style={{ fontSize: 12, marginBottom: 4 }}>
        {tx.error ? 'Transcripts are unavailable right now.' : 'Automatic transcripts, may contain mistakes.'}
      </div>
      {shown.map((c) => {
        const t = tx.data?.clips[c.recording_url];
        const who = labels?.get(c.driver_number);
        return (
          <div className="radio-row" key={c.recording_url} style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 84, flex: 'none' }}>
              <div className="mono faint" style={{ fontSize: 12 }}>{fmtClock(new Date(c.date))}</div>
              {who && (
                <div className="who" style={{ gap: 6, marginTop: 4 }}>
                  <span className="team-bar" style={{ width: 3, height: 14, background: who.colour }} />
                  <span className="code" style={{ fontSize: 15 }}>{who.code}</span>
                </div>
              )}
            </div>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <audio controls preload="none" src={c.recording_url} aria-label={`Team radio${who ? ` from ${who.code}` : ''} at ${fmtClock(new Date(c.date))}`} style={{ width: '100%', height: 36 }} />
              {t?.status === 'ok' ? (
                <div className="transcript">“{t.text}”</div>
              ) : t?.status === 'no_speech' ? (
                <div className="transcript pending">No clear speech in this clip.</div>
              ) : tx.isLoading ? null : (
                <div className="transcript pending">Transcript pending</div>
              )}
            </div>
          </div>
        );
      })}
      {list.length > limit && (
        <button className="btn" style={{ marginTop: 10 }} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${list.length} clips`}
        </button>
      )}
    </div>
  );
}
