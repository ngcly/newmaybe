import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connUrl, connTitle, COLL_LABEL } from '../connections';
import type { ResolvedConnection } from '../connections';

// Build a minimal mock that satisfies the ResolvedConnection discriminated union
function mockConn(collection: string, id: string, data: Record<string, unknown> = {}) {
  return { collection, id, data } as unknown as ResolvedConnection;
}

describe('COLL_LABEL', () => {
  it('has labels for all 5 collections', () => {
    expect(COLL_LABEL.posts).toBe('文字');
    expect(COLL_LABEL.notes).toBe('笔记');
    expect(COLL_LABEL.memories).toBe('概念');
    expect(COLL_LABEL.fragments).toBe('念头');
    expect(COLL_LABEL.excerpts).toBe('拾遗');
  });
});

describe('connUrl', () => {
  it('returns /writing/:id for posts', () => {
    const conn = mockConn('posts', 'my-post');
    expect(connUrl(conn)).toBe('/writing/my-post');
  });

  it('returns /notes/:id for notes', () => {
    const conn = mockConn('notes', 'my-note');
    expect(connUrl(conn)).toBe('/notes/my-note');
  });

  it('returns /memory/:id for memories', () => {
    const conn = mockConn('memories', 'my-memory');
    expect(connUrl(conn)).toBe('/memory/my-memory');
  });

  it('returns /fragments#:id for fragments', () => {
    const conn = mockConn('fragments', 'my-fragment');
    expect(connUrl(conn)).toBe('/fragments#my-fragment');
  });

  it('returns /excerpts#:id for excerpts', () => {
    const conn = mockConn('excerpts', 'my-excerpt');
    expect(connUrl(conn)).toBe('/excerpts#my-excerpt');
  });
});

describe('connTitle', () => {
  it('returns data.title for posts', () => {
    const conn = mockConn('posts', 'p1', { title: '我的文章' });
    expect(connTitle(conn)).toBe('我的文章');
  });

  it('returns data.title for notes', () => {
    const conn = mockConn('notes', 'n1', { title: '学习笔记' });
    expect(connTitle(conn)).toBe('学习笔记');
  });

  it('returns data.title for memories', () => {
    const conn = mockConn('memories', 'm1', { title: '核心概念' });
    expect(connTitle(conn)).toBe('核心概念');
  });

  it('returns formatted date title for fragments', () => {
    const conn = mockConn('fragments', 'f1', {
      pubDate: new Date('2026-06-15'),
    });
    const title = connTitle(conn);
    expect(title).toContain('念头');
    expect(title).toContain('2026');
  });

  it('returns author + source for excerpts with source', () => {
    const conn = mockConn('excerpts', 'e1', {
      author: '鲁迅',
      source: '朝花夕拾',
    });
    const title = connTitle(conn);
    expect(title).toContain('鲁迅');
    expect(title).toContain('朝花夕拾');
  });

  it('returns author only for excerpts without source', () => {
    const conn = mockConn('excerpts', 'e1', {
      author: '佚名',
    });
    const title = connTitle(conn);
    expect(title).toBe('佚名');
  });
});
