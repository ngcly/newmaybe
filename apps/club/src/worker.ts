import { articlePage } from './server/article-page';
import { mapArticle, mapComment, type RawArticleRow, type RawCommentRow } from './server/rows';
import { readFeed } from './server/feed';
import { readInput, articleInput, commentInput, InputError, sourceKey } from './server/input';
import type { Article, Comment } from './types';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from './data/initialArticles';

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface Env {
  DB: D1Database;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  const headers = request ? corsHeaders(request) : { 'Content-Type': 'application/json' };
  return new Response(JSON.stringify(data), { status, headers });
}

type WriteAction = 'article' | 'comment' | 'like';
const WRITE_LIMITS: Record<WriteAction, number> = {
  article: 3,
  comment: 20,
  like: 60,
};

async function enforceWriteLimit(
  request: Request,
  db: D1Database,
  action: WriteAction,
): Promise<Response | null> {
  const source = await sourceKey(request);
  const periodStart = Math.floor(Date.now() / 3_600_000) * 3_600;
  const key = `${action}:${source}:${periodStart}`;
  await db
    .prepare('DELETE FROM write_limits WHERE period_start < ?')
    .bind(periodStart - 86_400)
    .run();
  const result = await db
    .prepare(
      `INSERT INTO write_limits (key, period_start, hits) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET hits = hits + 1
       WHERE hits < ?
     RETURNING hits`,
    )
    .bind(key, periodStart, WRITE_LIMITS[action])
    .first<{ hits: number }>();

  if (result) return null;
  return jsonResponse({ error: '操作过于频繁，请稍后再试' }, 429, request);
}

