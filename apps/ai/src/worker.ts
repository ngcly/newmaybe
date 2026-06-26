interface Env {
  AI: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle /api/chat POST requests
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { messages } = await request.json() as { messages: any[] };

        if (!messages || !Array.isArray(messages)) {
          return new Response(JSON.stringify({ error: 'Invalid messages' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!env.AI) {
          return new Response(JSON.stringify({ error: 'Workers AI binding is missing.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        let responseText = '';
        const primaryModel = '@cf/meta/llama-3.1-8b-instruct';
        const fallbackModel = '@cf/meta/llama-3.1-8b-instruct-fast';

        try {
          const response = await env.AI.run(primaryModel, {
            messages: messages.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
              content: m.content
            }))
          });
          responseText = response.response;
        } catch (primaryError) {
          console.warn('Primary model failed, falling back to Llama-3.1-fast:', primaryError);
          const response = await env.AI.run(fallbackModel, {
            messages: messages.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
              content: m.content
            }))
          });
          responseText = response.response;
        }

        return new Response(JSON.stringify({ text: responseText }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (url.pathname === '/api/chat' && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
