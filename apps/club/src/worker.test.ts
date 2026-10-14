import { afterEach, beforeEach, expect, test } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

function applyMigrations() {
  const directory = new URL('../migrations/', import.meta.url);
  if (!existsSync(directory)) return;
  for (const file of readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(new URL(file, directory), 'utf8'));
  }
}

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  applyMigrations();
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

test('upgrades an existing comments table without losing data and accepts replies', async () => {
  await request('articles');
  const original = sqlite.prepare('SELECT * FROM comments LIMIT 1').get()!;
  sqlite.exec(
    'ALTER TABLE comments DROP COLUMN reply_to_id; ALTER TABLE comments DROP COLUMN reply_to_author;',
  );
  sqlite.exec(
    readFileSync(new URL('../migrations/0001_comment_replies.sql', import.meta.url), 'utf8'),
  );
  const response = await request(`articles/${original.article_id}/comments`, {
    author: '新文友',
    content: '升级后的答跋',
    replyToId: original.id,
    replyToAuthor: original.author,
  });
  expect(response.status).toBe(201);
  const detail = (await (await request(`articles/${original.article_id}`)).json()) as {
    comments: { id: string; content: string; replyToId?: string }[];
  };
  expect(detail.comments).toContainEqual(
    expect.objectContaining({ id: original.id, content: original.content }),
  );
  expect(detail.comments).toContainEqual(
    expect.objectContaining({ content: '升级后的答跋', replyToId: original.id }),
  );
  expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
});

test('does not recreate sample comments after the server comment list is cleared', async () => {
  await request('articles');
  sqlite.exec('DELETE FROM comments; UPDATE articles SET comments_count = 0;');
  const detail = (await (await request('articles/club-1')).json()) as { comments: unknown[] };
  expect(detail.comments).toEqual([]);
});

test('validates public write payloads and derives the topic name on the server', async () => {
  expect(
    (await request('articles', { title: 42, content: '正文', topicId: 'deep-night' })).status,
  ).toBe(400);
  expect(
    (await request('articles', { title: '标题', content: '正文', topicId: 'unknown' })).status,
  ).toBe(400);
  expect(
    (
      await request('articles', {
        title: '标题',
        content: '正文',
        topicId: 'deep-night',
        ignored: 'x'.repeat(250_000),
      })
    ).status,
  ).toBe(413);
  const response = await request('articles', {
    title: '标题',
    content: '正文',
    topicId: 'deep-night',
    topicName: '伪造分类',
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ article: { topicName: '深夜念头' } });
});

test('rejects missing and foreign reply targets and uses the stored reply author', async () => {
  await request('articles');
  expect(
    (await request('articles/club-1/comments', { content: '回复', replyToId: 'missing' })).status,
  ).toBe(400);
  const parent = sqlite.prepare('SELECT id, author, article_id FROM comments LIMIT 1').get()!;
  const otherId = parent.article_id === 'club-1' ? 'club-2' : 'club-1';
  expect(
    (await request(`articles/${otherId}/comments`, { content: '回复', replyToId: parent.id }))
      .status,
  ).toBe(400);
  const response = await request(`articles/${parent.article_id}/comments`, {
    content: '回复',
    replyToId: parent.id,
    replyToAuthor: '伪造署名',
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ comment: { replyToAuthor: parent.author } });
});

test('likes are idempotent for a source and missing targets return 404', async () => {
  const first = await request('articles/club-1/like', {});
  const again = await request('articles/club-1/like', {});
  expect(await again.json()).toEqual(await first.json());
  expect((await request('articles/missing/like', {})).status).toBe(404);
  expect((await request('comments/missing/like', {})).status).toBe(404);
});

test('feed returns bounded summaries, stable pages and global topic counts', async () => {
  const first = (await (await request('articles?limit=2')).json()) as {
    articles: { id: string; content?: string }[];
    nextOffset: number;
    stats: { total: number };
  };
  expect(first.articles).toHaveLength(2);
  expect(first.articles.every((article) => !('content' in article))).toBe(true);
  expect(first.nextOffset).toBe(2);
  expect(first.stats.total).toBeGreaterThan(2);
  const second = (await (
    await request(`articles?limit=2&offset=${first.nextOffset}`)
  ).json()) as typeof first;
  expect(new Set([...first.articles, ...second.articles].map((article) => article.id)).size).toBe(
    4,
  );
  const filtered = (await (await request('articles?q=不存在的篇章')).json()) as typeof first;
  expect(filtered.articles).toEqual([]);
  expect(filtered.nextOffset).toBeNull();
  expect(filtered.stats.total).toBe(first.stats.total);
  expect(await (await request('articles?q=%25')).json()).toMatchObject({ articles: [] });
  const detail = (await (await request(`articles/${first.articles[0].id}`)).json()) as {
    article: { content: string };
  };
  expect(detail.article.content.length).toBeGreaterThan(0);
});

