import { test, expect } from './test';
import { enabled } from './apps';
import AxeBuilder from '@axe-core/playwright';

test('club opens the standalone featured section and keeps the archive reachable', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('http://127.0.0.1:4406/');
  await page
    .getByRole('navigation', { name: '雅集导航' })
    .getByRole('link', { name: '一期一文' })
    .click();
  await expect(page).toHaveURL('http://127.0.0.1:4406/featured');
  await expect(page.getByRole('heading', { name: '一期一文', exact: true })).toBeVisible();
  await expect(page.locator('#root')).toHaveCount(0);
  await page.getByRole('link', { name: '浏览往期' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4406/featured/archive');
  await page.reload();
  await expect(page.getByRole('heading', { name: '往期精选', exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: '文友雅集' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4406/');
});

for (const theme of ['light', 'dark'] as const) {
  test(`club featured ${theme} supports narrow screens and accessible reading`, async ({
    page,
  }) => {
    test.skip(!enabled('club'));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('http://127.0.0.1:4406/featured');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact || ''),
      ),
    ).toEqual([]);
    const response = await page.goto('http://127.0.0.1:4406/featured/unknown-issue');
    expect(response?.status()).toBe(404);
  });
}

for (const width of [320, 1280]) {
  test(`first edition preserves the poem and offers opt-in sound at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(!enabled('club'));
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`);
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4406/featured/archive');
    await page.getByRole('link', { name: '记忆里的雨巷', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4406/featured/issue-001');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('记忆里的雨巷');
    await expect(page.getByRole('article')).toContainText('再无红袖添新香。');
    await expect(page.getByRole('link', { name: '主站原文', exact: true })).toHaveAttribute(
      'href',
      'https://newmaybe.com/writing/rainy_alley_remembered/',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const sound = page.getByRole('button', { name: '开启雨声与配乐' });
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await sound.click();
    await expect(page.getByRole('button', { name: '关闭雨声与配乐' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const options = page.getByRole('button', { name: '调节音量' });
    await page.mouse.move(0, 0);
    await expect(page.getByRole('slider', { name: '音量' })).toBeHidden();
    await options.click();
    await expect(options).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('slider', { name: '音量' }).fill('10');
    await page.getByRole('button', { name: '关闭雨声与配乐' }).click();
    await page.getByRole('button', { name: '暂停落雨' }).click();
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await page
      .locator('.reading-controls')
      .screenshot({ path: testInfo.outputPath('record-player-expanded.png') });
    await page.keyboard.press('Escape');
    await expect(options).toBeFocused();
    await expect(options).toHaveAttribute('aria-expanded', 'false');
    await page.screenshot({
      path: testInfo.outputPath('rain-alley.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await options.click();
    await expect(page.getByRole('button', { name: '已减少动态' })).toBeDisabled();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations.filter((item) => ['serious', 'critical'].includes(item.impact || '')),
    ).toEqual([]);
    expect(failures).toEqual([]);
  });
}

test('the complete first edition remains readable without JavaScript', async ({ browser }) => {
  test.skip(!enabled('club'));
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4406/featured/issue-001');
    await expect(page.getByRole('article')).toContainText('我还撑着油纸伞，');
    await expect(page.getByRole('article')).toContainText('再无红袖添新香。');
    await expect(page.getByRole('button', { name: '开启雨声与配乐' })).toBeHidden();
  } finally {
    await context.close();
  }
});

for (const width of [320, 1280]) {
  test(`second edition walks the road with the poem and opt-in sound at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(!enabled('club'));
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`);
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4406/featured');
    await page.getByRole('link', { name: '那年，那人，那条路', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4406/featured/issue-002');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('那年，那人，那条路');
    await expect(page.getByRole('article')).toContainText('像未说出口的半句话。');
    await expect(page.getByRole('article')).toContainText('风却不是你。');
    await expect(page.getByRole('link', { name: '主站原文', exact: true })).toHaveAttribute(
      'href',
      'https://newmaybe.com/writing/that_year_that_person_that_road/',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // The painting stays pinned; scrolling walks the road and each stanza is inscribed in turn.
    const stage = page.locator('.stage');
    await expect(stage).toHaveAttribute('data-state', 'title');
    await page.getByRole('link', { name: '往下读，就是往前走' }).click();
    await expect(stage).toHaveAttribute('data-state', 'year');
    await expect(page.locator('#stanza-year .glyph').last()).toHaveCSS('opacity', '1');
    await page.evaluate(() => (window.location.hash = 'stanza-person'));
    await expect(stage).toHaveAttribute('data-state', 'person');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // The reader's hand is the wind: a sweep and a tap over the painting.
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4);
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.35, { steps: 8 });
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);

    const sound = page.getByRole('button', { name: '开启风声与琴音' });
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('slider', { name: '音量' })).toBeHidden();
    await sound.click();
    await expect(page.getByRole('button', { name: '关闭风声与琴音' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('slider', { name: '音量' }).fill('20');
    await page.getByRole('button', { name: '关闭风声与琴音' }).click();
    await expect(page.getByRole('slider', { name: '音量' })).toBeHidden();
    await page.getByRole('button', { name: '暂停落叶' }).click();
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await page.getByRole('button', { name: '继续落叶' }).click();

    await page.evaluate(() => (window.location.hash = 'coda'));
    await expect(stage).toHaveAttribute('data-state', 'wind');
    await page.screenshot({ path: testInfo.outputPath('that-road.png'), animations: 'disabled' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('button', { name: '已减少动态' })).toBeDisabled();
    await expect(page.locator('#coda .glyph').last()).toHaveCSS('opacity', '1');
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations.filter((item) => ['serious', 'critical'].includes(item.impact || '')),
    ).toEqual([]);
    expect(failures).toEqual([]);
  });
}

test('the second edition remains readable without JavaScript', async ({ browser }) => {
  test.skip(!enabled('club'));
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4406/featured/issue-002');
    await expect(page.getByRole('article')).toContainText('那年风轻云淡，');
    await expect(page.getByRole('article')).toContainText('风却不是你。');
    await expect(page.locator('.coda-line')).toBeVisible();
    await expect(page.getByRole('button', { name: '开启风声与琴音' })).toBeHidden();
  } finally {
    await context.close();
  }
});
