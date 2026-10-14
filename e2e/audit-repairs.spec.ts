import { test, expect } from './test';
import { enabled } from './apps';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from '../apps/club/src/data/initialArticles';

test('Study warns when a draft cannot be saved and retains text for recovery', async ({ page }) => {
  test.skip(!enabled('study'));
  await page.goto('http://127.0.0.1:4405/#/practice');
  await page.getByRole('button', { name: '开始仿写练笔 ↓' }).first().click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.locator('textarea').first().fill('必须保留的习作');
  await expect(page.getByRole('alert')).toContainText('保存失败');
  await expect(page.locator('textarea').first()).toHaveValue('必须保留的习作');
  await page.evaluate(() => {
    location.hash = '#/books';
  });
  await expect(page).toHaveURL(/#\/books/);
  await expect(page.locator('textarea')).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '#/practice';
  });
  await page.getByRole('button', { name: '开始仿写练笔 ↓' }).first().click();
  await expect(page.locator('textarea').first()).toHaveValue('必须保留的习作');
  await expect(page.getByRole('alert')).toContainText('保存失败');
});

test('Lab reports failed autosave and keeps export available', async ({ page }) => {
  test.skip(!enabled('lab'));
  await page.goto('http://127.0.0.1:4407/zen-writer/');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.locator('#editor').fill('必须保留的文字');
  await expect(page.getByRole('alert')).toContainText('保存失败');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载文字' }).click();
  expect(await (await download).failure()).toBeNull();
});

test('Club articles support keyboard links, reload and browser history', async ({ page }) => {
  test.skip(!enabled('club'));
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json:
        path === '/api/articles'
          ? { articles: INITIAL_ARTICLES }
          : { article: INITIAL_ARTICLES.find((a) => path.endsWith(a.id)), comments: [] },
    });
  });
  await page.goto('http://127.0.0.1:4406/');
  const link = page.getByRole('link', { name: INITIAL_ARTICLES[0].title, exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/articles\/club-1$/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('link', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: INITIAL_ARTICLES[0].title, exact: true }),
  ).toBeVisible();
});

test('Club failed comment likes stay retryable', async ({ page }) => {
  test.skip(!enabled('club'));
  await page.route('**/api/**', (route) => {
    if (route.request().method() === 'POST')
      return route.fulfill({ status: 500, json: { error: '失败' } });
    return route.fulfill({
      json:
        new URL(route.request().url()).pathname === '/api/articles'
          ? { articles: INITIAL_ARTICLES }
          : { article: INITIAL_ARTICLES[0], comments: INITIAL_COMMENTS['club-1'] },
    });
  });
  await page.goto('http://127.0.0.1:4406/');
  await page.getByText(INITIAL_ARTICLES[0].title, { exact: true }).click();
  const like = page.getByTitle('与此题跋心念共鸣').first();
  await like.click();
  await expect(page.getByRole('alert')).toContainText('共鸣失败');
  await expect(like).toBeEnabled();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
});

