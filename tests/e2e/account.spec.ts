import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Sign-in and settings sync, against a stand-in for Supabase: the test build points at
 * https://pitwall-test.supabase.co (see the e2e job in .github/workflows/deploy.yml), and every request to it is
 * answered here. Each test keeps its own copy of the account's saved row.
 */
const SB = 'https://pitwall-test.supabase.co';
const SESSION_KEY = 'sb-pitwall-test-auth-token';
const USER = { id: '11111111-2222-3333-4444-555555555555', email: 'fan@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const AT = new Date('2026-11-22T08:00:00Z');

function session() {
  const exp = Math.floor(AT.getTime() / 1000) + 3600;
  return { access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: USER };
}

interface Member {
  user_id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  created_at: string;
  last_sign_in_at: string | null;
}

interface Server {
  role: Member['role'];
  members: Member[];
  row: { data: unknown; updated_at: string } | null;
  saves: unknown[];
  calls: string[];
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

async function fakeSupabase(page: Page, row: Server['row'] = null, role: Member['role'] = 'user', members: Member[] = []): Promise<Server> {
  const s: Server = { row, saves: [], calls: [], role, members };
  let n = 0;
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    s.calls.push(`${req.method()} ${url.pathname}`);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (url.pathname === '/rest/v1/profiles' && req.method() === 'GET') {
      const one = (req.headers()['accept'] ?? '').includes('object');
      return json(route, one ? s.row : s.row ? [s.row] : []);
    }
    if (url.pathname === '/rest/v1/profiles' && req.method() === 'POST') {
      const body = req.postDataJSON() as { user_id: string; data: unknown };
      s.saves.push(body.data);
      s.row = { data: body.data, updated_at: `2026-11-22T08:00:${String(++n).padStart(2, '0')}Z` };
      return json(route, { updated_at: s.row.updated_at }, 201);
    }
    if (url.pathname === '/rest/v1/rpc/delete_my_account') {
      s.row = null;
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    }
    if (url.pathname === '/rest/v1/rpc/my_role') return json(route, s.role);
    if (url.pathname === '/rest/v1/rpc/admin_list_users') {
      if (s.role === 'user') return json(route, { message: 'admins only', code: 'P0001' }, 400);
      return json(route, s.members);
    }
    if (url.pathname === '/rest/v1/rpc/set_admin') {
      const { target, make_admin } = req.postDataJSON() as { target: string; make_admin: boolean };
      if (s.role !== 'super_admin') return json(route, { message: 'only the super admin can change admins', code: 'P0001' }, 400);
      if (make_admin && s.members.filter((m) => m.role === 'admin').length >= 5) return json(route, { message: 'Pit Wall allows at most 5 admins', code: 'P0001' }, 400);
      const m = s.members.find((x) => x.user_id === target)!;
      m.role = make_admin ? 'admin' : 'user';
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    }
    if (url.pathname === '/auth/v1/otp') return json(route, {});
    if (url.pathname === '/auth/v1/token') return json(route, session());
    if (url.pathname === '/auth/v1/user') return json(route, USER);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    return json(route, { message: 'not in test' }, 404);
  });
  return s;
}

async function setUp(page: Page, opts: { signedIn?: boolean; settings?: object; reminders?: object[] } = {}) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Keeps the rest of the app off the network; the account card does not need its data.
  await page.route(/api\.openf1\.org|api\.jolpi\.ca|multiviewer\.app|open-meteo\.com/, (r) => r.abort());
  await page.clock.install({ time: AT });
  await page.addInitScript(
    ({ key, sess, settings, reminders }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      if (sess) localStorage.setItem(key, JSON.stringify(sess));
      if (settings) localStorage.setItem('pitwall:settings', JSON.stringify(settings));
      if (reminders) localStorage.setItem('pitwall:reminders', JSON.stringify(reminders));
    },
    { key: SESSION_KEY, sess: opts.signedIn ? session() : null, settings: opts.settings ?? null, reminders: opts.reminders ?? null },
  );
  return errors;
}

