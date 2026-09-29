import { expect, test, type Page } from './test';
import { enabled } from './apps';
import { INITIAL_ARTICLES } from '../apps/club/src/data/initialArticles';

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

test('Club clears cached and sample comments when the server confirms an empty list', async ({
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
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('newmaybe_club_comments') || '{}')['club-1'],
      ),
    )
    .toEqual([]);
  await page.reload();
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  await expect(page.locator('#comments-section article')).toHaveCount(0);
});

for (const width of [320, 375, 390]) {
  test(`Club writer can publish without clipped controls at ${width}px`, async ({ page }) => {
    test.skip(!enabled('club'));
    await page.setViewportSize({ width, height: 844 });
    let articles = [...INITIAL_ARTICLES];
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'POST' && path === '/api/articles') {
        const article = {
          ...route.request().postDataJSON(),
          id: 'published-test',
          summary: '测试正文',
          likes: 0,
          commentsCount: 0,
        };
        articles = [article, ...articles];
        return route.fulfill({ status: 201, json: { article } });
      }
      return route.fulfill({
        json:
          path === '/api/articles'
            ? { articles }
            : { article: articles.find((article) => path.endsWith(article.id)), comments: [] },
      });
    });
    await page.goto(url);
    await page.getByRole('button', { name: '即刻落笔', exact: true }).click();
    await page.getByPlaceholder('在此处题写文章标题...').fill('手机端发表测试');
    await page.getByPlaceholder(/^在此落墨起笔/).fill('这是可以正常提交的测试正文。');
    await page.mouse.move(1, 1);
    const publish = page.getByRole('button', { name: '发布篇章', exact: true });
    await expect(publish).toBeInViewport({ ratio: 1 });
    await publish.click();
    await expect(page.getByRole('heading', { name: '手机端发表测试', exact: true })).toBeVisible();
  });
}
