import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { validateMessages, type Env } from './worker';

describe('validateMessages', () => {
  it('accepts valid chat messages', () => {
    expect(validateMessages([{ role: 'user', content: '你好' }])).toEqual([
      { role: 'user', content: '你好' },
    ]);
  });

  it('rejects invalid roles and oversized prompts', () => {
    expect(validateMessages([{ role: 'admin', content: 'x' }])).toBeNull();
    expect(validateMessages([{ role: 'user', content: 'x'.repeat(7_001) }])).toBeNull();
  });
});

afterEach(() => vi.unstubAllGlobals());

function env(): Env {
  return {
    AI: {
      run: vi.fn(
        async () =>
          new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode('data: {"response":"ok"}\n\n'));
              c.close();
            },
          }),
      ),
    },
    RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    BURST_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    TURNSTILE_SITE_KEY: 'public-test-key',
    TURNSTILE_SECRET_KEY: 'test-secret',
  };
}
const request = (
  body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  headers: Record<string, string> = {},
) =>
  new Request('https://ai.newmaybe.com/api/chat', {
    method: 'POST',
    headers: {
      Origin: 'https://ai.newmaybe.com',
      'Content-Type': 'application/json',
      'X-Turnstile-Token': 'test-token',
      'CF-Connecting-IP': '192.0.2.1',
      ...headers,
    },
    body,
  });

describe('free AI abuse controls', () => {
  it('publishes only public challenge configuration', async () => {
    const bindings = env();
    const response = await worker.fetch(
      new Request('https://ai.newmaybe.com/api/security'),
      bindings,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ required: true, siteKey: 'public-test-key' });
    delete bindings.BURST_LIMITER;
    expect(
      (await worker.fetch(new Request('https://ai.newmaybe.com/api/security'), bindings)).status,
    ).toBe(503);
    expect(bindings.AI.run).not.toHaveBeenCalled();
  });
  it('rejects missing tokens and unsupported payload formats', async () => {
    const bindings = env();
    expect(
      (await worker.fetch(request(undefined, { 'X-Turnstile-Token': '' }), bindings)).status,
    ).toBe(403);
    expect(
      (await worker.fetch(request(undefined, { 'Content-Type': 'text/plain' }), bindings)).status,
    ).toBe(415);
    expect(
      (await worker.fetch(request(undefined, { 'Content-Length': '32769' }), bindings)).status,
    ).toBe(413);
    expect(bindings.AI.run).not.toHaveBeenCalled();
  });
  it('requires allowed origins, including requests without Origin', async () => {
    for (const Origin of ['', 'https://evil.example']) {
      const bindings = env();
      expect((await worker.fetch(request(undefined, { Origin }), bindings)).status).toBe(403);
      expect(bindings.AI.run).not.toHaveBeenCalled();
    }
  });
  it('fails closed with missing configuration', async () => {
    const bindings = env();
    delete bindings.RATE_LIMITER;
    expect((await worker.fetch(request(), bindings)).status).toBe(503);
    expect(bindings.AI.run).not.toHaveBeenCalled();
    bindings.RATE_LIMITER = { limit: async () => ({ success: true }) };
    delete bindings.TURNSTILE_SECRET_KEY;
    expect((await worker.fetch(request(), bindings)).status).toBe(503);
  });
  it('enforces IP and service burst limits before inference', async () => {
    for (const key of ['RATE_LIMITER', 'BURST_LIMITER'] as const) {
      const bindings = env();
      bindings[key] = { limit: async () => ({ success: false }) };
      const response = await worker.fetch(request(), bindings);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(bindings.AI.run).not.toHaveBeenCalled();
    }
  });
  it('rejects malformed JSON, invalid messages and large bodies', async () => {
    for (const [body, status] of [
      ['{', 400],
      ['null', 400],
      ['{}', 400],
      ['x'.repeat(32769), 413],
    ] as const) {
      const bindings = env();
      expect((await worker.fetch(request(body), bindings)).status).toBe(status);
      expect(bindings.AI.run).not.toHaveBeenCalled();
    }
  });
  it.each([
    { success: false },
    { success: true, hostname: 'evil.example', action: 'free_ai' },
    { success: true, hostname: 'ai.newmaybe.com', action: 'other' },
  ])('rejects invalid, replayed or mismatched challenges', async (result) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(result)),
    );
    const bindings = env();
    expect((await worker.fetch(request(), bindings)).status).toBe(403);
    expect(bindings.AI.run).not.toHaveBeenCalled();
  });
  it('validates challenges server-side and returns streaming responses', async () => {
    const verify = vi.fn(async () =>
      Response.json({ success: true, hostname: 'ai.newmaybe.com', action: 'free_ai' }),
    );
    vi.stubGlobal('fetch', verify);
    const bindings = env();
    const response = await worker.fetch(request(), bindings);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://ai.newmaybe.com');
    expect(verify).toHaveBeenCalledOnce();
    expect(bindings.AI.run).toHaveBeenCalledOnce();
  });
  it('never bypasses production challenge verification via the local flag', async () => {
    const bindings = env();
    bindings.ALLOW_LOCAL_TESTS = 'true';
    delete bindings.TURNSTILE_SECRET_KEY;
    expect((await worker.fetch(request(), bindings)).status).toBe(503);
  });
  it('does not expose upstream secrets on verification failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('secret-value');
      }),
    );
    const response = await worker.fetch(request(), env());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret-value');
  });
  it('supports preflight without inference', async () => {
    const response = await worker.fetch(
      new Request('https://ai.newmaybe.com/api/chat', {
        method: 'OPTIONS',
        headers: { Origin: 'https://studio.newmaybe.com' },
      }),
      env(),
    );
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Turnstile-Token');
  });
});
