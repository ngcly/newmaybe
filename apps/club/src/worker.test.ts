import { afterEach, beforeEach, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { type D1Database, type D1PreparedStatement, type D1Result } from './worker';

type SqlValue = string | number | null;

class PreparedStatement implements D1PreparedStatement {
  private values: SqlValue[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values as SqlValue[];
    return this;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values);
    return (colName ? row?.[colName] : row) as T | null;
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    this.db.prepare(this.sql).run(...this.values);
    return { results: [], success: true, meta: {} };
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    return {
      results: this.db.prepare(this.sql).all(...this.values) as T[],
      success: true,
      meta: {},
    };
  }
}

let sqlite: DatabaseSync;
let db: D1Database;

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  db = {
    prepare: (sql) => new PreparedStatement(sqlite, sql),
    batch: async <T = unknown>(statements: D1PreparedStatement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results: D1Result<T>[] = [];
        for (const statement of statements) results.push(await statement.run<T>());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    exec: async (sql) => {
      sqlite.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
});

afterEach(() => sqlite.close());

async function request(path: string, body?: object): Promise<Response> {
  return worker.fetch(
    new Request(`https://club.newmaybe.com/api/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
    { DB: db },
  );
}

test('rejects content beyond its limit without publishing a partial article or comment', async () => {
  const draft = { title: '长文', topicId: 'deep-night', content: '文'.repeat(50_001) };
  const rejectedArticle = await request('articles', draft);
  expect(rejectedArticle.status).toBe(400);
  expect((await rejectedArticle.json()) as { error: string }).toMatchObject({
    error: expect.stringContaining('50000'),
  });
  const articles = (await (await request('articles')).json()) as { articles: { title: string }[] };
  expect(articles.articles.some((article) => article.title === draft.title)).toBe(false);

  const rejectedComment = await request('articles/club-1/comments', {
    content: '评'.repeat(1_001),
  });
  expect(rejectedComment.status).toBe(400);
  const detail = (await (await request('articles/club-1')).json()) as {
    comments: { content: string }[];
  };
  expect(detail.comments.some((comment) => comment.content.length === 1_000)).toBe(false);
});

test('accepts the exact limits and gives new series chapters the next number', async () => {
  const articleResponse = await request('articles', {
    title: '林下夜语新篇',
    topicId: 'deep-night',
    seriesTitle: '林下夜语',
    summary: '客户端已有摘要...',
    content: '文'.repeat(50_000),
  });
  expect(articleResponse.status).toBe(201);
  const { article } = (await articleResponse.json()) as {
    article: {
      content: string;
      summary: string;
      wordCount: number;
      seriesOrder: number;
      id: string;
    };
  };
  expect(article.content).toHaveLength(50_000);
  expect(article.wordCount).toBe(50_000);
  expect(article.summary).toBe(`${'文'.repeat(80)}...`);
  expect(article.seriesOrder).toBe(3);

  const commentResponse = await request(`articles/${article.id}/comments`, {
    content: '评'.repeat(1_000),
  });
  expect(commentResponse.status).toBe(201);
  const { comment } = (await commentResponse.json()) as { comment: { content: string } };
  expect(comment.content).toHaveLength(1_000);
});
