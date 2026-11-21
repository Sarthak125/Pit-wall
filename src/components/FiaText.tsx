import { friendly, type ClassifiedMsg } from '../lib/raceControl';
import { fmtClock } from '../lib/format';

/** Time on top, lap underneath only when the message has one. */
export function FiaWhen({ m }: { m: ClassifiedMsg }) {
  return (
    <div className="when">
      <div>{fmtClock(new Date(m.date))}</div>
      {m.lap_number ? <div className="faint">Lap {m.lap_number}</div> : null}
    </div>
  );
}

/** Readable headline and reason, with the stewards' exact wording one tap away. */
export function FiaText({ m, codeOf, children }: { m: ClassifiedMsg; codeOf?: (n: number) => string; children?: React.ReactNode }) {
  const f = friendly(m, codeOf);
  return (
    <div className="text">
      <div className="fia-title">{f.title}</div>
      {f.detail && <div className="fia-detail">{f.detail}</div>}
      {children}
      <details className="fia-raw">
        <summary>Official wording</summary>
        <div>{m.message}</div>
      </details>
    </div>
  );
}
