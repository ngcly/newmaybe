interface Env {
  AI: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { messages } = await context.request.json() as { messages: any[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!context.env.AI) {
      return new Response(JSON.stringify({ error: 'Cloudflare Workers AI binding is missing in this Pages project. Please bind AI in the Cloudflare Pages settings.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 使用适合中文与逻辑推理的开源模型
    // 优先使用 llama-3.1-8b-instruct，如失败则回退至 llama-3.1-8b-instruct-fast
    let responseText = '';
    const primaryModel = '@cf/meta/llama-3.1-8b-instruct';
    const fallbackModel = '@cf/meta/llama-3.1-8b-instruct-fast';

    try {
      const response = await context.env.AI.run(primaryModel, {
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content
        }))
      });
      responseText = response.response;
    } catch (primaryError) {
      console.warn('Primary model failed, falling back to Llama-3.1-fast:', primaryError);
      const response = await context.env.AI.run(fallbackModel, {
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
};

// 预检 OPTIONS 请求支持 CORS
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
};
