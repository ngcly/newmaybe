interface ChatMessage {
  role: string;
  content: string;
}

interface Env {
  AI: {
    run: (
      model: string,
      input: { messages: ChatMessage[]; stream: boolean; max_tokens: number },
    ) => Promise<ReadableStream>;
  };
}

const MAX_TOKENS = 2048;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { messages } = (await request.json()) as { messages: ChatMessage[] };

        if (!messages || !Array.isArray(messages)) {
          return new Response(JSON.stringify({ error: 'Invalid messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (!env.AI) {
          return new Response(JSON.stringify({ error: 'Workers AI binding is missing.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
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
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/api/chat' && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
