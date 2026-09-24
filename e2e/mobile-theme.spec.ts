import { expect, test } from '@playwright/test';
import { enabled } from './apps';
import { dark, light, studyDark, studyLight } from '../packages/design-tokens/src/index';
import { INITIAL_ARTICLES } from '../apps/club/src/data/initialArticles';

const apps = ['main', 'graph', 'ai', 'studio', 'study', 'club', 'lab'];

for (const [index, app] of apps.entries()) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${app} applies the saved ${theme} browser color before its application loads`, async ({
      page,
      context,
    }) => {
      test.skip(!enabled(app));
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
      await context.addCookies([{ name: 'theme', value: theme, domain: '127.0.0.1', path: '/' }]);
      await page.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new DOMException('Storage denied', 'SecurityError');
        };
      });
      await page.route('**/*.js', (route) => route.abort());
      await page.goto(`http://127.0.0.1:${4401 + index}/`);
      const color =
        app === 'study'
          ? (theme === 'dark' ? studyDark : studyLight)['study-paper']
          : (theme === 'dark' ? dark : light).paper;
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', color);
      expect(
        await page.locator('html').evaluate((el) => (el as HTMLElement).style.colorScheme),
      ).toBe(theme);
    });
  }
}

test('Main keeps a manual light theme through repeated Astro navigation on a dark system', async ({
  page,
}) => {
  test.skip(!enabled('main'));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('http://127.0.0.1:4401/');
  await page.locator('#themeToggle').click();
  for (const href of ['/writing', '/about', '/writing']) {
    await page.locator(`.nav-links a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}/?$`));
    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', light.paper);
  }
  await page.locator('#themeToggle').click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', dark.paper);
  expect(errors).toEqual([]);
});

test('Study switches both shared tokens and its own browser palette against system preference', async ({
  page,
}) => {
  test.skip(!enabled('study'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('http://127.0.0.1:4405/');
  await page.getByRole('button', { name: '切换日读', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    studyLight['study-paper'],
  );
  expect(
    await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--paper').trim()),
  ).toBe(light.paper);
  await page.getByRole('button', { name: '切换夜读', exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    studyDark['study-paper'],
  );
});

for (const width of [320, 375, 390, 640, 768, 1024, 1280]) {
  test(`Club navigation and expanded search fit at ${width}px`, async ({ page }) => {
    test.skip(!enabled('club'));
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/api/articles', (route) =>
      route.fulfill({ json: { articles: INITIAL_ARTICLES } }),
    );
    await page.goto('http://127.0.0.1:4406/');
    const tabs = page.getByRole('navigation', { name: '雅集导航' });
    const plaza = tabs.getByRole('button', { name: '文友广场' });
    const topics = tabs.getByRole('button', { name: '专题分类' });
    await expect(plaza).toBeVisible();
    await topics.click();
    await expect(topics).toHaveAttribute('aria-pressed', 'true');
    await plaza.click();
    const search = page.getByRole('button', { name: '搜索文稿', exact: true });
    await search.click();
    const input = page.getByRole('searchbox', { name: '搜索标题、文友或金句' });
    await input.fill('不可能匹配的搜索词');
    const boxes = await Promise.all([
      plaza.boundingBox(),
      topics.boundingBox(),
      input.boundingBox(),
    ]);
    for (const box of boxes) {
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(1);
    expect(await page.locator('header').evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(input).toHaveCount(0);
    await expect(search).toBeFocused();
    await expect(page.getByText(INITIAL_ARTICLES[0].title, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '即刻落笔', exact: true }).click();
    await expect(page.getByPlaceholder('给此刻的心绪起一个名字...')).toBeVisible();
  });
}
