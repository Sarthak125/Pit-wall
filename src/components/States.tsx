import { OpenF1BlockedError } from '../lib/openf1Window';
import { OpenF1BlockedNotice } from './OpenF1Blocked';
import { HttpError } from '../api/http';

export function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: number | string }) {
  return <div className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />;
}

export function Loading({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} h={28} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, what }: { error: unknown; what: string }) {
  if (error instanceof OpenF1BlockedError) return <OpenF1BlockedNotice w={error.window} compact />;
  let detail = 'Check your internet connection and try again.';
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) {
      detail = 'The data provider refused the request. Live OpenF1 data during a session may need an OpenF1 account (add a token in Settings).';
    } else if (error.status === 429) {
      detail = 'Too many requests. The app will retry shortly.';
    } else if (error.status === 404) {
      detail = 'No data found for this selection yet.';
    } else {
      detail = `The data provider returned an error (${error.status}).`;
    }
  }
  return (
    <div className="error" role="alert">
      Could not load {what}. {detail}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
