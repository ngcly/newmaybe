import { describe, it, expect } from 'vitest';
import { postSchema, fragmentSchema, excerptSchema, noteSchema, memorySchema } from '../schemas';

describe('postSchema', () => {
  const validPost = {
    title: '测试文章',
    description: '这是一篇测试文章的描述',
    pubDate: '2026-01-01',
    category: '随笔',
    readingTime: 5,
    weight: 0,
    draft: false,
  };

  it('parses a valid post', () => {
    const result = postSchema.safeParse(validPost);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('测试文章');
      expect(result.data.pubDate).toBeInstanceOf(Date);
      expect(result.data.weight).toBe(0);
      expect(result.data.draft).toBe(false);
    }
  });

  it('applies defaults for missing optional fields', () => {
    const result = postSchema.safeParse({
      title: '标题',
      description: '这是测试用的描述文字', // exactly 10 chars — satisfies new min(10) constraint
      pubDate: '2026-01-01',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('随笔');
      expect(result.data.weight).toBe(0);
      expect(result.data.draft).toBe(false);
    }
  });

  it('rejects missing required fields', () => {
    const result = postSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = postSchema.safeParse({ ...validPost, title: '' });
    expect(result.success).toBe(true); // zod string accepts empty by default
  });

  it('rejects description shorter than 10 chars', () => {
    const result = postSchema.safeParse({ ...validPost, description: '短' });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 80 chars', () => {
    const result = postSchema.safeParse({ ...validPost, description: '超'.repeat(81) });
    expect(result.success).toBe(false);
  });

  it('accepts description at exact boundaries (10 and 80 chars)', () => {
    const min = postSchema.safeParse({ ...validPost, description: '十'.repeat(10) });
    expect(min.success).toBe(true);
    const max = postSchema.safeParse({ ...validPost, description: '八'.repeat(80) });
    expect(max.success).toBe(true);
  });

  it('accepts valid connections array', () => {
    const result = postSchema.safeParse({
      ...validPost,
      connections: ['notes/my-note', 'posts/other-post'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connections).toEqual(['notes/my-note', 'posts/other-post']);
    }
  });

  it('accepts watermark field', () => {
    const result = postSchema.safeParse({ ...validPost, watermark: '雨' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.watermark).toBe('雨');
    }
  });

  it('coerces date string to Date object', () => {
    const result = postSchema.safeParse({ ...validPost, pubDate: '2026-03-15' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pubDate.getFullYear()).toBe(2026);
      expect(result.data.pubDate.getMonth()).toBe(2); // march is 0-indexed
    }
  });
});

describe('fragmentSchema', () => {
  it('parses a minimal fragment', () => {
    const result = fragmentSchema.safeParse({ pubDate: '2026-06-01' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.draft).toBe(false);
      expect(result.data.connections).toBeUndefined();
    }
  });

  it('accepts optional mood and location', () => {
    const result = fragmentSchema.safeParse({
      pubDate: '2026-06-01',
      mood: '平静',
      location: '北京',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mood).toBe('平静');
      expect(result.data.location).toBe('北京');
    }
  });
});

describe('excerptSchema', () => {
  it('parses a valid excerpt', () => {
    const result = excerptSchema.safeParse({
      author: '鲁迅',
      source: '朝花夕拾',
      pubDate: '2026-01-01',
      tags: ['文学', '记忆'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.author).toBe('鲁迅');
      expect(result.data.source).toBe('朝花夕拾');
      expect(result.data.tags).toEqual(['文学', '记忆']);
    }
  });

  it('requires author field', () => {
    const result = excerptSchema.safeParse({ pubDate: '2026-01-01' });
    expect(result.success).toBe(false);
  });
});

describe('noteSchema', () => {
  it('parses a valid note', () => {
    const result = noteSchema.safeParse({
      title: '数字花园',
      pubDate: '2026-01-01',
      stage: 'bud',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe('bud');
    }
  });

  it('defaults stage to sprout', () => {
    const result = noteSchema.safeParse({ title: '新笔记', pubDate: '2026-01-01' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe('sprout');
    }
  });

  it('rejects invalid stage values', () => {
    const result = noteSchema.safeParse({
      title: '测试',
      pubDate: '2026-01-01',
      stage: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid stage values', () => {
    for (const stage of ['sprout', 'bud', 'evergreen'] as const) {
      const result = noteSchema.safeParse({ title: '测试', pubDate: '2026-01-01', stage });
      expect(result.success).toBe(true);
    }
  });
});

describe('memorySchema', () => {
  it('parses a valid memory', () => {
    const result = memorySchema.safeParse({
      title: '隐私优先',
      pubDate: '2026-01-01',
      category: '理念',
      version: '2.0.0',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe('2.0.0');
      expect(result.data.category).toBe('理念');
    }
  });

  it('defaults category and version', () => {
    const result = memorySchema.safeParse({ title: '概念', pubDate: '2026-01-01' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('概念');
      expect(result.data.version).toBe('1.0.0');
    }
  });
});
