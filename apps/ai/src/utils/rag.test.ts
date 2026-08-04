import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, MAX_SYSTEM_PROMPT_CHARS, type ContentItem } from './rag';

describe('buildSystemPrompt', () => {
  it('truncates long retrieved documents to the free-tier prompt budget', () => {
    const document: ContentItem = {
      id: 'posts/long',
      title: '长文',
      type: 'posts',
      category: '随笔',
      url: 'https://newmaybe.com/writing/long',
      content: '长'.repeat(40_000),
      pubDate: '2026/8/4',
    };

    const prompt = buildSystemPrompt([document]);
    expect(prompt.length).toBeLessThanOrEqual(MAX_SYSTEM_PROMPT_CHARS);
    expect(prompt).toContain('[正文已按请求预算截断]');
    expect(prompt).toContain(document.url);
  });
});
