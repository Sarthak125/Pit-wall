import { useEffect, useState } from 'react';
import { applyUpdate, onUpdate } from '../lib/update';

/** Shown when a new version of the app has been downloaded and is waiting. */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => onUpdate(() => setReady(true)), []);
  if (!ready || dismissed) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version of Pit Wall is ready.</span>
      <button className="btn primary" onClick={() => applyUpdate()}>Reload</button>
      <button className="btn" onClick={() => setDismissed(true)}>Later</button>
    </div>
  );
}