// Auto seed initial data if DB is empty
async function ensureSeedData(db: D1Database): Promise<void> {
  try {
    const checkArticles = await db
      .prepare('SELECT count(*) as count FROM articles')
      .first<{ count: number }>();
    // Seed only a new article database. An empty comment list on an existing
    // database may be intentional and must not resurrect sample comments.
    if (checkArticles && checkArticles.count > 0) return;

    const articleStatements: D1PreparedStatement[] = [];
    for (const a of INITIAL_ARTICLES) {
      articleStatements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO articles (
              id, title, summary, content, author, author_seal,
              topic_id, topic_name, pub_date, reading_time, word_count,
              likes, comments_count, series_title, series_order, golden_quote, featured
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            a.id,
            a.title,
            a.summary,
            a.content,
            a.author,
            a.authorSeal || null,
            a.topicId,
            a.topicName,
            a.pubDate,
            a.readingTime,
            a.wordCount,
            a.likes,
            a.commentsCount,
            a.seriesTitle || null,
            a.seriesOrder || null,
            a.goldenQuote || null,
            a.featured ? 1 : 0,
          ),
      );
    }

    const commentStatements: D1PreparedStatement[] = [];
    for (const [articleId, comments] of Object.entries(INITIAL_COMMENTS)) {
      for (const c of comments) {
        commentStatements.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO comments (id, article_id, author, content, likes, created_at, reply_to_id, reply_to_author)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              c.id,
              articleId,
              c.author,
              c.content,
              c.likes,
              c.createdAt,
              c.replyToId || null,
              c.replyToAuthor || null,
            ),
        );
      }
    }
    commentStatements.push(
      db.prepare(
        `UPDATE articles SET comments_count = (SELECT count(*) FROM comments WHERE comments.article_id = articles.id)
         WHERE id IN ('club-1', 'club-2', 'club-3', 'club-4', 'club-5', 'club-6')`,
      ),
    );

    const batch = [...articleStatements, ...commentStatements];
    if (batch.length > 0) {
      await db.batch(batch);
    }
  } catch (err) {
    console.error('ensureSeedData failed:', err);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/articles' || url.pathname.startsWith('/articles/'))
    ) {
      await ensureSeedData(env.DB);
      return articlePage(request, env);
    }

    // Other documents and static files use the asset binding.
    if (!url.pathname.startsWith('/api/')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response('Not Found', { status: 404 });
    }

    // Ensure database table initialized & seeded on first call
    await ensureSeedData(env.DB);

    try {
      // 1. GET /api/articles - List articles with optional filter, topic, search
      if (request.method === 'GET' && url.pathname === '/api/articles') {
        return jsonResponse(await readFeed(url, env.DB), 200, request);
      }

      // 2. GET /api/articles/:id - Get single article & its comments
      const articleDetailMatch = url.pathname.match(/^\/api\/articles\/([^/]+)$/);
      if (request.method === 'GET' && articleDetailMatch) {
        const id = articleDetailMatch[1];
        const row = await env.DB.prepare('SELECT * FROM articles WHERE id = ?')
          .bind(id)
          .first<RawArticleRow>();

        if (!row) {
          return jsonResponse({ error: '篇章未找到' }, 404, request);
        }

        const { results: commentRows } = await env.DB.prepare(
          'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC',
        )
          .bind(id)
          .all<RawCommentRow>();

        return jsonResponse(
          {
            article: mapArticle(row),
            comments: commentRows.map(mapComment),
          },
          200,
          request,
        );
      }

      // 3. POST /api/articles - Create article
      if (request.method === 'POST' && url.pathname === '/api/articles') {
        const body = articleInput(await readInput(request));
        const content = body.content;
        const limited = await enforceWriteLimit(request, env.DB, 'article');
        if (limited) return limited;

        const wordCount = content.length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 130));
        const summary =
          content
            .split('\n')
            .find((l) => l.trim().length > 10)
            ?.slice(0, 80) || content.slice(0, 60);

        const newArticle: Article = {
          id: `club-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: body.title.trim().slice(0, 100),
          summary: summary.trim() + '...',
          content,
          author: body.author?.trim().slice(0, 30) || '文友',
          authorSeal:
            body.authorSeal?.trim().slice(0, 2) || body.author?.trim().slice(0, 2) || '文友',
          topicId: body.topicId,
          topicName: body.topicName || '文友雅集',
          pubDate: new Date().toISOString().split('T')[0],
          readingTime,
          wordCount,
          likes: 1,
          commentsCount: 0,
          seriesTitle: body.seriesTitle?.trim().slice(0, 50) || undefined,
          seriesOrder: undefined,
          goldenQuote: body.goldenQuote?.trim().slice(0, 200) || undefined,
          featured: false,
          isUserCreated: true,
        };

        await env.DB.prepare(
          `INSERT INTO articles (
            id, title, summary, content, author, author_seal,
            topic_id, topic_name, pub_date, reading_time, word_count,
            likes, comments_count, series_title, series_order, golden_quote, featured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            CASE WHEN ? IS NULL THEN NULL ELSE
              (SELECT COALESCE(MAX(series_order), 0) + 1 FROM articles WHERE series_title = ?)
            END, ?, ?)`,
        )
          .bind(
            newArticle.id,
            newArticle.title,
            newArticle.summary,
            newArticle.content,
            newArticle.author,
            newArticle.authorSeal || null,
            newArticle.topicId,
            newArticle.topicName,
            newArticle.pubDate,
            newArticle.readingTime,
            newArticle.wordCount,
            newArticle.likes,
            newArticle.commentsCount,
            newArticle.seriesTitle || null,
            newArticle.seriesTitle || null,
            newArticle.seriesTitle || null,
            newArticle.goldenQuote || null,
            0,
          )
          .run();

        const savedRow = await env.DB.prepare('SELECT * FROM articles WHERE id = ?')
          .bind(newArticle.id)
          .first<RawArticleRow>();
        if (!savedRow) throw new Error('Published article could not be loaded');
        return jsonResponse(
          { success: true, article: { ...mapArticle(savedRow), isUserCreated: true } },
          201,
          request,
        );
      }

      // 4. POST /api/articles/:id/like - Like article
      const articleLikeMatch = url.pathname.match(/^\/api\/articles\/([^/]+)\/like$/);
      if (request.method === 'POST' && articleLikeMatch) {
        const id = articleLikeMatch[1];
        const limited = await enforceWriteLimit(request, env.DB, 'like');
        if (limited) return limited;
        const exists = await env.DB.prepare('SELECT id FROM articles WHERE id = ?')
          .bind(id)
          .first();
        if (!exists) throw new InputError('篇章未找到', 404);
        await env.DB.prepare(
          'INSERT OR IGNORE INTO article_likes (article_id, source) VALUES (?, ?)',
        )
          .bind(id, await sourceKey(request))
          .run();
        const row = await env.DB.prepare('SELECT likes FROM articles WHERE id = ?')
          .bind(id)
          .first<{ likes: number }>();
        return jsonResponse({ success: true, likes: row?.likes ?? 0 }, 200, request);
      }

      // 5. POST /api/articles/:id/comments - Add comment
      const addCommentMatch = url.pathname.match(/^\/api\/articles\/([^/]+)\/comments$/);
      if (request.method === 'POST' && addCommentMatch) {
        const articleId = addCommentMatch[1];
        const body = commentInput(await readInput(request));
        const content = body.content;
        const article = await env.DB.prepare('SELECT id FROM articles WHERE id = ?')
          .bind(articleId)
          .first();
        if (!article) throw new InputError('篇章未找到', 404);
        let parent: RawCommentRow | null = null;
        if (body.replyToId) {
          parent = await env.DB.prepare('SELECT * FROM comments WHERE id = ? AND article_id = ?')
            .bind(body.replyToId, articleId)
            .first<RawCommentRow>();
          if (!parent) throw new InputError('回复对象不存在或不属于当前篇章');
        }
        const limited = await enforceWriteLimit(request, env.DB, 'comment');
        if (limited) return limited;

        const newComment: Comment = {
          id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          articleId,
          author: body.author?.trim().slice(0, 30) || '文友',
          content,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          likes: 0,
          replyToId: parent ? parent.reply_to_id || parent.id : undefined,
          replyToAuthor: parent?.author,
        };

        await env.DB.batch([
          env.DB.prepare(
            'INSERT INTO comments (id, article_id, author, content, likes, created_at, reply_to_id, reply_to_author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ).bind(
            newComment.id,
            newComment.articleId,
            newComment.author,
            newComment.content,
            newComment.likes,
            newComment.createdAt,
            newComment.replyToId || null,
            newComment.replyToAuthor || null,
          ),
          env.DB.prepare(
            'UPDATE articles SET comments_count = comments_count + 1 WHERE id = ?',
          ).bind(articleId),
        ]);

        return jsonResponse({ success: true, comment: newComment }, 201, request);
      }

      // 6. POST /api/comments/:id/like - Like comment
      const commentLikeMatch = url.pathname.match(/^\/api\/comments\/([^/]+)\/like$/);
      if (request.method === 'POST' && commentLikeMatch) {
        const commentId = commentLikeMatch[1];
        const limited = await enforceWriteLimit(request, env.DB, 'like');
        if (limited) return limited;
        const exists = await env.DB.prepare('SELECT id FROM comments WHERE id = ?')
          .bind(commentId)
          .first();
        if (!exists) throw new InputError('评注未找到', 404);
        await env.DB.prepare(
          'INSERT OR IGNORE INTO comment_likes (comment_id, source) VALUES (?, ?)',
        )
          .bind(commentId, await sourceKey(request))
          .run();
        const row = await env.DB.prepare('SELECT likes FROM comments WHERE id = ?')
          .bind(commentId)
          .first<{ likes: number }>();
        return jsonResponse({ success: true, likes: row!.likes }, 200, request);
      }

      // 7. POST /api/init-seed - Manual trigger to seed or recheck
      if (request.method === 'POST' && url.pathname === '/api/init-seed') {
        await ensureSeedData(env.DB);
        return jsonResponse({ success: true, message: '种子文集检查就绪' }, 200, request);
      }

      return jsonResponse({ error: 'Endpoint Not Found' }, 404, request);
    } catch (err) {
      if (err instanceof InputError)
        return jsonResponse({ error: err.message }, err.status, request);
      console.error('API Error:', err);
      return jsonResponse(
        {
          error: '服务内部异常，请稍后重试',
        },
        500,
        request,
      );
    }
  },
};
