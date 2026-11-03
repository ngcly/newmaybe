import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import worker, { type Env } from '../worker';
import { testDatabase } from '../test/database';
import type { Manuscript } from '../types';
import { featuredPage } from './featured-page';
import type { FeaturedCatalog } from '../lib/featured';

let database: ReturnType<typeof testDatabase>;
let env: Env;
const mail = new Map<string, string>();
const mockFetch = vi.fn<typeof fetch>();
beforeEach(() => {
  database = testDatabase();
  mail.clear();
  mockFetch.mockReset();
  env = {
    DB: database.db,
    AUTH_SECRET: 'test-only-secret-with-at-least-32-characters',
    CLUB_ADMIN_EMAILS: 'editor@example.test',
    GMAIL_SENDER: 'sender@example.test',
    GMAIL_CLIENT_ID: 'test-client',
    GMAIL_CLIENT_SECRET: 'test-secret',
    GMAIL_REFRESH_TOKEN: 'test-refresh',
    ASSETS: {
      fetch: async () =>
        new Response(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), {
          headers: { 'Content-Type': 'text/html' },
        }),
    },
  };
  mockFetch.mockImplementation(async (input, init) => {
    if (String(input) === 'https://oauth2.googleapis.com/token')
      return Response.json({ access_token: 'test-access' });
    expect(String(input)).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    const mime = Buffer.from(JSON.parse(String(init?.body)).raw, 'base64url').toString();
    const recipient = mime.match(/To: (.+)\r\n/)![1];
    const text = Buffer.from(mime.split('\r\n\r\n')[1], 'base64').toString();
    mail.set(recipient, text.match(/\d{6}/)![0]);
    return Response.json({ id: 'test-message' });
  });
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  database.sqlite.close();
  vi.unstubAllGlobals();
});

