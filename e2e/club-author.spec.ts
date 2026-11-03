import { test, expect } from './test';
import { enabled } from './apps';
import AxeBuilder from '@axe-core/playwright';

const user = {
  id: 'test-author',
  email: 'writer@example.test',
  penName: '测试作者',
  isAdmin: false,
};
const manuscript = {
  id: 'club-test',
  authorId: user.id,
  author: user.penName,
  version: 1,
  status: 'draft',
  isPublic: false,
  publishedRevision: null,
  reviewNote: '',
  updatedAt: 1792000000,
  draft: {
    title: '草稿标题',
    content: '云端原文',
    topicId: 'deep-night',
    authorSeal: '',
    seriesTitle: '',
    goldenQuote: '',
  },
};

test('club email login has a clear verification step and opens the author workspace', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  await page.setViewportSize({ width: 390, height: 844 });
  let loggedIn = false;
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { user: loggedIn ? user : null } }),
  );
  await page.route('**/api/manuscripts?*', (route) =>
    route.fulfill({ json: { manuscripts: [], nextOffset: null } }),
  );
  await page.route('**/api/auth/code', (route) => {
    expect(route.request().headers()['x-club-request']).toBe('1');
    expect(route.request().postDataJSON()).toEqual({ email: user.email });
    return route.fulfill({ json: { challengeId: 'test-challenge' } });
  });
  await page.route('**/api/auth/verify', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      challengeId: 'test-challenge',
      code: '123456',
    });
    loggedIn = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('http://127.0.0.1:4406/me');
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(user.email);
  await page.getByRole('button', { name: '发送验证码' }).click();
  await page.getByRole('textbox', { name: '六位验证码' }).fill('123456');
  await page.getByRole('button', { name: '验证并登录' }).click();
  await expect(page.getByRole('button', { name: '新建文稿' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '公开笔名' })).toHaveValue(user.penName);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    audit.violations.filter((item) => ['serious', 'critical'].includes(item.impact || '')),
  ).toEqual([]);
});

test('club keeps unsaved text and offers export when another device changes the draft', async ({
  page,
}) => {
  test.skip(!enabled('club'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user } }));
  await page.route('**/api/manuscripts?*', (route) =>
    route.fulfill({ json: { manuscripts: [manuscript], nextOffset: null } }),
  );
  let writes = 0;
  await page.route('**/api/manuscripts/club-test', (route) => {
    if (route.request().method() === 'PUT') {
      writes++;
      return route.fulfill({
        status: 409,
        json: { error: '文稿已在另一处更新，请重新载入后比较内容' },
      });
    }
    return route.fulfill({ json: { manuscript } });
  });
  await page.goto('http://127.0.0.1:4406/me');
  await page.getByRole('button', { name: '继续编辑' }).click();
  await page.getByRole('textbox', { name: '文章正文', exact: true }).fill('不可丢失的本地修改');
  await expect(page.getByRole('alert')).toContainText('文稿已在另一处更新');
  await expect(page.getByRole('button', { name: '导出当前文稿' })).toBeVisible();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: '保留本地备份并退出' }).click();
  await page.getByRole('button', { name: '继续编辑' }).click();
  await expect(page.getByRole('region', { name: '恢复本地备份' })).toBeVisible();
  await page.getByRole('button', { name: '继续本地文字' }).click();
  await expect(page.getByRole('textbox', { name: '文章正文', exact: true })).toHaveValue(
    '不可丢失的本地修改',
  );
});

for (const width of [320, 375, 390]) {
  test(`club author saves on close and submits for review at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(!enabled('club'));
    await page.setViewportSize({ width, height: 844 });
    let current = structuredClone(manuscript);
    await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user } }));
    await page.route('**/api/manuscripts?*', (route) =>
      route.fulfill({ json: { manuscripts: [current], nextOffset: null } }),
    );
    await page.route('**/api/manuscripts/club-test', (route) => {
      if (route.request().method() === 'PUT') {
        const { version, ...draft } = route.request().postDataJSON();
        expect(version).toBe(current.version);
        current = { ...current, draft, version: version + 1 };
      }
      return route.fulfill({ json: { manuscript: current } });
    });
    await page.route('**/api/manuscripts/club-test/submit', (route) => {
      expect(route.request().postDataJSON().version).toBe(current.version);
      current = { ...current, status: 'pending', version: current.version + 1 };
      return route.fulfill({ json: { manuscript: current } });
    });
    await page.goto('http://127.0.0.1:4406/me');
    await page.getByRole('button', { name: '继续编辑' }).click();
    await page.getByRole('textbox', { name: '文章正文', exact: true }).fill('关闭前刚写下的文字');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('group', { name: '写作室' })).toBeHidden();
    expect(current.draft.content).toBe('关闭前刚写下的文字');
    await page.getByRole('button', { name: '继续编辑' }).click();
    await expect(page.getByRole('textbox', { name: '文章正文', exact: true })).toHaveValue(
      '关闭前刚写下的文字',
    );
    await expect(page.getByRole('button', { name: '提交审核', exact: true })).toBeInViewport({
      ratio: 1,
    });
    await page.screenshot({
      path: testInfo.outputPath('author-editor.png'),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: '提交审核', exact: true }).click();
    await expect(page.getByRole('button', { name: '撤回审核' })).toBeVisible();
  });
}
