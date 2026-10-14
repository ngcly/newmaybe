import { expect, test } from './test';
import { enabled } from './apps';
import { INITIAL_ARTICLES } from '../apps/club/src/data/initialArticles';

const base = 'http://127.0.0.1:4406';

test.beforeEach(async ({ page }) => {
  test.skip(!enabled('club'));
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/articles') return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
    const article = INITIAL_ARTICLES.find((article) => path === `/api/articles/${article.id}`);
    return article
      ? route.fulfill({ json: { article, comments: [] } })
      : route.fulfill({ status: 404, json: { error: '篇章未找到' } });
  });
});

test('direct article paths survive reload and update metadata through navigation', async ({
  page,
}) => {
  await page.goto(`${base}/articles/club-1`);
  await expect(
    page.getByRole('heading', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle(`${INITIAL_ARTICLES[0].title} · 文友雅集`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://club.newmaybe.com/articles/club-1',
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '返回雅集广场', exact: true }).click();
  await expect(page).toHaveURL(`${base}/`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://club.newmaybe.com/',
  );
  const link = page.getByRole('link', { name: INITIAL_ARTICLES[1].title, exact: true });
  await expect(link).toHaveAttribute('href', '/articles/club-2');
  await link.click();
  await expect(page).toHaveTitle(`${INITIAL_ARTICLES[1].title} · 文友雅集`);
  await page.goBack();
  await expect(page).toHaveURL(`${base}/`);
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(link).toBeVisible();
});

for (const path of ['/articles/missing', '/articles', '/articles/a/b']) {
  test(`invalid path ${path} has a recovery link instead of showing the plaza`, async ({
    page,
  }) => {
    await page.goto(base + path);
    await expect(page.getByRole('status')).toContainText('篇章不存在');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await page.getByRole('button', { name: '返回雅集广场', exact: true }).click();
    await expect(page).toHaveURL(`${base}/`);
    await expect(
      page.getByRole('link', { name: INITIAL_ARTICLES[0].title, exact: true }),
    ).toBeVisible();
  });
}

test('malformed paths in browser history do not crash the router', async ({ page }) => {
  await page.goto(base);
  await expect(
    page.getByRole('link', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  // Vite rejects malformed encodings before serving React; Worker HTTP handling is covered in worker.test.ts.
  await page.evaluate(() => {
    history.pushState(null, '', '/articles/%E0%A4%A');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('status')).toContainText('篇章不存在');
  await page.goBack();
  await expect(
    page.getByRole('link', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
});
