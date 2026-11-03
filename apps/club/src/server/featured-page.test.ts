import { expect, test, vi } from 'vitest';
import { featuredPage } from './featured-page';
import type { FeaturedCatalog } from '../lib/featured';

const catalog: FeaturedCatalog = {
  currentIssue: 'issue-001',
  issues: [
    {
      slug: 'issue-001',
      number: '001',
      title: '第一期',
      author: '文友',
      description: '推荐',
      publishedAt: '2026-10-15',
      articleId: 'club-1',
      articleRevision: 'v1',
      status: 'published',
    },
    {
      slug: 'draft',
      number: '002',
      title: '草稿',
      author: '文友',
      description: '推荐',
      publishedAt: '2026-11-15',
      articleId: 'club-2',
      articleRevision: 'v1',
      status: 'draft',
    },
  ],
};
const request = (path: string, method = 'GET') =>
  new Request(`https://club.newmaybe.com${path}`, { method });

test.each([
  '/featured/missing',
  '/featured/draft',
  '/featured/draft/assets/cover.png',
  '/featured/common/secret.css',
  '/featured/common/fonts.css',
  '/featured/common/fonts/secret.woff2',
  '/featured/common/fonts/5.2.9/secret.css',
])('returns a real 404 before looking up unpublished or unknown paths: %s', async (path) => {
  const assets = { fetch: vi.fn() };
  const response = await featuredPage(request(path), assets, catalog);
  expect(response.status).toBe(404);
  expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  expect(assets.fetch).not.toHaveBeenCalled();
});

test('serves an independent document and supports HEAD without returning its body', async () => {
  const assets = {
    fetch: vi.fn(
      async () =>
        new Response('<meta name="club-featured" content="/featured/issue-001"><h1>独立页面</h1>', {
          headers: { 'Content-Type': 'text/html' },
        }),
    ),
  };
  const response = await featuredPage(request('/featured/issue-001'), assets, catalog);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('独立页面');
  const head = await featuredPage(request('/featured/issue-001', 'HEAD'), assets, catalog);
  expect(head.status).toBe(200);
  expect(await head.text()).toBe('');
});

test('canonicalizes trailing slashes and HTML aliases', async () => {
  for (const suffix of ['/', '.html']) {
    const response = await featuredPage(
      request(`/featured/issue-001${suffix}`),
      undefined,
      catalog,
    );
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe('https://club.newmaybe.com/featured/issue-001');
  }
});

test('never serves the application fallback as an issue or a missing media file', async () => {
  const assets = {
    fetch: async () =>
      new Response('<div id="root"></div>', { headers: { 'Content-Type': 'text/html' } }),
  };
  expect((await featuredPage(request('/featured/issue-001'), assets, catalog)).status).toBe(503);
  expect(
    (await featuredPage(request('/featured/issue-001/missing.mp3'), assets, catalog)).status,
  ).toBe(404);
});

test('preserves media bytes and MIME type, and rejects writes', async () => {
  const assets = {
    fetch: async () =>
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } }),
  };
  const response = await featuredPage(
    request('/featured/issue-001/assets/music.mp3'),
    assets,
    catalog,
  );
  expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  expect((await featuredPage(request('/featured', 'POST'), assets, catalog)).status).toBe(405);
});

test('caches the versioned shared fonts and their stylesheet for good', async () => {
  const assets = {
    fetch: async () =>
      new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'font/woff2' } }),
  };
  const font = await featuredPage(
    request('/featured/common/fonts/5.2.9-5.2.11/noto-serif-sc-4-400-normal.woff2'),
    assets,
    catalog,
  );
  expect(font.status).toBe(200);
  expect(font.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  const css = await featuredPage(
    request('/featured/common/fonts/5.2.9-5.2.11/fonts.css'),
    assets,
    catalog,
  );
  expect(css.status).toBe(200);
  expect(css.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  const tokens = await featuredPage(request('/featured/common/tokens.css'), assets, catalog);
  expect(tokens.headers.get('Cache-Control')).toBe('no-store');
});

test('forwards byte ranges so readers can seek through audio and video', async () => {
  const assets = {
    fetch: vi.fn(
      async (_request: Request) =>
        new Response(new Uint8Array([2, 3]), {
          status: 206,
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes 1-2/3' },
        }),
    ),
  };
  const response = await featuredPage(
    new Request('https://club.newmaybe.com/featured/issue-001/assets/music.mp3', {
      headers: { Range: 'bytes=1-2' },
    }),
    assets,
    catalog,
  );
  expect(assets.fetch.mock.calls[0][0].headers.get('Range')).toBe('bytes=1-2');
  expect(response.status).toBe(206);
  expect(response.headers.get('Content-Range')).toBe('bytes 1-2/3');
});
