import { describe, expect, it, vi } from 'vitest';
import { readAIResponse } from './index';

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

  it('surfaces JSON error responses', async () => {
    const response = Response.json({ error: '受限' }, { status: 429 });
    await expect(readAIResponse(response)).rejects.toThrow('受限');
  });
});