test('nested replies stay under the root and name the actual target author', async () => {
  const root = (await (
    await request('articles/club-1/comments', { content: '根评', author: '甲' })
  ).json()) as { comment: { id: string } };
  const reply = (await (
    await request('articles/club-1/comments', {
      content: '答评',
      author: '乙',
      replyToId: root.comment.id,
    })
  ).json()) as typeof root;
  const nested = await request('articles/club-1/comments', {
    content: '再答',
    replyToId: reply.comment.id,
    replyToAuthor: '假署名',
  });
  expect(await nested.json()).toMatchObject({
    comment: { replyToId: root.comment.id, replyToAuthor: '乙' },
  });
});

test('repeated concurrent comment likes increment the stored count once', async () => {
  const created = (await (
    await request('articles/club-1/comments', { content: '共鸣测试' })
  ).json()) as { comment: { id: string } };
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => request(`comments/${created.comment.id}/like`, {})),
  );
  expect(responses.every((response) => response.status === 200)).toBe(true);
  expect(
    sqlite.prepare('SELECT likes FROM comments WHERE id = ?').get(created.comment.id)?.likes,
  ).toBe(1);
});

const htmlAssets = {
  fetch: async () =>
    new Response(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }),
};

test('article URLs return article metadata and escaped readable content before JavaScript', async () => {
  await request('articles');
  sqlite
    .prepare('UPDATE articles SET title = ?, content = ? WHERE id = ?')
    .run('标题 <测试> "引号"', '第一段\n<script>alert(1)</script>\n正文 & 留白', 'club-1');
  const response = await worker.fetch(new Request('https://club.newmaybe.com/articles/club-1'), {
    DB: db,
    ASSETS: htmlAssets,
  });
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('<title>标题 &lt;测试&gt; &quot;引号&quot; · 文友雅集</title>');
  expect(html).toContain('href="https://club.newmaybe.com/articles/club-1"');
  expect(html).toContain('property="og:type" content="article"');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).toContain('正文 &amp; 留白');
  expect(html).not.toContain('<script>alert(1)</script>');
  const head = await worker.fetch(
    new Request('https://club.newmaybe.com/articles/club-1', { method: 'HEAD' }),
    { DB: db, ASSETS: htmlAssets },
  );
  expect(head.status).toBe(200);
  expect(await head.text()).toBe('');
});

test.each(['/articles/missing', '/articles/%E0%A4%A', '/articles', '/articles/a/b'])(
  'invalid article URL %s returns a real noindex 404',
  async (path) => {
    const response = await worker.fetch(new Request(`https://club.newmaybe.com${path}`), {
      DB: db,
      ASSETS: htmlAssets,
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(await response.text()).toContain('篇章不存在');
  },
);

test('article trailing slash redirects to one canonical path', async () => {
  const response = await worker.fetch(
    new Request('https://club.newmaybe.com/articles/club-1/?ref=share'),
    { DB: db, ASSETS: htmlAssets },
  );
  expect(response.status).toBe(308);
  expect(response.headers.get('Location')).toBe(
    'https://club.newmaybe.com/articles/club-1?ref=share',
  );
});

test('article database failures return 503 without leaking internal errors', async () => {
  await request('articles');
  const brokenDb: D1Database = {
    ...db,
    prepare: (sql) => {
      if (sql === 'SELECT * FROM articles WHERE id = ?') throw new Error('private database detail');
      return db.prepare(sql);
    },
  };
  const response = await worker.fetch(new Request('https://club.newmaybe.com/articles/club-1'), {
    DB: brokenDb,
    ASSETS: htmlAssets,
  });
  expect(response.status).toBe(503);
  expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  const html = await response.text();
  expect(html).toContain('篇章暂时无法读取');
  expect(html).not.toContain('private database detail');
});
