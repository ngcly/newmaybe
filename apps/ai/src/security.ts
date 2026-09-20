export const ALLOWED_ORIGINS = new Set([
  'https://newmaybe.com',
  'https://ai.newmaybe.com',
  'https://study.newmaybe.com',
  'https://studio.newmaybe.com',
  'http://localhost:4324',
  'http://localhost:4326',
  'http://localhost:4327',
  'http://127.0.0.1:4324',
  'http://127.0.0.1:4326',
  'http://127.0.0.1:4327',
]);

export interface SecurityEnv {
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ALLOW_LOCAL_TESTS?: string;
}

export function isLocalTest(request: Request, env: SecurityEnv): boolean {
  return (
    env.ALLOW_LOCAL_TESTS === 'true' &&
    ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)
  );
}

export function securityReady(request: Request, env: SecurityEnv): boolean {
  return isLocalTest(request, env) || Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
}

export async function verifyChallenge(request: Request, env: SecurityEnv): Promise<boolean> {
  if (isLocalTest(request, env)) return true;
  const token = request.headers.get('X-Turnstile-Token');
  if (!env.TURNSTILE_SECRET_KEY || !token || token.length > 2048) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || undefined,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return false;
  const result = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  const origin = request.headers.get('Origin');
  return Boolean(
    origin &&
    result.success &&
    result.hostname === new URL(origin).hostname &&
    result.action === 'free_ai',
  );
}

// Count bytes while reading so a missing/forged Content-Length cannot allocate an unbounded body.
export async function readBoundedBody(request: Request, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  let bytes = 0;
  const decoder = new TextDecoder();
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return body + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new RangeError('Request body too large');
      }
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
