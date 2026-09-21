import { expect, test, type Page, type Route } from '@playwright/test';
import { enabled } from './apps';
import { INITIAL_ARTICLES } from '../apps/club/src/data/initialArticles';

const clubUrl = 'http://127.0.0.1:4406/';

async function mockClubApi(page: Page) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/articles') {
      return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
    }
    const articleId = path.split('/')[3];
    return route.fulfill({
      json: { article: INITIAL_ARTICLES.find((article) => article.id === articleId), comments: [] },
    });
  });
}

test('Club keeps a draft when the writer closes before the debounce fires', async ({ page }) => {
  test.skip(!enabled('club'));
  await mockClubApi(page);
  await page.goto(clubUrl);
  await page.getByRole('button', { name: '即刻落笔', exact: true }).click();
  await page.getByPlaceholder('给此刻的心绪起一个名字...').fill('未完的草稿');
  await page.getByPlaceholder('在此安放您的长文叙事').fill('刚写完的正文');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '即刻落笔', exact: true }).click();
  await expect(page.getByPlaceholder('在此安放您的长文叙事')).toHaveValue('刚写完的正文');
});

test('Club accepts an empty server comment list and preserves a new comment against an old response', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  let heldDetail: Route | undefined;
  let detailRequests = 0;
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/articles') {
      return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
    }
    if (path === '/api/articles/club-1/comments' && route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: {
          comment: {
            id: 'new-comment',
            articleId: 'club-1',
            author: '测试文友',
            content: '新的评注',
            likes: 0,
            createdAt: '2026-09-20',
          },
        },
      });
    }
    detailRequests += 1;
    if (detailRequests > 1) {
      return route.fulfill({
        json: {
          article: INITIAL_ARTICLES.find((article) => article.id === path.split('/')[3]),
          comments: path.includes('/club-1')
            ? [
                {
                  id: 'new-comment',
                  articleId: 'club-1',
                  author: '测试文友',
                  content: '新的评注',
                  likes: 0,
                  createdAt: '2026-09-20',
                },
              ]
            : [],
        },
      });
    }
    heldDetail = route;
  });
  await page.goto(clubUrl);
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  await expect.poll(() => Boolean(heldDetail)).toBe(true);
  await page.getByPlaceholder('写下此刻的心绪、题跋或共鸣...').fill('新的评注');
  await page.getByRole('button', { name: '发表题跋' }).click();
  await expect(page.getByText('新的评注', { exact: true })).toBeVisible();
  await heldDetail!.fulfill({
    json: {
      article: INITIAL_ARTICLES[0],
      comments: [
        {
          id: 'stale-comment',
          articleId: 'club-1',
          author: '旧',
          content: '旧快照',
          likes: 0,
          createdAt: '2026-09-19',
        },
      ],
    },
  });
  await expect(page.getByText('新的评注', { exact: true })).toBeVisible();
  await expect(page.getByText('旧快照', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '返回雅集列表' }).click();
  await page.getByText(INITIAL_ARTICLES[1].title, { exact: true }).click();
  await expect(page.locator('#comments-section')).toContainText('暂无文友评注');
  await expect(page.locator('#comments-section')).not.toContainText('铅笔字终究会淡去');
});

test('Club reader resets position, shows complete quote preview, and keeps ink text readable', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  await mockClubApi(page);
  await page.goto(clubUrl);
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  await page.getByTitle('生成精美金句书签便签').click();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const widths = await canvas.evaluate((element) => ({
    canvas: element.getBoundingClientRect().width,
    container: element.parentElement!.getBoundingClientRect().width,
  }));
  expect(widths.canvas).toBeLessThanOrEqual(widths.container);
  await page
    .locator('button')
    .filter({ has: page.locator('svg.lucide-x') })
    .last()
    .click();

  await page.getByTitle('排版与阅读偏好设置').click();
  await page.getByRole('button', { name: '松墨夜' }).click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.waitForTimeout(350);
  const colors = await page.locator('#comments-section h3').evaluate((heading) => ({
    actual: getComputedStyle(heading).color,
    expected: getComputedStyle(heading.closest('.club-reader-theme-ink')!).color,
  }));
  expect(colors.actual).toBe(colors.expected);

  await page.getByRole('button', { name: /下一篇篇章/ }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /下一篇篇章/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: INITIAL_ARTICLES[1].title })).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('Club manual dark toggle updates reading palette with a light system preference', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  await page.emulateMedia({ colorScheme: 'light' });
  await mockClubApi(page);
  await page.goto(clubUrl);
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  await page.getByTitle('排版与阅读偏好设置').click();
  await page.getByRole('button', { name: '羊皮暖' }).click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  const reader = page.locator('.club-reader-theme-parchment');
  const before = await reader.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: '切换明暗主题' }).click();
  await page.waitForTimeout(350);
  const after = await reader.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(before).not.toBe(after);
  await expect(page.locator('html')).toHaveClass(/dark/);
});
