import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it('refreshes corrected text online while retaining an offline copy', async () => {
  type FetchEvent = {
    request: Request;
    respondWith: (response: Promise<Response>) => void;
    waitUntil: (work: Promise<unknown>) => void;
  };
  let handler: ((event: FetchEvent) => void) | undefined;
  let cached = new Response('旧正文');
  const cache = {
    match: async () => cached.clone(),
    put: async (_request: Request, response: Response) => {
      cached = response;
    },
  };
  const network = vi.fn().mockResolvedValue(new Response('纠错正文'));
  runInNewContext(readFileSync('apps/study/public/sw.js', 'utf8'), {
    self: {
      location: { origin: 'https://study.newmaybe.com' },
      addEventListener: (type: string, listener: typeof handler) => {
        if (type === 'fetch') handler = listener;
      },
    },
    caches: { match: cache.match, open: async () => cache },
    fetch: network,
    URL,
    Response,
    AbortSignal,
  });
  async function read() {
    let response: Promise<Response> | undefined;
    const work: Promise<unknown>[] = [];
    handler!({
      request: new Request('https://study.newmaybe.com/texts/tang300/0.json'),
      respondWith: (value) => {
        response = value;
      },
      waitUntil: (value) => {
        work.push(value);
      },
    });
    const result = await response!;
    await Promise.all(work);
    return result.text();
  }
  expect(await read()).toBe('纠错正文');
  network.mockRejectedValue(new Error('offline'));
  expect(await read()).toBe('纠错正文');
});