async function api(path: string, method = 'GET', body?: unknown, cookie = '') {
  return worker.fetch(
    new Request(`https://club.newmaybe.com/api/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Club-Request': '1',
        Cookie: cookie,
        Origin: 'https://club.newmaybe.com',
        'CF-Connecting-IP': '192.0.2.1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}
async function login(email = 'author@example.test') {
  const sent = await api('auth/code', 'POST', { email });
  expect(sent.status).toBe(200);
  const { challengeId } = (await sent.json()) as { challengeId: string };
  const verified = await api('auth/verify', 'POST', { email, challengeId, code: mail.get(email) });
  expect(verified.status).toBe(200);
  return verified.headers.get('Set-Cookie')!.split(';')[0];
}
const draft = {
  title: '我的第一篇',
  content: '云端正文与一个安静的下午。',
  topicId: 'deep-night',
  authorSeal: '文友',
  seriesTitle: '',
  goldenQuote: '',
};
async function create(cookie: string) {
  const response = await api('manuscripts', 'POST', draft, cookie);
  expect(response.status).toBe(201);
  return ((await response.json()) as { manuscript: Manuscript }).manuscript;
}
async function action(item: Manuscript, name: string, cookie: string, admin = false, note = '') {
  const response = await api(
    `${admin ? 'admin/' : ''}manuscripts/${item.id}/${name}`,
    'POST',
    { version: item.version, note },
    cookie,
  );
  expect(response.status, await response.clone().text()).toBe(200);
  return ((await response.json()) as { manuscript: Manuscript }).manuscript;
}

test('email verification is single use, sessions are private and logout revokes access', async () => {
  const sent = await api('auth/code', 'POST', { email: 'author@example.test' });
  const payload = (await sent.json()) as { challengeId: string };
  expect(payload).not.toHaveProperty('code');
  const body = {
    email: 'author@example.test',
    challengeId: payload.challengeId,
    code: mail.get('author@example.test'),
  };
  const response = await api('auth/verify', 'POST', body);
  const header = response.headers.get('Set-Cookie')!;
  expect(header).toContain('HttpOnly');
  expect(header).toContain('Secure');
  expect(header).toContain('SameSite=Lax');
  const cookie = header.split(';')[0];
  expect((await api('auth/verify', 'POST', body)).status).toBe(400);
  expect((await api('auth/me', 'GET', undefined, cookie)).headers.get('Cache-Control')).toBe(
    'no-store',
  );
  const current = await (await api('auth/me', 'GET', undefined, cookie)).json();
  expect(current).toMatchObject({ user: { email: 'author@example.test', isAdmin: false } });
  expect(
    database.sqlite.prepare('SELECT token_hash FROM author_sessions').get()?.token_hash,
  ).not.toBe(cookie.split('=')[1]);
  await api('auth/logout', 'POST', {}, cookie);
  expect((await api('manuscripts', 'GET', undefined, cookie)).status).toBe(401);
});

test('verification expires, rejects brute force and enforces resend cooldown', async () => {
  const email = 'author@example.test';
  const { challengeId } = (await (await api('auth/code', 'POST', { email })).json()) as {
    challengeId: string;
  };
  expect((await api('auth/code', 'POST', { email })).status).toBe(429);
  const wrong = mail.get(email) === '000000' ? '111111' : '000000';
  for (let n = 0; n < 5; n++)
    expect((await api('auth/verify', 'POST', { email, challengeId, code: wrong })).status).toBe(
      400,
    );
  expect(
    (await api('auth/verify', 'POST', { email, challengeId, code: mail.get(email) })).status,
  ).toBe(400);
  database.sqlite.exec('UPDATE login_challenges SET attempts=0, expires_at=unixepoch()-1');
  expect(
    (await api('auth/verify', 'POST', { email, challengeId, code: mail.get(email) })).status,
  ).toBe(400);
});

test('mail failures fail closed without returning provider credentials or enabling login', async () => {
  mockFetch.mockResolvedValue(Response.json({ error: 'PRIVATE_PROVIDER_ERROR' }, { status: 401 }));
  const response = await api('auth/code', 'POST', { email: 'author@example.test' });
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('PRIVATE_PROVIDER_ERROR');
  expect(database.sqlite.prepare('SELECT count(*) AS n FROM login_challenges').get()?.n).toBe(0);
  env.GMAIL_CLIENT_SECRET = undefined;
  expect((await api('auth/code', 'POST', { email: 'author@example.test' })).status).toBe(503);
});

test('CSRF, unauthenticated and other-author operations cannot change drafts or review', async () => {
  expect((await api('manuscripts', 'POST', draft)).status).toBe(401);
  const alice = await login();
  const bob = await login('other@example.test');
  const item = await create(alice);
  for (const [method, path, body] of [
    ['GET', `manuscripts/${item.id}`, undefined],
    ['PUT', `manuscripts/${item.id}`, { ...draft, version: item.version }],
    ['DELETE', `manuscripts/${item.id}`, { version: item.version }],
    ['POST', `manuscripts/${item.id}/withdraw`, { version: item.version }],
  ] as const)
    expect((await api(path, method, body, bob)).status).toBe(404);
  expect((await api('admin/manuscripts', 'GET', undefined, bob)).status).toBe(403);
  const crossSite = await worker.fetch(
    new Request('https://club.newmaybe.com/api/manuscripts', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        'X-Club-Request': '1',
        'Content-Type': 'application/json',
        Cookie: alice,
      },
      body: '{}',
    }),
    env,
  );
  expect(crossSite.status).toBe(403);
  const form = await worker.fetch(
    new Request('https://club.newmaybe.com/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: alice },
    }),
    env,
  );
  expect(form.status).toBe(403);
});

test('draft → review → publish → revision leaves the old publication visible until approved', async () => {
  const author = await login();
  const editor = await login('editor@example.test');
  await api('auth/profile', 'PUT', { penName: '林间客' }, author);
  let item = await create(author);
  expect((await api(`articles/${item.id}`)).status).toBe(404);
  expect(await (await api('articles')).json()).toMatchObject({ articles: [], stats: { total: 0 } });
  item = await action(item, 'submit', author);
  expect(
    (await api(`manuscripts/${item.id}`, 'PUT', { ...draft, version: item.version }, author))
      .status,
  ).toBe(409);
  item = await action(item, 'approve', editor, true);
  expect(await (await api(`articles/${item.id}`)).json()).toMatchObject({
    article: { content: draft.content, author: '林间客', likes: 0 },
  });
  await api(`articles/${item.id}/comments`, 'POST', { content: '旧版的评注' });
  const saved = await api(
    `manuscripts/${item.id}`,
    'PUT',
    { ...draft, content: '修订后正文', author: '伪造作者', version: item.version },
    author,
  );
  item = ((await saved.json()) as { manuscript: Manuscript }).manuscript;
  item = await action(item, 'submit', author);
  expect(await (await api(`articles/${item.id}`)).json()).toMatchObject({
    article: { content: draft.content },
  });
  item = await action(item, 'reject', editor, true, '请补充结尾。');
  expect(item.reviewNote).toBe('请补充结尾。');
  expect(item.isPublic).toBe(true);
  item = await action(item, 'submit', author);
  item = await action(item, 'approve', editor, true);
  const published = await (await api(`articles/${item.id}`)).json();
  expect(published).toMatchObject({
    article: { content: '修订后正文', author: '林间客' },
    comments: [expect.objectContaining({ content: '旧版的评注' })],
  });
  const history = (await (
    await api(`manuscripts/${item.id}/revisions`, 'GET', undefined, author)
  ).json()) as { revisions: { state: string }[] };
  expect(history.revisions.map((revision) => revision.state)).toEqual([
    'approved',
    'rejected',
    'approved',
  ]);
});

test('stale saves and approval attempts are rejected and do not partially publish', async () => {
  const author = await login();
  const editor = await login('editor@example.test');
  const item = await create(author);
  const updated = await api(
    `manuscripts/${item.id}`,
    'PUT',
    { ...draft, title: '设备 A', version: item.version },
    author,
  );
  expect(updated.status).toBe(200);
  expect(
    (
      await api(
        `manuscripts/${item.id}`,
        'PUT',
        { ...draft, title: '设备 B', version: item.version },
        author,
      )
    ).status,
  ).toBe(409);
  const fresh = ((await updated.json()) as { manuscript: Manuscript }).manuscript;
  const submitted = await action(fresh, 'submit', author);
  await action(submitted, 'cancel', author);
  expect(
    (
      await api(
        `admin/manuscripts/${item.id}/approve`,
        'POST',
        { version: submitted.version },
        editor,
      )
    ).status,
  ).toBe(409);
  expect((await api(`articles/${item.id}`)).status).toBe(404);
});

test('withdrawal blocks feed, detail, comments, likes, HTML, and associated edition resources', async () => {
  const author = await login();
  const editor = await login('editor@example.test');
  let item = await action(await create(author), 'submit', author);
  item = await action(item, 'approve', editor, true);
  item = await action(item, 'withdraw', author);
  expect((await api(`articles/${item.id}`)).status).toBe(404);
  expect(await (await api('articles')).json()).toMatchObject({ articles: [], stats: { total: 0 } });
  expect(
    (await api(`articles/${item.id}/comments`, 'POST', { content: '撤回后的评注' })).status,
  ).toBe(404);
  expect((await api(`articles/${item.id}/like`, 'POST', {})).status).toBe(404);
  const html = await worker.fetch(
    new Request(`https://club.newmaybe.com/articles/${item.id}`),
    env,
  );
  expect(html.status).toBe(404);
  const catalog: FeaturedCatalog = {
    currentIssue: 'issue-001',
    issues: [
      {
        slug: 'issue-001',
        number: '001',
        title: '作品',
        author: '文友',
        description: '推荐',
        publishedAt: '2026-10-15',
        articleId: item.id,
        articleRevision: 'v1',
        status: 'published',
      },
    ],
  };
  const assets = { fetch: vi.fn() };
  for (const path of [
    '/featured/issue-001',
    '/featured/issue-001/assets/music.mp3',
    '/featured/issue-001.html',
  ])
    expect(
      (
        await featuredPage(
          new Request(`https://club.newmaybe.com${path}`),
          assets,
          catalog,
          database.db,
        )
      ).status,
    ).toBe(404);
  expect(assets.fetch).not.toHaveBeenCalled();
  expect((await api(`manuscripts/${item.id}`, 'GET', undefined, author)).status).toBe(200);
  expect(
    (await api(`manuscripts/${item.id}`, 'DELETE', { version: item.version }, author)).status,
  ).toBe(400);
});

