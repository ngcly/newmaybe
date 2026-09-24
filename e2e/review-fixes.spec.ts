import { expect, test, type Page, type Route } from '@playwright/test';
import { enabled } from './apps';

async function mockAI(page: Page) {
  await page.route('**/all-content.json', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/security', (route) => route.fulfill({ json: { required: false } }));
}

test('AI surfaces a stream error without saving partial output as an answer or consuming a turn', async ({
  page,
}) => {
  test.skip(!enabled('ai'));
  await mockAI(page);
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"response":"未完成的回答"}\n\nevent: error\ndata: {"message":"provider overloaded"}\n\n',
    }),
  );
  await page.goto('http://127.0.0.1:4403/');
  await page.getByPlaceholder('向您的个人知识 Agent 终端提问...').fill('请解释');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByText(/【错误反馈】.*provider overloaded/)).toBeVisible();
  await expect(page.getByText('未完成的回答', { exact: true })).toHaveCount(0);
  const messages = await page.evaluate(() => localStorage.getItem('newmaybe_ai_messages'));
  expect(messages).not.toContain('未完成的回答');
  expect(await page.evaluate(() => localStorage.getItem('newmaybe_free_turns_limit'))).toBeNull();
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
});

test('Studio asset gallery exposes real URLs and complete usable snippets', async ({ page }) => {
  test.skip(!enabled('studio'));
  await page.goto('http://127.0.0.1:4404/?tab=assets');
  const links = page.getByRole('link', { name: '查看素材', exact: true });
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href', /\/og-default\.png$/);
  await expect(links.nth(1)).toHaveAttribute('href', /\/favicon\.svg$/);
  const code = await page.locator('code').allTextContents();
  expect(code.join('\n')).not.toMatch(/\/public\/|node_modules\/|\.\.\./);
  const noise = code.find((value) => value.startsWith('background-image:'))!;
  expect(decodeURIComponent(noise)).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  expect(decodeURIComponent(noise)).toContain('</svg>');
});

for (const tool of ['card', 'poster'] as const) {
  test(`Studio preserves imported ${tool} edits across tool switches`, async ({ page }) => {
    test.skip(!enabled('studio'));
    await page.goto(`http://127.0.0.1:4404/?${tool === 'card' ? 'content' : 'quote'}=原始导入`);
    const editor = page.locator('textarea:visible').first();
    await editor.fill('修改后必须保留的草稿');
    await page.getByRole('button', { name: '中英文混排优化', exact: true }).click();
    await page
      .getByRole('button', {
        name: tool === 'card' ? '念头/拾遗卡片生成器' : '新可能排版封面海报',
        exact: true,
      })
      .click();
    await expect(editor).toHaveValue('修改后必须保留的草稿');
    await page.reload();
    if (tool === 'card')
      await page.getByRole('button', { name: '念头/拾遗卡片生成器', exact: true }).click();
    await expect(editor).toHaveValue('修改后必须保留的草稿');
  });
}

for (const [tab, label] of [
  ['card', '念头/拾遗卡片生成器'],
  ['poster', '新可能排版封面海报'],
  ['formatter', '中英文混排优化'],
] as const) {
  test(`Studio ${tab} reports failed storage and keeps the in-memory draft across tools`, async ({
    page,
  }) => {
    test.skip(!enabled('studio'));
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('full', 'QuotaExceededError');
      };
    });
    await page.goto(`http://127.0.0.1:4404/?tab=${tab}`);
    await page.locator('textarea:visible').first().fill('无法落盘但不能丢失');
    await expect(page.getByRole('alert')).toContainText('暂存失败');
    await page.getByRole('button', { name: '共享素材资产画廊', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('textarea:visible').first()).toHaveValue('无法落盘但不能丢失');
    await expect(page.getByRole('alert')).toContainText('暂存失败');
  });
}