test('Studio distinguishes fallback prompts from AI output', async ({ page }) => {
  test.skip(!enabled('studio'));
  await page.route('**/api/security', (route) => route.fulfill({ status: 503, json: {} }));
  await page.route('**/sdk.jinrishici.com/**', (route) => route.abort());
  await page.goto('http://127.0.0.1:4404/?tab=inspiration');
  await page.getByRole('button', { name: '生成命题 ✦', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('暂不可用');
  await expect(page.getByText('随笔 · 备用命题')).toBeVisible();
  await expect(page.getByText('随笔 · 由 AI 生成')).toHaveCount(0);
});

test('AI recovers from structurally invalid conversation caches', async ({ page }) => {
  test.skip(!enabled('ai'));
  await page.addInitScript(() => localStorage.setItem('newmaybe_ai_messages', '{}'));
  await page.route('**/all-content.json', (route) => route.fulfill({ json: [] }));
  await page.goto('http://127.0.0.1:4403/');
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeVisible();
});

test('Poster title stays inside the canvas and warns about truncation', async ({ page }) => {
  test.skip(!enabled('studio'));
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text.startsWith('长标题')) {
        const width = this.measureText(text).width;
        const left = this.textAlign === 'center' ? x - width / 2 : x;
        this.canvas.dataset.headingLeft = String(left);
        this.canvas.dataset.headingRight = String(left + width);
      }
      if (maxWidth === undefined) draw.call(this, text, x, y);
      else draw.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto('http://127.0.0.1:4404/');
  await page.getByPlaceholder('海报大标题...').fill('长标题'.repeat(40));
  for (const ratio of ['1:1', '9:16']) {
    await page.getByRole('button', { name: new RegExp(`^${ratio} `) }).click();
    await expect(page.getByRole('status').filter({ hasText: '标题' })).toContainText('缩小');
    const bounds = await page.locator('canvas').evaluate((canvas) => ({
      left: Number(canvas.dataset.headingLeft),
      right: Number(canvas.dataset.headingRight),
      width: Number(canvas.getAttribute('width')),
    }));
    expect(bounds.left).toBeGreaterThanOrEqual(79.9);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width - 79.9);
  }
});

test('Club loads the next summary page once and fetches its body on demand', async ({ page }) => {
  test.skip(!enabled('club'));
  const offsets: number[] = [];
  const articles = Array.from({ length: 22 }, (_, i) => ({
    ...INITIAL_ARTICLES[0],
    id: `page-${i}`,
    title: `分页测试${i}`,
    content: `按需正文${i}`,
  }));
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/articles') {
      const offset = Number(url.searchParams.get('offset'));
      offsets.push(offset);
      return route.fulfill({
        json: {
          articles: articles
            .slice(offset, offset + 20)
            .map((article) => ({ ...article, content: undefined })),
          nextOffset: offset === 0 ? 20 : null,
        },
      });
    }
    return route.fulfill({
      json: {
        article: articles.find((article) => url.pathname.endsWith(article.id)),
        comments: [],
      },
    });
  });
  await page.goto('http://127.0.0.1:4406/');
  await page.getByRole('button', { name: '加载更多篇章' }).click();
  await expect(page.getByRole('link', { name: '分页测试21', exact: true })).toBeVisible();
  expect(offsets).toEqual([0, 20]);
  await page.getByRole('link', { name: '分页测试21', exact: true }).click();
  await expect(page.getByText('按需正文21', { exact: true })).toBeVisible();
  const cache = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('newmaybe_club_articles') || '[]'),
  );
  expect(cache).toHaveLength(22);
  expect(cache.every((article: object) => !('content' in article))).toBe(true);
});

test('Studio compact tools and preview remain reachable on mobile', async ({ page }, testInfo) => {
  test.skip(!enabled('studio'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4404/');
  await expect(page.getByRole('combobox', { name: '创作工具' })).toBeInViewport();
  await page.getByRole('link', { name: '预览与导出 ↓' }).click();
  await expect(page.locator('#poster-preview')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('studio-mobile-preview.png') });
  await page.getByRole('combobox', { name: '创作工具' }).selectOption('formatter');
  await expect(page.getByRole('heading', { name: '中英文混排排版优化' })).toBeVisible();
});

test('Graph controls collapse to expose the canvas on mobile', async ({ page }, testInfo) => {
  test.skip(!enabled('graph'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4402/');
  await page.getByRole('button', { name: '收起面板' }).click();
  await expect(page.locator('#graph-controls')).toBeHidden();
  await expect(page.getByRole('button', { name: '展开面板' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.screenshot({ path: testInfo.outputPath('graph-mobile-collapsed.png') });
  await page.getByRole('button', { name: '展开面板' }).click();
  await expect(page.locator('#graph-controls')).toBeVisible();
});
