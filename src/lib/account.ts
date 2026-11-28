/**
 * Optional sign-in (Supabase) that keeps favourites, theme, spoiler-free mode and session reminders the same on every
 * device you use. Without a configured project, or while signed out, nothing here touches the network and the app
 * works exactly as before, with settings on this device only.
 *
 * Sync rules (see src/lib/syncDoc.ts): the first time a device meets an account that already has settings, the
 * account's settings win and reminders from both are kept. After that, each change is saved about a second later,
 * and changes made on another device are picked up when the app opens or comes back to the foreground. If both
 * change before either saves, the later save wins.
 */
import { useSyncExternalStore } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { cloudConfig, cloudEnabled, hasStoredSession, type Provider } from './cloudConfig';
import { getSettings, subscribe as subscribeSettings, updateSettings } from './settings';
import { getReminders, setReminders, subscribeReminders } from './reminders';
import { applyTheme } from './theme';
import { makeDoc, mergeFirst, readDoc, sameDoc, type SyncDoc } from './syncDoc';

export type Role = 'user' | 'admin' | 'super_admin';

export interface AccountState {
  /** off: no account service configured in this build. */
  status: 'off' | 'signed-out' | 'starting' | 'signed-in';
  email: string;
  /** From the database (supabase/migrations/0002_roles.sql). The app only uses it to show or hide things; the server checks every admin action. */
  role: Role;
  sync: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  syncedAt: number;
  /** A message for the Account card (link sent, sign-in failed, and so on). */
  message: string;
  messageTone: 'info' | 'error';
}

const META = 'pitwall:sync';
const RETURN = 'pitwall:return';
const PUSH_DELAY = 1_200;

let state: AccountState = { status: 'off', email: '', role: 'user', sync: 'idle', syncedAt: 0, message: '', messageTone: 'info' };
const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export const accountProviders = (): Provider[] => cloudConfig().providers;

let sb: SupabaseClient | null = null;
let booting: Promise<SupabaseClient> | null = null;
let userId = '';
let applying = false;
let dirty = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let stopWatching: (() => void) | null = null;

/** Called once at start-up. Loads the SDK only when this browser is signed in or returning from a sign-in link. */
export function startAccount() {
  if (!cloudEnabled()) return;
  set({ status: 'signed-out' });
  if (hasStoredSession()) {
    set({ status: 'starting' });
    void boot().catch(() => set({ status: 'signed-out', message: 'Could not reach the account service. Your settings on this device still work.', messageTone: 'error' }));
  }
}

function boot(): Promise<SupabaseClient> {
  if (sb) return Promise.resolve(sb);
  booting ??= (async () => {
    const { getClient } = await import('./supabaseClient');
    const client = getClient();
    client.auth.onAuthStateChange((_event, session) => {
      // Supabase asks that its own calls are not awaited inside this callback.
      setTimeout(() => onSession(session), 0);
    });
    const q = new URLSearchParams(window.location.search);
    const urlError = q.get('error_description');
    const returning = q.has('code') || q.has('error') || !!urlError;
    const { data } = await client.auth.getSession();
    if (returning) tidyUrl();
    if (urlError) set({ message: `Sign-in did not finish: ${urlError}`, messageTone: 'error' });
    sb = client;
    onSession(data.session);
    return client;
  })();
  return booting;
}

/**
 * After coming back from a sign-in link: removes ?code= (or an error) from the address, if Supabase has not already,
 * and goes back to the page you started from.
 */
function tidyUrl() {
  let back = '';
  try {
    back = sessionStorage.getItem(RETURN) ?? '';
    sessionStorage.removeItem(RETURN);
  } catch {
    // Not saved: stay on the current page.
  }
  const hash = /^#\/[a-z0-9/_-]*$/i.test(back) ? back : window.location.hash;
  history.replaceState(history.state, '', window.location.pathname + hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function onSession(session: Session | null) {
  const id = session?.user?.id ?? '';
  if (id && id === userId) return; // Token refresh: nothing new.
  if (!id) {
    userId = '';
    stopSync();
    if (state.status !== 'off') set({ status: 'signed-out', email: '', role: 'user', sync: 'idle' });
    return;
  }
  userId = id;
  set({ status: 'signed-in', email: session?.user?.email ?? '', role: 'user', message: '' });
  startSync();
  void loadRole();
}

async function loadRole() {
  if (!sb || !userId) return;
  const id = userId;
  const { data, error } = await sb.rpc('my_role');
  if (id !== userId || error) return;
  set({ role: data === 'super_admin' || data === 'admin' ? data : 'user' });
}

export interface Member {
  user_id: string;
  email: string;
  role: Role;
  created_at: string;
  last_sign_in_at: string | null;
}

/** Everyone with an account (admins only; the server refuses anyone else). */
export async function listMembers(): Promise<Member[]> {
  if (!sb) throw new Error('Not signed in');
  const { data, error } = await sb.rpc('admin_list_users');
  if (error) throw new Error(error.message);
  return (data ?? []) as Member[];
}

/** Makes someone an admin or a normal user again (super admin only; the server enforces it and the limit of 5). */
export async function setAdmin(target: string, makeAdmin: boolean): Promise<void> {
  if (!sb) throw new Error('Not signed in');
  const { error } = await sb.rpc('set_admin', { target, make_admin: makeAdmin });
  if (error) throw new Error(error.message);
}

export const MAX_ADMINS = 5;

// ---------- Sync ----------

interface Meta {
  user: string;
  at: string;
}

function readMeta(): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(META) ?? '{}') as Partial<Meta>;
    return { user: typeof m.user === 'string' ? m.user : '', at: typeof m.at === 'string' ? m.at : '' };
  } catch {
    return { user: '', at: '' };
  }
}

function writeMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META, JSON.stringify(m));
    else localStorage.removeItem(META);
  } catch {
    // Without it the next start does a full merge again, which is safe.
  }
}

const localDoc = (): SyncDoc => makeDoc(getSettings(), getReminders());

function apply(doc: SyncDoc) {
  applying = true;
  try {
    updateSettings(doc.settings);
    setReminders(doc.reminders);
    applyTheme();
  } finally {
    applying = false;
  }
}

function startSync() {
  stopSync();
  const onLocal = () => {
    if (applying || !userId) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void push(), PUSH_DELAY);
  };
  const offSettings = subscribeSettings(onLocal);
  const offReminders = subscribeReminders(onLocal);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void (dirty ? push() : pull());
  };
  const onOnline = () => void (dirty ? push() : pull());
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  stopWatching = () => {
    offSettings();
    offReminders();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
  };
  void pull();
}

function stopSync() {
  clearTimeout(pushTimer);
  stopWatching?.();
  stopWatching = null;
}

function failed(err: unknown) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  set({ sync: offline ? 'offline' : 'error' });
  if (!offline) console.warn('Account sync failed', err);
}

async function pull() {
  if (!sb || !userId) return;
  const id = userId;
  const { data, error } = await sb.from('profiles').select('data, updated_at').eq('user_id', id).maybeSingle();
  if (id !== userId) return;
  if (error) return failed(error);
  if (!data) return push();
  const cloud = readDoc(data.data);
  const meta = readMeta();
  if (meta.user !== id) {
    // First time this device meets this account.
    const merged = mergeFirst(localDoc(), cloud);
    apply(merged);
    writeMeta({ user: id, at: data.updated_at as string });
    if (!sameDoc(merged, cloud)) return push();
  } else if (data.updated_at !== meta.at && !dirty) {
    apply(cloud);
    writeMeta({ user: id, at: data.updated_at as string });
  } else if (dirty) {
    return push();
  }
  set({ sync: 'saved', syncedAt: Date.now() });
}

async function push() {
  if (!sb || !userId) return;
  clearTimeout(pushTimer);
  const id = userId;
  dirty = false;
  set({ sync: 'saving' });
  const { data, error } = await sb
    .from('profiles')
    .upsert({ user_id: id, data: localDoc() }, { onConflict: 'user_id' })
    .select('updated_at')
    .single();
  if (id !== userId) return;
  if (error) {
    dirty = true;
    return failed(error);
  }
  writeMeta({ user: id, at: (data?.updated_at as string) ?? '' });
  set({ sync: 'saved', syncedAt: Date.now() });
}

// ---------- Actions for the Account card ----------

const redirectUrl = () => window.location.origin + window.location.pathname;

function rememberPage() {
  try {
    sessionStorage.setItem(RETURN, window.location.hash || '#/settings');
  } catch {
    // Lands on the Dashboard instead.
  }
}

export async function signInWithEmail(email: string): Promise<boolean> {
  set({ message: '', messageTone: 'info' });
  try {
    const client = await boot();
    rememberPage();
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true } });
    if (error) {
      set({ message: `Could not send the link: ${error.message}`, messageTone: 'error' });
      return false;
    }
    set({ message: `Check ${email.trim()} for a sign-in link. Open it in this browser.`, messageTone: 'info' });
    return true;
  } catch {
    set({ message: 'Could not reach the account service. Try again in a moment.', messageTone: 'error' });
    return false;
  }
}

export async function signInWithProvider(provider: Provider) {
  set({ message: '', messageTone: 'info' });
  try {
    const client = await boot();
    rememberPage();
    const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } });
    if (error) set({ message: `Could not start sign-in: ${error.message}`, messageTone: 'error' });
  } catch {
    set({ message: 'Could not reach the account service. Try again in a moment.', messageTone: 'error' });
  }
}

/** Signs out. Settings stay on this device as they are; they just stop following the account. */
export async function signOut() {
  if (!sb) return;
  if (dirty) await push().catch(() => undefined);
  stopSync();
  userId = '';
  writeMeta(null);
  await sb.auth.signOut().catch(() => undefined);
  set({ status: 'signed-out', email: '', role: 'user', sync: 'idle', message: 'Signed out. Your settings stay on this device.', messageTone: 'info' });
}

/** Deletes the account and its saved settings on the server. Settings on this device are kept. */
export async function deleteAccount(): Promise<boolean> {
  if (!sb) return false;
  const { error } = await sb.rpc('delete_my_account');
  if (error) {
    set({ message: `Could not delete the account: ${error.message}`, messageTone: 'error' });
    return false;
  }
  stopSync();
  userId = '';
  writeMeta(null);
  await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
  set({ status: 'signed-out', email: '', role: 'user', sync: 'idle', message: 'Account deleted, with its saved settings. Your settings stay on this device.', messageTone: 'info' });
  return true;
}

export async function syncNow() {
  if (dirty) await push();
  else await pull();
}