test('Graph keeps imported sandbox nodes and edges across view switches', async ({ page }) => {
  test.skip(!enabled('graph'));
  await page.route('**/graph-data.json', (route) =>
    route.fulfill({
      json: {
        nodes: [{ id: 'garden', title: '花园节点', group: 'notes' }],
        links: [],
      },
    }),
  );
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('http://127.0.0.1:4402/');
  await expect(page.locator('#graph circle')).toHaveCount(1);
  await page.locator('#btn-mode-sandbox').click();
  await page.locator('#import-json-file').setInputFiles({
    name: 'sandbox.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        nodes: [
          { id: 'a', title: '我的节点', group: 'notes' },
          { id: 'b', title: '另一个节点', group: 'posts' },
        ],
        links: [{ source: 'a', target: 'b' }],
      }),
    ),
  });
  await expect(page.locator('#graph .link')).toHaveCount(1);
  await page.locator('#btn-mode-view').click();
  await expect(page.locator('#graph circle')).toHaveCount(1);
  await page.locator('#btn-mode-sandbox').click();
  await expect(page.locator('#graph circle')).toHaveCount(2);
  await expect(page.locator('#graph .link')).toHaveCount(1);
  await expect(page.locator('#graph text').first()).toHaveText('我的节点');
});

test('Capture Pad preserves input and a pending result across tabs and reload', async ({
  page,
}) => {
  test.skip(!enabled('ai'));
  await mockAI(page);
  let pending: Route | undefined;
  await page.route('**/api/chat', (route) => {
    pending = route;
  });
  await page.goto('http://127.0.0.1:4403/');
  await page.getByRole('button', { name: '灵感捕获', exact: true }).click();
  await page.locator('textarea:visible').fill('不能消失的灵感');
  await page.getByRole('button', { name: /格式化为 Markdown 笔记/ }).click();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await page.getByRole('button', { name: '问答终端', exact: true }).click();
  await pending!.fulfill({ json: { response: '生成的笔记正文' } });
  await page.getByRole('button', { name: '灵感捕获', exact: true }).click();
  await expect(page.locator('textarea:visible')).toHaveValue('不能消失的灵感');
  await expect(page.locator('pre')).toHaveText('生成的笔记正文');
  await page.reload();
  await page.getByRole('button', { name: '灵感捕获', exact: true }).click();
  await expect(page.locator('textarea:visible')).toHaveValue('不能消失的灵感');
  await expect(page.locator('pre')).toHaveText('生成的笔记正文');
});

for (const mode of ['chat', 'ego'] as const) {
  test(`AI ${mode} ignores a response after clearing and accepts a new request`, async ({
    page,
  }) => {
    test.skip(!enabled('ai'));
    await mockAI(page);
    let oldRequest: Route | undefined;
    await page.route('**/api/chat', (route) => {
      if (!oldRequest) {
        oldRequest = route;
        return;
      }
      return route.fulfill({ json: { response: '新会话回答' } });
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('http://127.0.0.1:4403/');
    if (mode === 'ego') await page.getByRole('button', { name: '自我对撞', exact: true }).click();
    const send = page.getByRole('button', { name: mode === 'chat' ? '发送' : '对撞', exact: true });
    const input = page.getByPlaceholder(
      mode === 'chat'
        ? '向您的个人知识 Agent 终端提问...'
        : '说出你此刻偏激、不成熟或全新的灵感观点...',
    );
    await input.fill('旧问题');
    await send.click();
    await expect.poll(() => Boolean(oldRequest)).toBe(true);
    if (mode === 'chat') await page.getByTitle('清空对话历史').click();
    else await page.getByRole('button', { name: '清空对撞记录', exact: true }).click();
    await expect(input).toBeEditable();
    await input.fill('新问题');
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByText('新会话回答', { exact: true })).toBeVisible();
    await oldRequest!.fulfill({ json: { response: '旧会话回答不应出现' } }).catch(() => {});
    await page.waitForTimeout(150);
    await expect(page.getByText('旧会话回答不应出现', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/【错误反馈】|【对撞机故障】/)).toHaveCount(0);
  });
}
