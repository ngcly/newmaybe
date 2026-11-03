import { articlePage } from './server/article-page';
import { featuredPage } from './server/featured-page';
import { mapArticle, mapComment, type RawArticleRow, type RawCommentRow } from './server/rows';
import { readFeed } from './server/feed';
import { readInput, commentInput, InputError, sourceKey } from './server/input';
import { authRoute } from './server/auth';
import { manuscriptRoute } from './server/manuscripts';
import { protectWrite } from './server/http';
import type { Comment } from './types';

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
  AUTH_SECRET?: string;
  CLUB_ADMIN_EMAILS?: string;
  GMAIL_SENDER?: string;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

function jsonResponse(data: unknown, status = 200, _request?: Request): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

type WriteAction = 'comment' | 'like';
const WRITE_LIMITS: Record<WriteAction, number> = {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/featured' || url.pathname.startsWith('/featured/')) {
      return featuredPage(request, env.ASSETS, undefined, env.DB);
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { Allow: 'GET, HEAD, POST, PUT, DELETE' },
      });
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/articles' || url.pathname.startsWith('/articles/'))
    ) {
      return articlePage(request, env);
    }

    if (['/me', '/admin'].includes(url.pathname)) {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
      const shell = await env.ASSETS?.fetch(new Request(new URL('/', url)));
      if (!shell?.ok) return new Response('暂时无法打开写作空间', { status: 503 });
      const headers = new Headers(shell.headers);
      headers.set('X-Robots-Tag', 'noindex');
      headers.set('Cache-Control', 'no-store');
      return new Response(request.method === 'HEAD' ? null : shell.body, { headers });
    }
    // Other documents and static files use the asset binding.
    if (!url.pathname.startsWith('/api/')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response('Not Found', { status: 404 });
    }

    try {
      protectWrite(request);
      if (url.pathname.startsWith('/api/auth/')) return await authRoute(request, env);
      if (
        url.pathname === '/api/manuscripts' ||
        url.pathname.startsWith('/api/manuscripts/') ||
        url.pathname.startsWith('/api/admin/')
      )
        return await manuscriptRoute(request, env);
      // 1. GET /api/articles - List articles with optional filter, topic, search
      if (request.method === 'GET' && url.pathname === '/api/articles') {
        return jsonResponse(await readFeed(url, env.DB), 200, request);
      }

      // 2. GET /api/articles/:id - Get single article & its comments
      const articleDetailMatch = url.pathname.match(/^\/api\/articles\/([^/]+)$/);
      if (request.method === 'GET' && articleDetailMatch) {
        const id = articleDetailMatch[1];
        const row = await env.DB.prepare('SELECT * FROM published_articles WHERE id = ?')
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

      // 4. POST /api/articles/:id/like - Like article
      const articleLikeMatch = url.pathname.match(/^\/api\/articles\/([^/]+)\/like$/);
      if (request.method === 'POST' && articleLikeMatch) {
        const id = articleLikeMatch[1];
        const limited = await enforceWriteLimit(request, env.DB, 'like');
        if (limited) return limited;
        const exists = await env.DB.prepare('SELECT id FROM published_articles WHERE id = ?')
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
        const article = await env.DB.prepare('SELECT id FROM published_articles WHERE id = ?')
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
        const exists = await env.DB.prepare(
          'SELECT id FROM comments WHERE id = ? AND article_id IN (SELECT id FROM published_articles)',
        )
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
