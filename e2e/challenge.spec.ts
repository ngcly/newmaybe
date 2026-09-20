import { expect, test } from '@playwright/test';
import { enabled } from './apps';

for (const cancel of [false, true]) {
  test(`Free AI challenge ${cancel ? 'cancellation never sends a prompt' : 'sends verified token'}`, async ({
    page,
  }) => {
    test.skip(!enabled('ai'));
    let chatRequests = 0;
    await page.route('**/all-content.json', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/security', (route) =>
      route.fulfill({ json: { required: true, siteKey: 'public-test-key' } }),
    );
    // Stub only the external widget; exercise the real client dialog and transport.
    await page.route(
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      (route) =>
        route.fulfill({
          contentType: 'text/javascript',
          body: `window.turnstile = {
        render(container, options) {
          const button = document.createElement('button');
          button.textContent = '完成测试验证';
          button.onclick = () => options.callback('verified-test-token');
          container.appendChild(button);
          return 'test-widget';
        },
        remove() {}
      };`,
        }),
    );
    await page.route('**/api/chat', (route) => {
      chatRequests += 1;
      expect(route.request().headers()['x-turnstile-token']).toBe('verified-test-token');
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"response":"验证后回答"}\n\ndata: [DONE]\n\n',
      });
    });
    await page.goto('http://127.0.0.1:4403/');
    await page.getByPlaceholder('向您的个人知识 Agent 终端提问...').fill('你好');
    await expect(page.getByPlaceholder('向您的个人知识 Agent 终端提问...')).toHaveValue('你好');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: '发送', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '免费 AI 使用验证' });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('button', { name: cancel ? '取消' : '完成测试验证', exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText(cancel ? '验证未完成，请重试。' : '验证后回答', { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
    expect(chatRequests).toBe(cancel ? 0 : 1);
  });
}

test('AI sends a cross-app query once and clears it from the URL', async ({ page }) => {
  test.skip(!enabled('ai'));
  let requests = 0;
  await page.route('**/all-content.json', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/security', (route) => route.fulfill({ json: { required: false } }));
  await page.route('**/api/chat', (route) => {
    requests++;
    expect(route.request().postDataJSON().messages.at(-1).content).toBe('来自写作页');
    return route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"response":"已接收链接问题"}\n\ndata: [DONE]\n\n',
    });
  });
  await page.goto('http://127.0.0.1:4403/?q=来自写作页');
  await expect(page.getByText('已接收链接问题')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
  expect(requests).toBe(1);
});
