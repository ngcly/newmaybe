import { expect, test } from 'vitest';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

test('Vite serves the catalog module while keeping featured source documents private', async () => {
  const root = fileURLToPath(new URL('../apps/club/', import.meta.url));
  const server = await createServer({
    root,
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw Error('Missing local server');
    const origin = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${origin}/featured/catalog.json?import`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('javascript');
    expect(await response.text()).toContain('export default');
    expect((await fetch(`${origin}/featured/catalog.json`)).status).toBe(404);
    expect((await fetch(`${origin}/featured/template/index.html?import`)).status).toBe(404);
    expect((await fetch(`${origin}/featured/unknown-issue`)).status).toBe(404);
  } finally {
    await server.close();
  }
});
