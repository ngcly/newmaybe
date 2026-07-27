interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RateLimitResult {
  success: boolean;
}

interface Env {
  AI: {
    run: (
      model: string,
      input: { messages: ChatMessage[]; stream: boolean; max_tokens: number },
    ) => Promise<ReadableStream>;
  };
  RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<RateLimitResult>;
  };
}

const MAX_TOKENS = 2048;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 30;
const MAX_TOTAL_CHARS = 12_000;
const ALLOWED_ORIGINS = new Set([
  'https://newmaybe.com',
  'https://ai.newmaybe.com',
  'https://study.newmaybe.com',
  'https://studio.newmaybe.com',
  'http://localhost:4324',
  'http://localhost:4326',
  'http://localhost:4327',
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  return origin && ALLOWED_ORIGINS.has(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    : {};
}

export function validateMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;
  let totalChars = 0;
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (
      (role !== 'system' && role !== 'user' && role !== 'assistant') ||
      typeof content !== 'string' ||
      content.length === 0
    ) {
      return null;
    }
    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) return null;
    messages.push({ role, content });
  }
  return messages;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const origin = request.headers.get('Origin');
        if (origin && !ALLOWED_ORIGINS.has(origin)) {
          return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const contentLength = Number(request.headers.get('Content-Length') || 0);
        if (contentLength > MAX_BODY_BYTES) {
          return new Response(JSON.stringify({ error: 'Request body too large' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }

        const clientKey =
          request.headers.get('CF-Connecting-IP') ||
          request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
          'unknown';
        if (env.RATE_LIMITER) {
          const rate = await env.RATE_LIMITER.limit({ key: clientKey });
          if (!rate.success) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...cors },
            });
          }
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
          return new Response(JSON.stringify({ error: 'Request body too large' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }
        const payload = JSON.parse(rawBody) as { messages?: unknown };
        const messages = validateMessages(payload.messages);
        if (!messages) {
          return new Response(JSON.stringify({ error: 'Invalid messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }

        if (!env.AI) {
          return new Response(JSON.stringify({ error: 'Workers AI binding is missing.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }

        const primaryModel = '@cf/meta/llama-3.1-8b-instruct';
        const fallbackModel = '@cf/meta/llama-3.1-8b-instruct-fast';

        try {
          const stream = await env.AI.run(primaryModel, {
            messages: messages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
              content: m.content,
            })),
            stream: true,
            max_tokens: MAX_TOKENS,
          });
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              ...cors,
            },
          });
        } catch (primaryError) {
          console.warn('Primary model failed, falling back to Llama-3.1-fast:', primaryError);
          const stream = await env.AI.run(fallbackModel, {
            messages: messages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
              content: m.content,
            })),
            stream: true,
            max_tokens: MAX_TOKENS,
          });
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              ...cors,
            },
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
    }

    if (url.pathname === '/api/chat' && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: cors,
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