test('draft validation, multiple drafts and deletion preserve ownership and exact length limits', async () => {
  const author = await login();
  expect(
    (await api('manuscripts', 'POST', { ...draft, content: '文'.repeat(50001) }, author)).status,
  ).toBe(400);
  expect((await api('manuscripts', 'POST', { ...draft, topicId: 'fake' }, author)).status).toBe(
    400,
  );
  const accepted = await api(
    'manuscripts',
    'POST',
    { ...draft, content: '文'.repeat(50000) },
    author,
  );
  expect(accepted.status).toBe(201);
  const item = await create(author);
  const list = (await (await api('manuscripts', 'GET', undefined, author)).json()) as {
    manuscripts: Manuscript[];
  };
  expect(list.manuscripts).toHaveLength(2);
  expect(list.manuscripts.every((value) => value.draft.content === '')).toBe(true);
  expect(
    (await api(`manuscripts/${item.id}`, 'DELETE', { version: item.version }, author)).status,
  ).toBe(200);
  expect((await api(`manuscripts/${item.id}`, 'GET', undefined, author)).status).toBe(404);
});

test('simultaneous edits accept only one version and keep the winning text', async () => {
  const author = await login();
  const item = await create(author);
  const responses = await Promise.all(
    ['设备 A', '设备 B'].map((title) =>
      api(`manuscripts/${item.id}`, 'PUT', { ...draft, title, version: item.version }, author),
    ),
  );
  expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  const winner = (await responses.find((response) => response.status === 200)!.json()) as {
    manuscript: Manuscript;
  };
  const current = (await (
    await api(`manuscripts/${item.id}`, 'GET', undefined, author)
  ).json()) as { manuscript: Manuscript };
  expect(current.manuscript.version).toBe(item.version + 1);
  expect(current.manuscript.draft.title).toBe(winner.manuscript.draft.title);
});

