import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type Route } from '@playwright/test';
import { enabled } from './apps';
import { INITIAL_ARTICLES } from '../apps/club/src/data/initialArticles';
import { validateMessages } from '../apps/ai/src/worker';

const graph = {
  nodes: [
    { id: 'a', title: '旧标题', group: 'notes', url: 'https://newmaybe.com/old' },
    { id: 'b', title: '另一个节点', group: 'posts', url: '' },
  ],
  links: [],
};

async function openGraph(page: Page) {
  await page.route('**/graph-data.json', (route) => route.fulfill({ json: graph }));
  await page.goto('http://127.0.0.1:4402/');
  await expect(page.locator('#graph circle')).toHaveCount(2);
}

test('Graph export keeps the displayed viewport', async ({ page }) => {
  test.skip(!enabled('graph'));
  await openGraph(page);
  const bounds = await page.locator('#graph').boundingBox();
  const downloaded = page.waitForEvent('download');
  await page.locator('#btn-download-svg').click();
  const download = await downloaded;
  const source = await readFile((await download.path())!, 'utf8');
  expect(source).toContain(`viewBox="0 0 ${bounds!.width} ${bounds!.height}"`);
});

test('Graph import updates existing node content and link data', async ({ page, context }) => {
  test.skip(!enabled('graph'));
  await openGraph(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('#btn-mode-sandbox').click();
  await page.locator('#import-json-file').setInputFiles({
    name: 'graph.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...graph,
        nodes: [
          { ...graph.nodes[0], title: '新标题', group: 'posts', url: 'https://newmaybe.com/new' },
          graph.nodes[1],
        ],
      }),
    ),
  });
  await expect(page.locator('#graph text').first()).toHaveText('新标题');
  await expect(page.locator('#graph circle').first()).toHaveAttribute('aria-label', /新标题/);
  await context.route('https://newmaybe.com/new', (route) =>
    route.fulfill({ body: 'Imported node target' }),
  );
  const popup = page.waitForEvent('popup');
  await page.locator('#graph circle').first().dispatchEvent('dblclick');
  const opened = await popup;
  expect(opened.url()).toContain('/new');
  await opened.close();
});

test('Graph deleting a selected endpoint cannot create a dangling link', async ({ page }) => {
  test.skip(!enabled('graph'));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  await openGraph(page);
  await page.locator('#btn-mode-sandbox').click();
  await page.locator('#graph circle').first().dispatchEvent('click');
  await page.locator('#btn-set-source').click();
  await page.locator('#btn-delete-selected').click();
  await page.locator('#graph circle').first().dispatchEvent('click');
  await page.locator('#btn-set-target').click();
  await page.locator('#btn-create-link').click();
  await expect(page.locator('#link-source-label')).toHaveText('起点: 未选择');
  await expect(page.locator('#graph .link')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Study font controls change the rendered verse size', async ({ page }) => {
  test.skip(!enabled('study'));
  await page.goto('http://127.0.0.1:4405/#/book/shenglvqimeng/read/0');
  const verse = page.locator('.couplet-card p').first();
  await expect(verse).toBeVisible();
  const before = await verse.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await page.getByRole('button', { name: '放大字号', exact: true }).first().click();
  await expect
    .poll(() => verse.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)))
    .toBe(before + 1);
});

