import { fetchFreeAI } from '@newmaybe/ai-client/free-ai';
import { readSSE } from './sse';
import { AI_STORAGE_KEYS, createGeminiRequest } from '@newmaybe/ai-client';
// AI 评阅 API 调用函数
export async function fetchAICritique(
  drillTitle: string,
  drillHint: string,
  drillSource: string,
  userDraft: string,
): Promise<string> {
  const provider = localStorage.getItem(AI_STORAGE_KEYS.provider) || 'free';
  const apiKey = localStorage.getItem(AI_STORAGE_KEYS.apiKey) || '';
  const model = localStorage.getItem(AI_STORAGE_KEYS.model) || '';
  const baseUrl = localStorage.getItem(AI_STORAGE_KEYS.customBaseUrl) || '';

  const systemPrompt = `你是一位精通中国古典文学与诗词歌赋的“古典文学导师（AI园丁）”。请对用户的古风仿写/习作进行雅致、中肯的评阅。
练习题目：「${drillTitle}」
仿写要求：${drillHint}
原作示范：${drillSource}

请严格按以下三部分进行深度点评，并给出修改前后的对比示例：
【意境风神】简评其意象与文气，是否切合古典风味
【声律对仗】简评其句式与平仄，指出出律或对仗不协处
【酌金墨玉】给出针对性的修改建议和润色示范`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `这是我的仿写习作：\n${userDraft}\n\n请点评。` },
  ];

  try {
    if (provider === 'openai' && apiKey) {
      const url = `${baseUrl.replace(/\/$/, '') || 'https://api.openai.com/v1'}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '未获取到点评内容';
    } else if (provider === 'gemini' && apiKey) {
      const request = createGeminiRequest(baseUrl, model || 'gemini-1.5-flash', apiKey);
      const res = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n用户仿写：\n${userDraft}` }],
            },
          ],
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '未获取到点评内容';
    } else {
      // 默认使用 Workers AI 免费通道
      const endpoint = import.meta.env.VITE_FREE_AI_ENDPOINT || 'https://ai.newmaybe.com/api/chat';
      const res = await fetchFreeAI(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error();

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        const text = await readSSE(res);
        return text || '未获取到流式点评内容';
      } else {
        const data = await res.json();
        return data.response || data.choices?.[0]?.message?.content || '未获取到点评内容';
      }
    }
  } catch (err) {
    console.warn('API connection failed.', err);
    throw new Error('AI 点评服务暂时不可用，请稍后重试或检查 API 配置。', {
      cause: err,
    });
  }
}