const card = (page: Page) => page.locator('section[aria-labelledby="account-h"]');
const future = AT.getTime() + 6 * 24 * 3600_000;

test('signed out: nothing is sent to the account service until you ask for a link', async ({ page }) => {
  const errors = await setUp(page);
  const server = await fakeSupabase(page);
  await page.goto('#/settings');
  await expect(card(page)).toContainText('Optional. Sign in');
  expect(server.calls).toEqual([]);
  await card(page).getByLabel('Email').fill('fan@example.com');
  await card(page).getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(card(page)).toContainText('Check fan@example.com for a sign-in link');
  expect(server.calls).toContain('POST /auth/v1/otp');
  expect(errors).toEqual([]);
});

test('signed in on a new device: the account settings arrive and reminders from both are kept', async ({ page }) => {
  const errors = await setUp(page, {
    signedIn: true,
    settings: { favoriteDriver: 'VER', favoriteName: 'Max Verstappen', theme: 'dark', liveDelay: 30 },
    reminders: [{ id: '2026-23-Race', at: future, session: 'Race', race: 'Abu Dhabi Grand Prix' }],
  });
  const server = await fakeSupabase(page, {
    updated_at: '2026-11-21T10:00:00Z',
    data: { v: 1, settings: { favoriteDriver: 'NOR', favoriteName: 'Lando Norris', theme: 'light' }, reminders: [{ id: '2026-23-Qualifying', at: future - 86_400_000, session: 'Qualifying', race: 'Abu Dhabi Grand Prix' }] },
  });
  await page.goto('#/settings');
  await expect(card(page)).toContainText('Signed in as fan@example.com');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(card(page)).toContainText('In sync');
  const saved = server.saves.at(-1) as { settings: Record<string, unknown>; reminders: { id: string }[] };
  expect(saved.settings.favoriteDriver).toBe('NOR');
  expect(saved.settings.liveDelay).toBeUndefined();
  expect(saved.reminders.map((r) => r.id)).toEqual(['2026-23-Qualifying', '2026-23-Race']);
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('pitwall:settings') ?? '{}'));
  expect(local.favoriteDriver).toBe('NOR');
  expect(local.liveDelay).toBe(30);
  expect(errors).toEqual([]);
});

