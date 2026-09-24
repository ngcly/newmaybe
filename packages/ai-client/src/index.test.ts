import { describe, expect, it, vi } from 'vitest';
import { validateMessages } from '../../../apps/ai/src/worker';
import {
  AI_MAX_TOTAL_CHARS,
  createGeminiRequest,
  fitMessagesToCharBudget,
  readAIResponse,
} from './index';

describe('readAIResponse', () => {
  it('accepts an explicit finish reason and releases the response reader', async () => {
    const response = new Response(
      'data: {"choices":[{"delta":{"content":"完成"},"finish_reason":"stop"}]}\n\n',
      {
        headers: { 'Content-Type': 'text/event-stream' },
      },
    );
    await expect(readAIResponse(response)).resolves.toBe('完成');
    expect(response.body?.locked).toBe(false);
  });

  it('cancels the underlying stream after a provider error', async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('event: error\ndata: {"message":"overloaded"}\n\n'),
          );
        },
        cancel,
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
    await expect(readAIResponse(response)).rejects.toThrow('overloaded');
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it.each([
    'data: {"error":{"message":"provider overloaded"}}\n\n',
    'event: error\ndata: {"message":"provider overloaded"}\n\n',
  ])('rejects an error after partial streaming output: %s', async (errorEvent) => {
    const response = new Response(
      'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n' + errorEvent,
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
    await expect(readAIResponse(response)).rejects.toThrow('provider overloaded');
  });

  it('rejects a stream disconnected before completion', async () => {
    const response = new Response('data: {"response":"partial"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
    await expect(readAIResponse(response)).rejects.toThrow(/中断/);
  });

  it('surfaces an error payload even with HTTP 200', async () => {
    await expect(
      readAIResponse(Response.json({ error: { message: 'overloaded' } })),
    ).rejects.toThrow('overloaded');
  });

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
        controller.enqueue(
          new TextEncoder().encode('data: {"response":"last-token"}\n\ndata: [DONE]'),
        );
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
  it('keeps the sixteenth short turn acceptable to the Worker', () => {
    const messages = [
      { role: 'system', content: '写作助手' },
      ...Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 ? 'assistant' : 'user',
        content: '简短对话',
      })),
      { role: 'user', content: '继续' },
    ];
    const fitted = fitMessagesToCharBudget(messages);
    expect(validateMessages(fitted)).not.toBeNull();
    expect(fitted.at(-1)?.content).toBe('继续');
  });

  it('bounds serialized JSON even when characters require escaping', () => {
    const fitted = fitMessagesToCharBudget([
      { role: 'system', content: '\u0000'.repeat(20_000) },
      { role: 'user', content: '最后的问题' },
    ]);
    expect(
      new TextEncoder().encode(JSON.stringify({ messages: fitted })).byteLength,
    ).toBeLessThanOrEqual(32 * 1024);
    expect(validateMessages(fitted)).not.toBeNull();
    expect(fitted.at(-1)?.content).toBe('最后的问题');
  });

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