test('Main clearing a search invalidates pending results', async ({ page }) => {
  test.skip(!enabled('main'));
  await page.goto('http://127.0.0.1:4401/');
  await page.locator('#search-nav-trigger').click();
  await page.locator('#search-input').fill('雨');
  await expect(page.locator('.search-result-item').first()).toBeVisible();
  await page.locator('#search-input').evaluate((input) => {
    const element = input as HTMLInputElement;
    element.value = '清明';
    element.dispatchEvent(new Event('input'));
    element.value = '';
    element.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(500);
  await expect(page.locator('#search-input')).toHaveValue('');
  await expect(page.locator('.search-result-item')).toHaveCount(0);
});

test('Club keeps unrelated cloud articles when a like overlaps the initial fetch', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  let held: Route | undefined;
  const cloudArticle = { ...INITIAL_ARTICLES[0], id: 'cloud-new', title: '云端新增文章' };
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/articles') {
      if (!held) {
        held = route;
        return;
      }
      return route.fulfill({ json: { articles: [...INITIAL_ARTICLES, cloudArticle] } });
    }
    if (path.endsWith('/like')) return route.fulfill({ json: { likes: 999 } });
    return route.fulfill({ json: { article: INITIAL_ARTICLES[0], comments: [] } });
  });
  await page.goto('http://127.0.0.1:4406/');
  await expect.poll(() => Boolean(held)).toBe(true);
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  await page
    .locator('button')
    .filter({ has: page.locator('svg.lucide-heart') })
    .first()
    .click();
  await held!.fulfill({ json: { articles: [...INITIAL_ARTICLES, cloudArticle] } });
  await page.getByRole('button', { name: '返回雅集列表' }).click();
  await expect(page.getByText('云端新增文章', { exact: true })).toBeVisible();
});

test('EgoMirror sends bounded long references with source URLs', async ({ page }) => {
  test.skip(!enabled('ai'));
  const docs = Array.from({ length: 4 }, (_, index) => ({
    id: `posts/${index}`,
    title: `山间随笔${index}`,
    type: 'posts',
    category: '随笔',
    url: `https://newmaybe.com/writing/${index}`,
    pubDate: '2026-09-21',
    content: '山间'.repeat(20_000),
  }));
  await page.route('**/all-content.json', (route) => route.fulfill({ json: docs }));
  await page.route('**/api/security', (route) => route.fulfill({ json: { required: false } }));
  await page.route('**/api/chat', (route) => {
    const payload = route.request().postDataJSON();
    expect(validateMessages(payload.messages)).not.toBeNull();
    expect(Buffer.byteLength(route.request().postData()!)).toBeLessThanOrEqual(32 * 1024);
    for (const doc of docs) expect(payload.messages[0].content).toContain(doc.url);
    return route.fulfill({ json: { response: '长文引用成功' } });
  });
  await page.goto('http://127.0.0.1:4403/');
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '自我对撞', exact: true }).click();
  await page.getByPlaceholder('说出你此刻偏激、不成熟或全新的灵感观点...').fill('山间随笔');
  await page.getByRole('button', { name: '对撞', exact: true }).click();
  await expect(page.getByText('长文引用成功', { exact: true })).toBeVisible();
});

test('Main ignores an older Pagefind response after the new query completes', async ({ page }) => {
  test.skip(!enabled('main'));
  let held: Route | undefined;
  await page.route('**/pagefind/pagefind.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export async function init() {}
      export async function search(query) {
        const title = await (await fetch('/__test-search?q=' + encodeURIComponent(query))).text();
        return { results: [{ data: async () => ({ url: '/writing/test/', meta: { title }, excerpt: title }) }] };
      }`,
    }),
  );
  await page.route('**/__test-search?*', (route) => {
    if (new URL(route.request().url()).searchParams.get('q') === '旧查询') {
      held = route;
      return;
    }
    return route.fulfill({ body: '新结果' });
  });
  await page.goto('http://127.0.0.1:4401/');
  await page.locator('#search-nav-trigger').click();
  await page.locator('#search-input').fill('旧查询');
  await expect.poll(() => Boolean(held)).toBe(true);
  await page.locator('#search-input').fill('新查询');
  await expect(page.locator('.search-result-item')).toContainText('新结果');
  await held!.fulfill({ body: '旧结果' });
  await page.waitForTimeout(300);
  await expect(page.locator('.search-result-item')).toContainText('新结果');
  await expect(page.locator('#search-results')).not.toContainText('旧结果');
});
