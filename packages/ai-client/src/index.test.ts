import { describe, expect, it, vi } from 'vitest';
import {
  AI_MAX_TOTAL_CHARS,
  createGeminiRequest,
  fitMessagesToCharBudget,
  readAIResponse,
} from './index';

describe('readAIResponse', () => {
  it('reads a regular JSON response', async () => {
    const response = Response.json({ choices: [{ message: { content: '完成' } }] });
    await expect(readAIResponse(response)).resolves.toBe('完成');
  });

  it('preserves SSE events split across chunks', async () => {
    const encoder = new TextEncoder();
    const onToken = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"response":"你'));
        controller.enqueue(encoder.encode('好"}\n\ndata: {"response":"！"}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    const response = new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

    await expect(readAIResponse(response, onToken)).resolves.toBe('你好！');
    expect(onToken).toHaveBeenLastCalledWith('！', '你好！');
  });

  it('keeps a final SSE event without a trailing newline', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"response":"last-token"}'));
        controller.close();
      },
    });
    const response = new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

    await expect(readAIResponse(response)).resolves.toBe('last-token');
  });

  it('surfaces JSON error responses', async () => {
    const response = Response.json({ error: '受限' }, { status: 429 });
    await expect(readAIResponse(response)).rejects.toThrow('受限');
  });
});

describe('fitMessagesToCharBudget', () => {
  it('keeps the system prompt and newest turn within the Worker budget', () => {
    const messages = [
      { role: 'system', content: '系'.repeat(7_000) },
      { role: 'user', content: '旧'.repeat(2_000) },
      { role: 'assistant', content: '答'.repeat(2_000) },
      { role: 'user', content: '新'.repeat(3_000) },
    ];

    const fitted = fitMessagesToCharBudget(messages);
    expect(fitted.reduce((sum, message) => sum + message.content.length, 0)).toBeLessThanOrEqual(
      AI_MAX_TOTAL_CHARS,
    );
    expect(fitted[0]?.role).toBe('system');
    expect(fitted.at(-1)?.content).toBe('新'.repeat(Math.floor(AI_MAX_TOTAL_CHARS / 3)));
  });
});

describe('createGeminiRequest', () => {
  it('keeps API keys out of URLs', () => {
    const request = createGeminiRequest('', 'gemini-flash', 'secret-key');
    expect(request.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent',
    );
    expect(request.url).not.toContain('secret-key');
    expect(request.headers['x-goog-api-key']).toBe('secret-key');
  });
});
