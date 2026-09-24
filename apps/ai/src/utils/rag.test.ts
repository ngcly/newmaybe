import { describe, expect, it } from 'vitest';
import {
  buildSystemPrompt,
  buildRagPrompt,
  MAX_SYSTEM_PROMPT_CHARS,
  type ContentItem,
} from './rag';

describe('buildSystemPrompt', () => {
  it('only lists sources actually included when source metadata exceeds the budget', () => {
    const base: ContentItem = {
      id: 'posts/short',
      title: '短文',
      type: 'posts',
      category: '随笔',
      url: 'https://newmaybe.com/short',
      content: '可用正文',
      pubDate: '2026-09-23',
    };
    const oversized = {
      ...base,
      id: 'posts/oversized',
      title: '标题'.repeat(5000),
      url: 'https://newmaybe.com/oversized',
    };
    const { prompt, sources } = buildRagPrompt([oversized, base]);
    expect(sources).toEqual([base]);
    expect(prompt).not.toContain(oversized.url);
    expect(prompt).toContain(base.content);
    expect(prompt.length).toBeLessThanOrEqual(MAX_SYSTEM_PROMPT_CHARS);
  });
  it('includes every source when the first source is a long article', () => {
    const docs: ContentItem[] = [1, 2, 3].map((index) => ({
      id: `posts/${index}`,
      title: `长文${index}`,
      type: 'posts',
      category: '随笔',
      url: `https://newmaybe.com/writing/${index}`,
      content: '文'.repeat(10_000),
      pubDate: '2026-09-23',
    }));
    const prompt = buildSystemPrompt(docs);
    for (const doc of docs) expect(prompt).toContain(doc.url);
    expect(prompt.length).toBeLessThanOrEqual(MAX_SYSTEM_PROMPT_CHARS);
  });

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
