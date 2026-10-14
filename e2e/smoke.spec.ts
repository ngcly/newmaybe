import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test } from './test';
import { enabled } from './apps';

// Validate the deployment checker against real local build outputs.
// Worker endpoints require deployment bindings; these checks exercise static build outputs.
for (const [app, port] of [
  ['main', 4401],
  ['graph', 4402],
  ['studio', 4404],
  ['study', 4405],
  ['club', 4406],
  ['lab', 4407],
] as const) {
  test(`${app} deployment smoke checks its build`, async () => {
    test.skip(!enabled(app));
    const { stdout } = await promisify(execFile)(process.execPath, [
      '--import',
      'tsx',
      'scripts/smoke.ts',
      app,
      `http://127.0.0.1:${port}`,
      '--static-only',
    ]);
    expect(stdout).toContain('OK /');
  });
}

test('Club full deployment check rejects a static-only deployment without the API', async () => {
  test.skip(!enabled('club'));
  await expect(
    promisify(execFile)(process.execPath, [
      '--import',
      'tsx',
      'scripts/smoke.ts',
      'club',
      'http://127.0.0.1:4406',
    ]),
  ).rejects.toThrow();
});