test('signed in: a change is saved to the account, and sign out keeps settings on the device', async ({ page }) => {
  const errors = await setUp(page, { signedIn: true });
  const server = await fakeSupabase(page);
  await page.goto('#/settings');
  await expect(card(page)).toContainText('In sync');
  const before = server.saves.length;
  await page.getByRole('radio', { name: 'Light' }).click();
  await page.clock.runFor(2_000);
  await expect.poll(() => server.saves.length).toBeGreaterThan(before);
  expect((server.saves.at(-1) as { settings: { theme: string } }).settings.theme).toBe('light');
  await card(page).getByRole('button', { name: 'Sign out' }).click();
  await expect(card(page)).toContainText('Signed out. Your settings stay on this device.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('delete account asks first, then removes the saved row', async ({ page }) => {
  const errors = await setUp(page, { signedIn: true });
  const server = await fakeSupabase(page, { updated_at: '2026-11-21T10:00:00Z', data: { v: 1, settings: { theme: 'dark' }, reminders: [] } });
  await page.goto('#/settings');
  await expect(card(page)).toContainText('In sync');
  await card(page).getByRole('button', { name: 'Delete account' }).click();
  await expect(card(page)).toContainText('It cannot be undone.');
  await card(page).getByRole('button', { name: 'Delete my account' }).click();
  await expect(card(page)).toContainText('Account deleted');
  expect(server.calls).toContain('POST /rest/v1/rpc/delete_my_account');
  expect(server.row).toBeNull();
  expect(errors).toEqual([]);
});

test('coming back from a sign-in link finishes signing in and tidies the address', async ({ page }) => {
  const errors = await setUp(page);
  await page.addInitScript((key) => {
    localStorage.setItem(`${key}-code-verifier`, JSON.stringify('test-verifier'));
    sessionStorage.setItem('pitwall:return', '#/settings');
  }, SESSION_KEY);
  const server = await fakeSupabase(page);
  await page.goto('?code=abc123#/');
  await expect(card(page)).toContainText('Signed in as fan@example.com', { timeout: 20_000 });
  expect(server.calls).toContain('POST /auth/v1/token');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('#/settings');
  expect(errors).toEqual([]);
});

for (const theme of ['dark', 'light']) {
  test(`the signed-in Account card and delete question (${theme}) have no WCAG A or AA problems axe can find`, async ({ page }) => {
    await setUp(page, { signedIn: true, settings: { theme } });
    await fakeSupabase(page, { updated_at: '2026-11-21T10:00:00Z', data: { v: 1, settings: { theme }, reminders: [] } });
    await page.goto('#/settings');
    await expect(card(page)).toContainText('In sync');
    await card(page).getByRole('button', { name: 'Delete account' }).click();
    const res = await new AxeBuilder({ page }).include('section[aria-labelledby="account-h"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

const member = (i: number, role: Member['role'] = 'user'): Member => ({ user_id: `00000000-0000-0000-0000-00000000000${i}`, email: `person${i}@example.com`, role, created_at: '2026-11-01T10:00:00Z', last_sign_in_at: '2026-11-20T10:00:00Z' });

test('the super admin sees every account and can make and remove admins, up to 5', async ({ page }) => {
  const errors = await setUp(page, { signedIn: true });
  const members = [{ ...member(0, 'super_admin'), email: 'fan@example.com' }, member(1, 'admin'), member(2, 'admin'), member(3, 'admin'), member(4, 'admin'), member(5), member(6)];
  const server = await fakeSupabase(page, null, 'super_admin', members);
  await page.goto('#/settings');
  await expect(card(page)).toContainText('Super admin');
  await expect(card(page).getByRole('button', { name: 'Delete account' })).toHaveCount(0);
  await card(page).getByRole('link', { name: 'Open the Admin page' }).click();
  await expect(page.locator('main')).toContainText('7 accounts · 4 of 5 admins');
  await page.getByRole('button', { name: 'Make admin: person5@example.com' }).click();
  await expect(page.locator('main')).toContainText('person5@example.com is now an admin.');
  await expect(page.locator('main')).toContainText('5 of 5 admins');
  await expect(page.getByRole('button', { name: 'Make admin: person6@example.com' })).toBeDisabled();
  await expect(page.locator('main')).toContainText('All 5 admin places are taken');
  await page.getByRole('button', { name: 'Remove admin: person1@example.com' }).click();
  await expect(page.locator('main')).toContainText('4 of 5 admins');
  expect(server.calls.filter((c) => c === 'POST /rest/v1/rpc/set_admin')).toHaveLength(2);
  const res = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('an admin sees the accounts but cannot change roles', async ({ page }) => {
  const errors = await setUp(page, { signedIn: true });
  await fakeSupabase(page, null, 'admin', [member(0, 'super_admin'), { ...member(1, 'admin'), email: 'fan@example.com' }, member(2)]);
  await page.goto('#/admin');
  await expect(page.locator('main')).toContainText('3 accounts · 1 of 5 admins');
  await expect(page.locator('main')).toContainText('Only the super admin can change who is an admin.');
  await expect(page.getByRole('button', { name: /Make admin|Remove admin/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a normal user, or someone signed out, gets no Admin page', async ({ page }) => {
  const errors = await setUp(page, { signedIn: true });
  const server = await fakeSupabase(page);
  await page.goto('#/settings');
  await expect(card(page)).toContainText('In sync');
  await expect(card(page).getByRole('link', { name: 'Open the Admin page' })).toHaveCount(0);
  await page.goto('#/admin');
  await expect(page.locator('main')).toContainText('This page is for Pit Wall admins.');
  expect(server.calls).not.toContain('POST /rest/v1/rpc/admin_list_users');
  expect(errors).toEqual([]);
});
