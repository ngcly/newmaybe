import { test as base } from '@playwright/test';

// Exercise the supported system-font fallback without depending on Google's network.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, (route) => route.abort());
    await use(page);
  },
});
export { expect } from '@playwright/test';
export type { Page, Route } from '@playwright/test';
