import { describe, expect, it } from 'vitest';
import { readSSE } from '../sse';

describe('readSSE', () => {
  it('preserves JSON events split across network chunks', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"response":"你'));
        controller.enqueue(
          encoder.encode('好"}\n\ndata: {"choices":[{"delta":{"content":"！"}}]}\n'),
        );
        controller.enqueue(encoder.encode('\ndata: [DONE]\n\n'));
        controller.close();
      },
    });

    const response = new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
    await expect(readSSE(response)).resolves.toBe('你好！');
  });
});
