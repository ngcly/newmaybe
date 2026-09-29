import { expect, test } from '@playwright/test';
import { enabled } from './apps';
import { dark, studyDark } from '../packages/design-tokens/src/index';

for (const [index, app] of ['main', 'graph', 'ai', 'studio', 'study', 'club', 'lab'].entries()) {
  test(`${app} follows system changes before the application loads`, async ({ page }) => {
    test.skip(!enabled(app));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.route('**/*.js', (route) => route.abort());
    await page.goto(`http://127.0.0.1:${4401 + index}/`);
    await expect(page.locator('html')).toHaveClass(/light/);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      app === 'study' ? studyDark['study-paper'] : dark.paper,
    );
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
    expect(await page.locator('body').evaluate((element) => element.style.backgroundColor)).toBe(
      await page.locator('html').evaluate((element) => element.style.backgroundColor),
    );
  });
}

test('Study honors the legacy theme in its toggle on the first click', async ({ page }) => {
  test.skip(!enabled('study'));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('http://127.0.0.1:4405/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: '切换日读', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.getByRole('button', { name: '切换夜读', exact: true })).toBeVisible();
});

test('Study keeps its toggle synchronized with system changes and preserves manual choice', async ({
  page,
}) => {
  test.skip(!enabled('study'));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://127.0.0.1:4405/');
  await expect(page.getByRole('button', { name: '切换夜读', exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: '切换日读', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '切换日读', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.getByRole('button', { name: '切换夜读', exact: true })).toBeVisible();
});
