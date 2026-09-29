import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ClubAPI } from './api';
import { INITIAL_ARTICLES } from '../data/initialArticles';

const storage = new Map<string, string>();
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  storage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test.each([400, 429, 500])('does not publish a local comment after HTTP %i', async (status) => {
  fetchMock.mockResolvedValue(Response.json({ error: '评论未获接受' }, { status }));
  await expect(ClubAPI.addComment('club-1', '文友', '尚未发表的文字')).rejects.toThrow(
    '评论未获接受',
  );
});

test('keeps a network failure as a failed write', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  await expect(ClubAPI.addComment('club-1', '文友', '离线文字')).rejects.toThrow();
});

test.each([
  new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } }),
  Response.json({}),
])('requires a server-confirmed comment', async (response) => {
  fetchMock.mockResolvedValue(response);
  await expect(ClubAPI.addComment('club-1', '文友', '文字')).rejects.toThrow();
});

test('accepts an empty server list even when there are sample and cached comments', async () => {
  storage.set('newmaybe_club_comments', JSON.stringify({ 'club-1': [{ id: 'old-comment' }] }));
  fetchMock.mockResolvedValue(Response.json({ article: INITIAL_ARTICLES[0], comments: [] }));
  expect((await ClubAPI.fetchArticle('club-1')).comments).toEqual([]);
});

test('keeps an explicitly empty cached list when reading offline', async () => {
  storage.set('newmaybe_club_comments', JSON.stringify({ 'club-1': [] }));
  fetchMock.mockRejectedValue(new TypeError('offline'));
  expect((await ClubAPI.fetchArticle('club-1')).comments).toEqual([]);
});

test('returns the confirmed reply and sends its parent information', async () => {
  const comment = {
    id: 'server-id',
    articleId: 'club-1',
    author: '文友',
    content: '答跋',
    likes: 0,
    createdAt: '2026-09-29',
    replyToId: 'parent',
    replyToAuthor: '作者',
  };
  fetchMock.mockResolvedValue(Response.json({ comment }, { status: 201 }));
  expect(await ClubAPI.addComment('club-1', '文友', '答跋', 'parent', '作者')).toEqual(comment);
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
    replyToId: 'parent',
    replyToAuthor: '作者',
  });
});
