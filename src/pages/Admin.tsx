import { useCallback, useEffect, useState } from 'react';
import { listMembers, MAX_ADMINS, setAdmin, useAccount, type Member } from '../lib/account';
import { Footer } from '../components/Shell';

const ROLE_NAME = { super_admin: 'Super admin', admin: 'Admin', user: 'User' } as const;

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never');

/**
 * Admin page (#/admin): everyone with an account and their role. Admins can see the list; only the super admin can
 * make or remove admins. The database checks both, so this page only decides what to show.
 */
export function Admin() {
  const a = useAccount();
  const isAdmin = a.status === 'signed-in' && a.role !== 'user';
  const isSuper = a.role === 'super_admin';
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    setError('');
    listMembers().then(setMembers, (e: Error) => setError(`Could not load accounts: ${e.message}`));
  }, []);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <>
        <section className="card">
          <h1 className="h2" style={{ marginBottom: 8 }}>Admin</h1>
          <p className="muted" style={{ margin: 0 }}>
            {a.status === 'starting' ? 'Checking your account…' : 'This page is for Pit Wall admins. Sign in from Settings with an admin account to use it.'}
          </p>
        </section>
        <Footer />
      </>
    );
  }

  const admins = members?.filter((m) => m.role === 'admin').length ?? 0;
  const change = async (m: Member, makeAdmin: boolean) => {
    setBusy(m.user_id);
    setNote('');
    try {
      await setAdmin(m.user_id, makeAdmin);
      setNote(makeAdmin ? `${m.email} is now an admin.` : `${m.email} is now a normal user.`);
      load();
    } catch (e) {
      setNote(`Could not change ${m.email}: ${(e as Error).message}`);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <section className="card" aria-labelledby="admin-h">
        <h1 id="admin-h" className="h2" style={{ marginBottom: 8 }}>Admin</h1>
        <p className="muted" style={{ margin: '0 0 12px' }}>
          {isSuper
            ? `You are the super admin. You can make up to ${MAX_ADMINS} people admins; everyone else is a normal user.`
            : 'You are an admin. Only the super admin can change who is an admin.'}{' '}
          Email addresses here are personal data: use them only to run Pit Wall.
        </p>
        {members && (
          <p style={{ margin: '0 0 12px' }} role="status">
            {members.length} account{members.length === 1 ? '' : 's'} · {admins} of {MAX_ADMINS} admins
          </p>
        )}
        {error && <p className="acct-msg err" role="alert">{error}</p>}
        {note && <p className="acct-msg" role="status" style={{ marginBottom: 12 }}>{note}</p>}
        {!members && !error && <p className="muted" role="status">Loading accounts…</p>}
        {members && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Last sign-in</th>
                  {isSuper && <th scope="col"><span className="sr-only">Change role</span></th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="admin-email">{m.email}</td>
                    <td>{m.role === 'user' ? ROLE_NAME.user : <span className="role-badge">{ROLE_NAME[m.role]}</span>}</td>
                    <td>{day(m.created_at)}</td>
                    <td>{day(m.last_sign_in_at)}</td>
                    {isSuper && (
                      <td>
                        {m.role === 'admin' && (
                          <button className="btn sm" type="button" disabled={!!busy} onClick={() => void change(m, false)} aria-label={`Remove admin: ${m.email}`}>
                            Remove admin
                          </button>
                        )}
                        {m.role === 'user' && (
                          <button className="btn sm" type="button" disabled={!!busy || admins >= MAX_ADMINS} onClick={() => void change(m, true)} aria-label={`Make admin: ${m.email}`}>
                            Make admin
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isSuper && admins >= MAX_ADMINS && <p className="muted" style={{ margin: '12px 0 0' }}>All {MAX_ADMINS} admin places are taken. Remove an admin to add another.</p>}
      </section>
      <Footer />
    </>
  );
}