test('failed public projection rolls back review state and can be retried', async () => {
  const author = await login();
  const editor = await login('editor@example.test');
  const item = await action(await create(author), 'submit', author);
  database.sqlite.exec(
    "CREATE TRIGGER fail_publish BEFORE INSERT ON articles BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
  );
  const failed = await api(
    `admin/manuscripts/${item.id}/approve`,
    'POST',
    { version: item.version },
    editor,
  );
  expect(failed.status).toBe(500);
  const current = (await (
    await api(`manuscripts/${item.id}`, 'GET', undefined, author)
  ).json()) as { manuscript: Manuscript };
  expect(current.manuscript).toMatchObject({
    version: item.version,
    status: 'pending',
    isPublic: false,
  });
  expect((await api(`articles/${item.id}`)).status).toBe(404);
  database.sqlite.exec('DROP TRIGGER fail_publish');
  await action(item, 'approve', editor, true);
  expect((await api(`articles/${item.id}`)).status).toBe(200);
});

test('a new pen name reaches an existing publication only after another review', async () => {
  const author = await login();
  const editor = await login('editor@example.test');
  let item = await action(await create(author), 'submit', author);
  item = await action(item, 'approve', editor, true);
  await api('auth/profile', 'PUT', { penName: '新的笔名' }, author);
  item = await action(item, 'submit', author);
  expect(await (await api(`articles/${item.id}`)).json()).toMatchObject({
    article: { author: '文友' },
  });
  await action(item, 'approve', editor, true);
  expect(await (await api(`articles/${item.id}`)).json()).toMatchObject({
    article: { author: '新的笔名' },
  });
});
