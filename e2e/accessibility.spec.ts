import { enabled } from './apps';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  ['main', 4401, '/'],
  ['graph', 4402, '/'],
  ['ai', 4403, '/'],
  ['studio', 4404, '/?tab=card'],
  ['study', 4405, '/'],
  ['club', 4406, '/'],
  ['lab', 4407, '/'],
] as const;

for (const [app, port, path] of pages) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${app} ${theme} has no serious accessibility violations`, async ({ page }) => {
      test.skip(!enabled(app));
      await page.emulateMedia({ colorScheme: theme });
      await page.route('**/all-content.json', (route) => route.fulfill({ json: [] }));
      await page.goto(`http://127.0.0.1:${port}${path}`);
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
          })),
      ).toEqual([]);
    });
  }
}
