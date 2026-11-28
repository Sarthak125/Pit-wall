import { useState } from 'react';
import { accountProviders, deleteAccount, signInWithEmail, signInWithProvider, signOut, syncNow, useAccount } from '../lib/account';

const PROVIDER_NAME = { github: 'GitHub', google: 'Google' } as const;

function syncText(sync: string, at: number): string {
  if (sync === 'saving') return 'Saving…';
  if (sync === 'offline') return 'Offline. Changes will be saved when you are back online.';
  if (sync === 'error') return 'Could not save just now. Pit Wall will try again.';
  if (sync === 'saved' && at) return `In sync, last checked at ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  return 'Checking your saved settings…';
}

/** Settings: optional sign-in so favourites, theme, spoiler-free mode and reminders follow you between devices. */
export function AccountCard() {
  const a = useAccount();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (a.status === 'off') return null;
  const providers = accountProviders();

  return (
    <section className="card" aria-labelledby="account-h">
      <h2 id="account-h" className="h2 sm" style={{ marginBottom: 8 }}>Account</h2>
      {a.status === 'signed-in' ? (
        <div className="form">
          <p style={{ margin: 0 }}>
            Signed in as <b>{a.email || 'your account'}</b>
            {a.role !== 'user' && <span className="role-badge">{a.role === 'super_admin' ? 'Super admin' : 'Admin'}</span>}
          </p>
          {a.role !== 'user' && (
            <p style={{ margin: 0 }}>
              <a href="#/admin">Open the Admin page</a>
            </p>
          )}
          <p className="muted" role="status" style={{ margin: 0 }}>{syncText(a.sync, a.syncedAt)}</p>
          <span className="hint">
            Your favourite driver and team, alerts, track map, spoiler-free mode, theme and session reminders follow you to any device you sign in on.
            The OpenF1 token, request limit, system notifications and TV delay stay on each device.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn" type="button" onClick={() => void syncNow()}>Sync now</button>
            <button className="btn" type="button" onClick={() => void signOut()}>Sign out</button>
            {!confirmDelete && a.role !== 'super_admin' && <button className="btn" type="button" onClick={() => setConfirmDelete(true)}>Delete account</button>}
          </div>
          {a.role === 'super_admin' && <span className="hint">The super admin account cannot be deleted from the app, so Pit Wall always has one.</span>}
          {confirmDelete && (
            <div className="acct-confirm" role="group" aria-label="Delete account">
              <p style={{ margin: 0 }}>This removes your sign-in and the settings saved with it. Settings on this device stay. It cannot be undone.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button className="btn danger" type="button" disabled={busy} onClick={async () => { setBusy(true); await deleteAccount(); setBusy(false); setConfirmDelete(false); }}>
                  Delete my account
                </button>
                <button className="btn" type="button" onClick={() => setConfirmDelete(false)}>Keep it</button>
              </div>
            </div>
          )}
        </div>
      ) : a.status === 'starting' ? (
        <p className="muted" role="status" style={{ margin: 0 }}>Signing you in…</p>
      ) : (
        <div className="form">
          <span className="hint">
            Optional. Sign in to keep your favourites, theme, spoiler-free mode and session reminders the same on your phone, tablet and laptop.
            Everything else in Pit Wall works without an account.
          </span>
          <form
            className="acct-email"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim()) return;
              setBusy(true);
              if (await signInWithEmail(email)) setEmail('');
              setBusy(false);
            }}
          >
            <label style={{ flex: '1 1 220px' }}>
              Email
              <input className="input" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>Email me a sign-in link</button>
          </form>
          {providers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {providers.map((p) => (
                <button key={p} className="btn" type="button" onClick={() => void signInWithProvider(p)}>
                  Continue with {PROVIDER_NAME[p]}
                </button>
              ))}
            </div>
          )}
          <span className="hint">
            Signing in stores your email address and these settings with Supabase, the account service Pit Wall uses. You can delete the account at any
            time from here.
          </span>
        </div>
      )}
      {a.message && (
        <p className={a.messageTone === 'error' ? 'acct-msg err' : 'acct-msg'} role={a.messageTone === 'error' ? 'alert' : 'status'}>
          {a.message}
        </p>
      )}
    </section>
  );
}
