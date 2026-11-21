import { dismissAlert, useAlerts } from '../lib/alerts';

/** Pop-up alerts about the favourite driver, top right (bottom on small screens). */
export function Toasts() {
  const alerts = useAlerts();
  if (!alerts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {alerts.map((a) => (
        <div key={a.id} className={`toast tone-border-${a.tone}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{a.title}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{a.body}</div>
          </div>
          <button className="toast-x" aria-label="Dismiss alert" onClick={() => dismissAlert(a.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
