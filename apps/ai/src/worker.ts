import { AI_MAX_TOTAL_CHARS } from '@newmaybe/ai-client';
import {
  ALLOWED_ORIGINS,
  securityReady,
  isLocalTest,
  verifyChallenge,
  readBoundedBody,
  type SecurityEnv,
} from './security';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RateLimitResult {
  success: boolean;
}

export interface Env extends SecurityEnv {
  AI: {
    run: (
      model: string,
      input: { messages: ChatMessage[]; stream: boolean; max_tokens: number },
    ) => Promise<ReadableStream>;
  };
  BURST_LIMITER?: { limit: (options: { key: string }) => Promise<RateLimitResult> };
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<RateLimitResult>;
  };
}

const MAX_TOKENS = 2048;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 30;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  return origin && ALLOWED_ORIGINS.has(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
        'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    if (totalChars > AI_MAX_TOTAL_CHARS) return null;
    messages.push({ role, content });
  }
  return messages;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (url.pathname === '/api/security' && request.method === 'GET') {
      const ready =
        securityReady(request, env) && Boolean(env.AI && env.RATE_LIMITER && env.BURST_LIMITER);
      return Response.json(
        ready
          ? { required: !isLocalTest(request, env), siteKey: env.TURNSTILE_SITE_KEY }
          : { error: 'Service not configured' },
        { status: ready ? 200 : 503, headers: { ...cors, 'Cache-Control': 'no-store' } },
      );
    }
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const origin = request.headers.get('Origin');
        if (!origin || !ALLOWED_ORIGINS.has(origin)) {
          return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
          return Response.json(
            { error: 'Expected application/json' },
            { status: 415, headers: cors },
          );
        }
        if (!securityReady(request, env) || !env.AI || !env.RATE_LIMITER || !env.BURST_LIMITER) {
          return Response.json({ error: 'Service not configured' }, { status: 503, headers: cors });
        }
        const contentLength = Number(request.headers.get('Content-Length') || 0);
        if (contentLength > MAX_BODY_BYTES) {
          return new Response(JSON.stringify({ error: 'Request body too large' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }

        const clientKey = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (env.RATE_LIMITER) {
          const rate = await env.RATE_LIMITER.limit({ key: clientKey });
          const burst = rate.success
            ? await env.BURST_LIMITER.limit({ key: 'free-ai' })
            : { success: false };
          if (!rate.success || !burst.success) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...cors },
            });
          }
        }

        const rawBody = await readBoundedBody(request, MAX_BODY_BYTES);
        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
          return new Response(JSON.stringify({ error: 'Request body too large' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }
        const payload = JSON.parse(rawBody) as { messages?: unknown } | null;
        const messages = validateMessages(payload?.messages);
        if (!messages) {
          return new Response(JSON.stringify({ error: 'Invalid messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }

        if (!(await verifyChallenge(request, env))) {
          return Response.json({ error: '验证失败，请重试。' }, { status: 403, headers: cors });
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
        const status = err instanceof SyntaxError ? 400 : err instanceof RangeError ? 413 : 503;
        const message =
          status === 400
            ? 'Invalid JSON'
            : status === 413
              ? 'Request body too large'
              : 'AI 服务暂不可用，请稍后重试。';
        return new Response(JSON.stringify({ error: message }), {
          status,
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
