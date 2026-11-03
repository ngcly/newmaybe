import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildFeaturedAssets, renderFeaturedIssue, validateFeaturedCatalog } from './club-featured';
import { currentIssue, publishedIssues, type FeaturedIssue } from '../apps/club/src/lib/featured';

const directories: string[] = [];
afterEach(() =>
  directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);
const issue: FeaturedIssue = {
  slug: 'issue-001',
  number: '001',
  title: '雨与光 <序>',
  author: '文友',
  description: '读完这一篇。',
  publishedAt: '2026-10-15',
  articleId: 'club-1',
  articleRevision: 'v1',
  status: 'published',
  cover: 'assets/cover.svg',
};
const html =
  '<!doctype html><html lang="zh-CN"><head><!-- club:head --><link rel="stylesheet" href="./assets/scene.css"></head><body><!-- club:nav --><main><h1>独立版式</h1><p>完整的文章正文</p></main><script>window.edition = true;</script></body></html>';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'club-featured-'));
  directories.push(dir);
  mkdirSync(join(dir, 'issues/issue-001/assets'), { recursive: true });
  writeFileSync(
    join(dir, 'catalog.json'),
    JSON.stringify({
      currentIssue: issue.slug,
      issues: [issue, { ...issue, slug: 'unpublished', status: 'draft' }],
    }),
  );
  writeFileSync(join(dir, 'issues/issue-001/index.html'), html);
  writeFileSync(join(dir, 'issues/issue-001/assets/scene.css'), 'main { max-width: 40rem; }');
  writeFileSync(
    join(dir, 'issues/issue-001/assets/cover.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
  );
  mkdirSync(join(dir, 'issues/unpublished'), { recursive: true });
  writeFileSync(join(dir, 'issues/unpublished/index.html'), 'SECRET DRAFT');
  return dir;
}

test('publishes standalone HTML and relative assets, but never draft HTML or assets', () => {
  const assets = buildFeaturedAssets(fixture());
  const page = String(assets.get('featured/issue-001.html'));
  expect(page).toContain('<base href="/featured/issue-001/">');
  expect(page).toContain('<h1>独立版式</h1>');
  expect(page).toContain('<script>window.edition = true;</script>');
  expect(page).toContain('雨与光 &lt;序&gt;');
  expect(page).toContain('href="/articles/club-1"');
  expect(page).toContain('https://club.newmaybe.com/featured/issue-001');
  expect(assets.has('featured/issue-001/assets/scene.css')).toBe(true);
  expect([...assets.keys()].some((key) => key.includes('unpublished'))).toBe(false);
  expect(String(assets.get('featured/archive.html'))).toContain('/featured/issue-001');
  expect([...assets.values()].some((value) => String(value).includes('SECRET DRAFT'))).toBe(false);
});

test('switching the current issue retains older published issues and orders the archive by date', () => {
  const newer: FeaturedIssue = {
    ...issue,
    slug: 'issue-002',
    number: '002',
    publishedAt: '2026-11-15',
  };
  const catalog = { currentIssue: newer.slug, issues: [issue, newer] };
  expect(currentIssue(catalog)?.slug).toBe(newer.slug);
  expect(publishedIssues(catalog).map((value) => value.slug)).toEqual([newer.slug, issue.slug]);
});

test.each([
  { currentIssue: 'unknown', issues: [issue] },
  { currentIssue: issue.slug, issues: [{ ...issue, status: 'draft' }] },
  { currentIssue: null, issues: [issue, issue] },
  { currentIssue: null, issues: [{ ...issue, slug: '../escape' }] },
  { currentIssue: null, issues: [{ ...issue, slug: 'archive' }] },
  { currentIssue: null, issues: [{ ...issue, cover: '../private.png' }] },
  { currentIssue: null, issues: [{ ...issue, publishedAt: '2026-02-30' }] },
])('rejects invalid or unsafe publication metadata: %j', (catalog) => {
  expect(() => validateFeaturedCatalog(catalog)).toThrow();
});

test('a missing cover or required document slot fails the build', () => {
  const dir = fixture();
  rmSync(join(dir, 'issues/issue-001/assets/cover.svg'));
  expect(() => buildFeaturedAssets(dir)).toThrow('找不到封面');
  expect(() => renderFeaturedIssue(html.replace('<!-- club:nav -->', ''), issue)).toThrow(
    'club:nav',
  );
  expect(() =>
    renderFeaturedIssue(html.replace('</head>', '<title>重复标题</title></head>'), issue),
  ).toThrow('重复声明');
});

test('an empty catalog shows an honest preparation state and never publishes the template', () => {
  const dir = fixture();
  writeFileSync(join(dir, 'catalog.json'), JSON.stringify({ currentIssue: null, issues: [] }));
  const assets = buildFeaturedAssets(dir);
  expect(String(assets.get('featured.html'))).toContain('首期正在筹备');
  expect(
    [...assets.keys()].some((key) => key.includes('issue-001') || key.includes('template')),
  ).toBe(false);
});

test('a featured main-site post links to its real source and rejects drafts or mixed ownership', () => {
  const post = {
    ...issue,
    articleId: undefined,
    sourcePost: 'rainy_alley_remembered',
    title: '记忆里的雨巷',
  };
  expect(() => validateFeaturedCatalog({ currentIssue: post.slug, issues: [post] })).not.toThrow();
  expect(renderFeaturedIssue(html, post)).toContain(
    'href="https://newmaybe.com/writing/rainy_alley_remembered/"',
  );
  expect(() =>
    validateFeaturedCatalog({
      currentIssue: post.slug,
      issues: [{ ...post, articleId: 'club-1' }],
    }),
  ).toThrow('只能选择');
  expect(() =>
    validateFeaturedCatalog({
      currentIssue: post.slug,
      issues: [{ ...post, sourcePost: 'on-slowness' }],
    }),
  ).toThrow('必须已公开');
});
