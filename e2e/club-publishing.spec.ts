import { expect, test, type Page } from './test';
import { enabled } from './apps';
import { INITIAL_ARTICLES } from '../apps/club/src/test/initialArticles';

const url = 'http://127.0.0.1:4406/';
const commentPlaceholder = '写下此刻的共鸣、眉批或感悟... 慢笔深思，见字如晤。';

async function openArticle(page: Page) {
  await page.goto(url);
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  await expect(page.getByPlaceholder(commentPlaceholder)).toBeVisible();
}

test('Club keeps rejected comment text and shows the server error', async ({ page }) => {
  test.skip(!enabled('club'));
  await page.route('**/api/**', (route) => {
    if (route.request().method() === 'POST')
      return route.fulfill({ status: 429, json: { error: '评论次数已达上限' } });
    if (new URL(route.request().url()).pathname === '/api/articles')
      return route.fulfill({ json: { articles: INITIAL_ARTICLES } });
    return route.fulfill({ json: { article: INITIAL_ARTICLES[0], comments: [] } });
  });
  await openArticle(page);
  await page.getByPlaceholder(commentPlaceholder).fill('请保留尚未发表的文字');
  await page.getByRole('button', { name: '盖印题跋', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('评论次数已达上限');
  await expect(page.getByPlaceholder(commentPlaceholder)).toHaveValue('请保留尚未发表的文字');
  await expect(page.locator('#comments-section article')).toHaveCount(0);
});

test('Club ignores obsolete cached and sample comments when the server confirms an empty list', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  await page.addInitScript(() =>
    localStorage.setItem(
      'newmaybe_club_comments',
      JSON.stringify({
        'club-1': [
          {
            id: 'old',
            articleId: 'club-1',
            author: '旧文友',
            content: '应从缓存清除的评论',
            likes: 0,
            createdAt: '2026-09-29',
          },
        ],
      }),
    ),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === '/api/articles'
          ? { articles: INITIAL_ARTICLES }
          : { article: INITIAL_ARTICLES[0], comments: [] },
    }),
  );
  await openArticle(page);
  await expect(page.locator('#comments-section article')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  await expect(page.locator('#comments-section article')).toHaveCount(0);
});
