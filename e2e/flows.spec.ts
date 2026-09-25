import { enabled } from './apps';
import { test, expect } from '@playwright/test';

test('article navigation, theme persistence, real Pagefind search and mobile menu', async ({
  page,
}) => {
  test.skip(!enabled('main'));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4401/');
  await page.locator('#themeToggle').click();
  const theme = await page
    .locator('html')
    .evaluate((el) => (el.classList.contains('dark') ? 'dark' : 'light'));
  await page.locator('main a[href^="/writing/"]').first().click();
  await expect(page).toHaveURL(/\/writing\/[^/]+\/?$/);
  await expect(page.locator('article').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await page.locator('#search-nav-trigger').click();
  await page.locator('#search-input').fill('雨');
  await expect(page.locator('#search-results a[href*="/writing/"]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-overlay')).toHaveAttribute('aria-hidden', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobileMenu')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobileMenu')).toHaveAttribute('aria-hidden', 'true');
  expect(errors).toEqual([]);
});

test('Studio accepts migrated content, exports PNG and formats text', async ({ page }) => {
  test.skip(!enabled('studio'));
  await page.goto('http://127.0.0.1:4404/?content=迁移后的卡片');
  await expect(page.getByRole('heading', { name: '念头/拾遗卡片生成器' })).toBeVisible();
  await expect(page.locator('textarea').first()).toHaveValue('迁移后的卡片');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出卡片图片', exact: false }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('newmaybe-card-fragment-paper-2x.png');
  expect(await download.failure()).toBeNull();
  await page.getByRole('button', { name: '中英文混排优化' }).click();
  await page.locator('textarea:visible').first().fill('今天读Astro7,很好。');
  await page.getByRole('button', { name: '一键洗练排版' }).click();
  await expect(page.locator('textarea:visible').nth(1)).toHaveValue('今天读 Astro7，很好。');
});

test('Study preserves chapter completion on reload', async ({ page }) => {
  test.skip(!enabled('study'));
  await page.goto('http://127.0.0.1:4405/#/book/shenglvqimeng/read/0');
  await page.getByRole('button', { name: '标记已读', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '已读', exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('linxia:read') || '{}')),
  ).toMatchObject({ shenglvqimeng: [0] });
});

test('Study mobile menu stays closed when navigating back', async ({ page }) => {
  test.skip(!enabled('study'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4405/');
  await page.getByRole('button', { name: '打开菜单', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: '书目', exact: true }).click();
  await expect(page).toHaveURL(/#\/books$/);
  await expect(page.getByRole('button', { name: '打开菜单', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: '打开菜单', exact: true })).toBeVisible();
});

test('Lab experiments initialize and writing persists', async ({ page }) => {
  test.skip(!enabled('lab'));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['floating-verse', 'ink-flow', 'audio-zen']) {
    await page.goto(`http://127.0.0.1:4407/${path}/`);
    await expect(page.locator('canvas')).toBeVisible();
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.mouse.move(400, 350);
    await page.mouse.click(400, 350);
  }
  await page.goto('http://127.0.0.1:4407/zen-writer/');
  await page.locator('#editor').fill('写下一段安静的文字');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('newmaybe_zen_draft')))
    .toBe('写下一段安静的文字');
  await page.reload();
  await expect(page.locator('#editor')).toHaveValue('写下一段安静的文字');
  expect(errors).toEqual([]);
});

for (const status of [200, 429, 503]) {
  test(`AI shows response or recoverable error (${status})`, async ({ page }) => {
    test.skip(!enabled('ai'));
    await page.route('**/all-content.json', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/security', (route) => route.fulfill({ json: { required: false } }));
    await page.route('**/api/chat', (route) =>
      route.fulfill(
        status === 200
          ? {
              status,
              contentType: 'text/event-stream',
              body: 'data: {"response":"测试回答：慢慢阅读。"}\n\ndata: [DONE]\n\n',
            }
          : {
              status,
              json: {
                error: status === 429 ? '请求过多，请稍后重试。' : '服务暂不可用，请稍后重试。',
              },
            },
      ),
    );
    await page.goto('http://127.0.0.1:4403/');
    await page.getByPlaceholder('向您的个人知识 Agent 终端提问...').fill('你好');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await expect(
      page
        .getByText(
          status === 200
            ? '测试回答：慢慢阅读。'
            : status === 429
              ? '请求过多，请稍后重试。'
              : '服务暂不可用，请稍后重试。',
          { exact: false },
        )
        .first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
  });
}

test('Graph loads content and opens Studio cards', async ({ page }) => {
  test.skip(!enabled('graph'));
  await page.goto('http://127.0.0.1:4402/');
  await expect(page.locator('#graph circle').first()).toBeVisible();
  await page.locator('#graph circle').first().click({ force: true });
  const popupEvent = page.waitForEvent('popup');
  await page.locator('#btn-send-to-card').click();
  const popup = await popupEvent;
  expect(popup.url()).toContain('studio.newmaybe.com');
  await popup.close();
});
