import { updateSettings, useSettings } from '../lib/settings';

const OPTIONS = [0, 10, 20, 30, 45, 60, 90, 120];

/** TV delay: holds F1's live feed back so it matches a TV or stream that runs behind. */
export function DelayPicker({ label = 'TV delay', bare = false }: { label?: string; bare?: boolean }) {
  const s = useSettings();
  const v = s.liveDelay || 0;
  if (bare) {
    return (
      <select className="input" style={{ maxWidth: 160 }} value={OPTIONS.includes(v) ? v : 0} onChange={(e) => updateSettings({ liveDelay: Number(e.target.value) })}>
        {OPTIONS.map((o) => (
          <option key={o} value={o}>{o ? `${o} s` : 'Off'}</option>
        ))}
      </select>
    );
  }
  return (
    <label className="field delay-picker" title="Hold live timing back so it matches your TV or stream (F1's feed is usually 30 to 60 seconds ahead of the broadcast)">
      {label}
      <select className="select" value={OPTIONS.includes(v) ? v : 0} onChange={(e) => updateSettings({ liveDelay: Number(e.target.value) })}>
        {OPTIONS.map((o) => (
          <option key={o} value={o}>{o ? `${o} s` : 'Off'}</option>
        ))}
      </select>
    </label>
  );
}
