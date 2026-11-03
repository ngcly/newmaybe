import { expect, test, type Page, type Route } from './test';
import { enabled } from './apps';
import { INITIAL_ARTICLES } from '../apps/club/src/test/initialArticles';

const base = 'http://127.0.0.1:4406';
const article = INITIAL_ARTICLES[0];

/** Record every loading or missing-article state that reaches the DOM, even for one frame. */
async function watchStates(page: Page) {
  await page.addInitScript(() => {
    const seen = new Set<string>();
    Object.assign(window, { clubStates: seen });
    new MutationObserver(() => {
      for (const selector of ['.club-empty', '.club-reader__skeleton'])
        if (document.querySelector(selector)) seen.add(selector);
    }).observe(document, { childList: true, subtree: true });
  });
}
const states = (page: Page) =>
  page.evaluate(() => [...(window as unknown as { clubStates: Set<string> }).clubStates]);

/** Hold the article detail request until the test releases it. */
async function holdDetail(page: Page) {
  let held: Route | undefined;
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/articles') return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
    if (path === `/api/articles/${article.id}`) {
      held = route;
      return;
    }
    return route.fulfill({ status: 404, json: { error: '篇章未找到' } });
  });
  return async () => {
    await expect.poll(() => Boolean(held)).toBe(true);
    await held!.fulfill({ json: { article, comments: [] } });
  };
}

test.beforeEach(() => {
  test.skip(!enabled('club'));
});

test('opening an article from the feed shows its header and never the missing-article box', async ({
  page,
}) => {
  await watchStates(page);
  const release = await holdDetail(page);
  await page.goto(base);
  await page.getByRole('link', { name: article.title, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '正在加载篇章' })).toBeAttached();
  await release();
  await expect(page.locator('#comments-section')).toBeVisible();
  expect(await states(page)).toEqual(['.club-reader__skeleton']);
});

test('a direct link mounts straight into the embedded article', async ({ page }) => {
  await watchStates(page);
  const release = await holdDetail(page);
  await page.route(`${base}/articles/${article.id}`, async (route) => {
    const response = await route.fetch();
    const embedded = JSON.stringify(article).replace(/</g, '\\u003c');
    const html = (await response.text()).replace(
      '<div id="root"></div>',
      `<div id="root"></div><script type="application/json" id="club-initial-article">${embedded}</script>`,
    );
    await route.fulfill({ response, body: html });
  });
  await page.goto(`${base}/articles/${article.id}`);
  await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
  await expect(page.locator('#club-initial-article')).toHaveCount(0);
  // Until the comments arrive, the toolbar keeps the article's own count instead of 0.
  await expect(page.locator('.club-reader__comment-count')).toHaveText(
    String(article.commentsCount),
  );
  await release();
  await expect(page.locator('.club-reader__comment-count')).toHaveText('0');
  expect(await states(page)).toEqual([]);
});

test('the kai reading preference really switches the body typeface', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'newmaybe_club_reader_prefs',
      JSON.stringify({ theme: 'paper', font: 'kai', fontSize: 'md', lineHeight: 'normal' }),
    ),
  );
  const release = await holdDetail(page);
  await page.goto(`${base}/articles/${article.id}`);
  await release();
  const body = page.locator('.club-reader__body');
  await expect(body).toBeVisible();
  const style = await body.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { family: computed.fontFamily, weight: computed.fontWeight };
  });
  expect(style.family).toContain('Kaiti');
  expect(style.weight).toBe('400');
});

test('a failed refresh keeps an embedded article and offers to fetch its comments again', async ({
  page,
}) => {
  let detailRequests = 0;
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/articles') return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
    detailRequests += 1;
    return detailRequests === 1
      ? route.fulfill({ status: 500, json: { error: '暂时无法读取' } })
      : route.fulfill({ json: { article, comments: [] } });
  });
  await page.route(`${base}/articles/${article.id}`, async (route) => {
    const response = await route.fetch();
    const embedded = JSON.stringify(article).replace(/</g, '\\u003c');
    const html = (await response.text()).replace(
      '<div id="root"></div>',
      `<div id="root"></div><script type="application/json" id="club-initial-article">${embedded}</script>`,
    );
    await route.fulfill({ response, body: html });
  });
  await page.goto(`${base}/articles/${article.id}`);
  await expect(page.locator('#comments-section')).toContainText('题跋暂时未能取回');
  await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
  await expect(page.locator('.club-reader__comment-count')).toHaveText(
    String(article.commentsCount),
  );
  await page.getByRole('button', { name: '重新取回' }).click();
  await expect(page.locator('#comments-section')).toContainText('案头尚留一泓清墨');
});

test('closing the search while pinyin is still composing applies no query', async ({ page }) => {
  const queries: string[] = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    queries.push(url.searchParams.get('q') ?? '');
    return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
  });
  await page.goto(base);
  await page.getByRole('button', { name: '搜索文稿', exact: true }).click();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', { text: 'yu', selectionStart: 2, selectionEnd: 2 });
  await page.getByRole('button', { name: '关闭搜索' }).click();
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.locator('.club-hero')).toBeVisible();
  expect(queries.filter(Boolean)).toEqual([]);
});
